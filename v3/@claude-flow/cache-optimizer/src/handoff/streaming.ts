/**
 * @claude-flow/cache-optimizer - Streaming Handler
 *
 * Server-Sent Events (SSE) streaming support for handoff responses.
 * Enables real-time token streaming from LLM providers.
 */

import { EventEmitter } from 'events';
import type { HandoffProviderConfig, HandoffRequest, HandoffResponse } from '../types.js';

export interface StreamChunk {
  id: string;
  type: 'content' | 'done' | 'error';
  content?: string;
  finishReason?: string;
  error?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
  };
}

export interface StreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (response: HandoffResponse) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

/**
 * StreamingHandler - Manages streaming responses from LLM providers
 */
export class StreamingHandler extends EventEmitter {
  private activeStreams: Map<string, AbortController> = new Map();

  /**
   * Stream response from Ollama
   */
  async streamFromOllama(
    request: HandoffRequest,
    config: HandoffProviderConfig,
    options: StreamOptions = {}
  ): Promise<HandoffResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    this.activeStreams.set(request.id, controller);

    // Combine with external signal
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    let fullContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const messages = this.buildMessages(request);

      const response = await fetch(`${config.endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          options: {
            temperature: request.options.temperature ?? 0.7,
            num_predict: request.options.maxTokens ?? 2048,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as {
              message?: { content: string };
              done?: boolean;
              prompt_eval_count?: number;
              eval_count?: number;
            };

            if (data.message?.content) {
              fullContent += data.message.content;

              const chunk: StreamChunk = {
                id: request.id,
                type: 'content',
                content: data.message.content,
              };

              options.onChunk?.(chunk);
              this.emit('chunk', chunk);
            }

            if (data.done) {
              promptTokens = data.prompt_eval_count || 0;
              completionTokens = data.eval_count || 0;

              const doneChunk: StreamChunk = {
                id: request.id,
                type: 'done',
                finishReason: 'stop',
                tokens: { prompt: promptTokens, completion: completionTokens },
              };

              options.onChunk?.(doneChunk);
              this.emit('chunk', doneChunk);
            }
          } catch {
            // Invalid JSON line, skip
          }
        }
      }

      const result: HandoffResponse = {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: fullContent,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: promptTokens + completionTokens,
        },
        durationMs: Date.now() - startTime,
        status: 'completed',
        injectedInstructions: request.callbackInstructions,
        completedAt: Date.now(),
      };

      options.onComplete?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);

      return {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: fullContent,
        tokens: { prompt: 0, completion: 0, total: 0 },
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: err.message,
        completedAt: Date.now(),
      };
    } finally {
      this.activeStreams.delete(request.id);
    }
  }

  /**
   * Stream response from Anthropic
   */
  async streamFromAnthropic(
    request: HandoffRequest,
    config: HandoffProviderConfig,
    options: StreamOptions = {}
  ): Promise<HandoffResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    this.activeStreams.set(request.id, controller);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: '',
        tokens: { prompt: 0, completion: 0, total: 0 },
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: 'No Anthropic API key',
        completedAt: Date.now(),
      };
    }

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const messages = this.buildMessages(request).filter(m => m.role !== 'system');

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: request.options.maxTokens ?? 2048,
          system: request.systemPrompt,
          messages: messages.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Anthropic error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.slice(6); // Remove "data: "
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr) as {
              type: string;
              delta?: { text?: string };
              message?: { usage?: { input_tokens: number; output_tokens: number } };
            };

            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullContent += data.delta.text;

              const chunk: StreamChunk = {
                id: request.id,
                type: 'content',
                content: data.delta.text,
              };

              options.onChunk?.(chunk);
              this.emit('chunk', chunk);
            }

            if (data.type === 'message_delta') {
              const usage = data.message?.usage;
              if (usage) {
                inputTokens = usage.input_tokens;
                outputTokens = usage.output_tokens;
              }
            }

            if (data.type === 'message_stop') {
              const doneChunk: StreamChunk = {
                id: request.id,
                type: 'done',
                finishReason: 'stop',
                tokens: { prompt: inputTokens, completion: outputTokens },
              };

              options.onChunk?.(doneChunk);
              this.emit('chunk', doneChunk);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      const result: HandoffResponse = {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: fullContent,
        tokens: {
          prompt: inputTokens,
          completion: outputTokens,
          total: inputTokens + outputTokens,
        },
        durationMs: Date.now() - startTime,
        status: 'completed',
        injectedInstructions: request.callbackInstructions,
        completedAt: Date.now(),
      };

      options.onComplete?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);

      return {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: fullContent,
        tokens: { prompt: 0, completion: 0, total: 0 },
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: err.message,
        completedAt: Date.now(),
      };
    } finally {
      this.activeStreams.delete(request.id);
    }
  }

  /**
   * Stream response from OpenAI
   */
  async streamFromOpenAI(
    request: HandoffRequest,
    config: HandoffProviderConfig,
    options: StreamOptions = {}
  ): Promise<HandoffResponse> {
    const startTime = Date.now();
    const controller = new AbortController();
    this.activeStreams.set(request.id, controller);

    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: '',
        tokens: { prompt: 0, completion: 0, total: 0 },
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: 'No OpenAI API key',
        completedAt: Date.now(),
      };
    }

    let fullContent = '';

    try {
      const messages = this.buildMessages(request);

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: request.options.maxTokens ?? 2048,
          temperature: request.options.temperature ?? 0.7,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') {
            const doneChunk: StreamChunk = {
              id: request.id,
              type: 'done',
              finishReason: 'stop',
            };
            options.onChunk?.(doneChunk);
            this.emit('chunk', doneChunk);
            continue;
          }

          try {
            const data = JSON.parse(jsonStr) as {
              choices: Array<{
                delta: { content?: string };
                finish_reason?: string;
              }>;
            };

            const choice = data.choices[0];
            if (choice?.delta?.content) {
              fullContent += choice.delta.content;

              const chunk: StreamChunk = {
                id: request.id,
                type: 'content',
                content: choice.delta.content,
              };

              options.onChunk?.(chunk);
              this.emit('chunk', chunk);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      const result: HandoffResponse = {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: fullContent,
        tokens: { prompt: 0, completion: 0, total: 0 }, // OpenAI doesn't provide in stream
        durationMs: Date.now() - startTime,
        status: 'completed',
        injectedInstructions: request.callbackInstructions,
        completedAt: Date.now(),
      };

      options.onComplete?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);

      return {
        requestId: request.id,
        provider: config.name,
        model: config.model,
        content: fullContent,
        tokens: { prompt: 0, completion: 0, total: 0 },
        durationMs: Date.now() - startTime,
        status: 'failed',
        error: err.message,
        completedAt: Date.now(),
      };
    } finally {
      this.activeStreams.delete(request.id);
    }
  }

  /**
   * Build messages array
   */
  private buildMessages(request: HandoffRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    if (request.context) {
      messages.push(...request.context);
    }

    messages.push({ role: 'user', content: request.prompt });

    return messages;
  }

  /**
   * Cancel a streaming request
   */
  cancel(requestId: string): boolean {
    const controller = this.activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all streams
   */
  cancelAll(): void {
    for (const [id, controller] of this.activeStreams) {
      controller.abort();
    }
    this.activeStreams.clear();
  }

  /**
   * Get active stream count
   */
  getActiveCount(): number {
    return this.activeStreams.size;
  }
}

/**
 * Create streaming handler
 */
export function createStreamingHandler(): StreamingHandler {
  return new StreamingHandler();
}

export const defaultStreamingHandler = new StreamingHandler();

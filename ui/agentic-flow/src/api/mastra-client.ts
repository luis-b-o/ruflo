/**
 * Mastra AI Integration Client
 * Provides interfaces for managing AI agents and workflows
 */

// Simple browser-compatible EventEmitter
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events.has(event)) return false;
    this.events.get(event)!.forEach(listener => listener(...args));
    return true;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) return this;
    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
    return this;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

// Mock Agent type for UI
export interface Agent {
  name: string;
  description: string;
  model: {
    provider: string;
    name: string;
  };
  instructions?: string;
  tools?: any[];
}

// Types and interfaces
export interface MastraConfig {
  apiKey?: string;
  baseUrl?: string;
  providers?: Record<string, any>;
}

export interface AgentConfig {
  name: string;
  type: 'researcher' | 'architect' | 'coder' | 'tester' | 'reviewer' | 'monitor';
  model?: {
    provider: string;
    name: string;
  };
  instructions?: string;
  capabilities: AgentCapability[];
}

export interface AgentCapability {
  name: string;
  description: string;
  type: 'web-search' | 'code-analysis' | 'code-generation' | 'testing' | 'monitoring';
}

export interface WorkflowConfig {
  name: string;
  description: string;
  agents: string[];
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  agent: string;
  action: string;
  inputs: Record<string, any>;
  outputs?: string[];
  nextSteps?: string[];
}

export interface ExecutionResult {
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Record<string, any>;
  errors?: string[];
  startTime: Date;
  endTime?: Date;
}

// Mock Mastra AI client
export class MastraClient extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private workflows: Map<string, WorkflowConfig> = new Map();
  private executions: Map<string, ExecutionResult> = new Map();
  private agentMetadata: Map<string, AgentMetadata> = new Map();

  constructor(private config: MastraConfig = {}) {
    super();
    this.initializeDefaultAgents();
  }

  // Initialize with default Mastra agents
  private initializeDefaultAgents() {
    const defaultAgents = [
      {
        name: 'researcher',
        type: 'researcher' as const,
        description: 'Research agent for information gathering',
        model: { provider: 'openai', name: 'gpt-4-turbo' },
        capabilities: [
          { name: 'web-search', description: 'Search the web', type: 'web-search' as const },
          { name: 'analysis', description: 'Analyze data', type: 'code-analysis' as const }
        ]
      },
      {
        name: 'architect',
        type: 'architect' as const,
        description: 'Architecture agent for system design',
        model: { provider: 'anthropic', name: 'claude-3-opus-20240229' },
        capabilities: [
          { name: 'design', description: 'Design systems', type: 'code-analysis' as const }
        ]
      },
      {
        name: 'coder',
        type: 'coder' as const,
        description: 'Coding agent for implementation',
        model: { provider: 'openai', name: 'gpt-4-turbo' },
        capabilities: [
          { name: 'code-gen', description: 'Generate code', type: 'code-generation' as const }
        ]
      },
      {
        name: 'tester',
        type: 'tester' as const,
        description: 'Testing agent for quality assurance',
        model: { provider: 'openai', name: 'gpt-4' },
        capabilities: [
          { name: 'testing', description: 'Test code', type: 'testing' as const }
        ]
      },
      {
        name: 'reviewer',
        type: 'reviewer' as const,
        description: 'Review agent for code review',
        model: { provider: 'anthropic', name: 'claude-3-sonnet-20240229' },
        capabilities: [
          { name: 'review', description: 'Review code', type: 'code-analysis' as const }
        ]
      },
      {
        name: 'monitor',
        type: 'monitor' as const,
        description: 'Monitoring agent for system observation',
        model: { provider: 'openai', name: 'gpt-3.5-turbo' },
        capabilities: [
          { name: 'monitoring', description: 'Monitor systems', type: 'monitoring' as const }
        ]
      }
    ];

    defaultAgents.forEach(config => {
      this.createAgent(config);
    });
  }

  // Get all available agents
  async getAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  // Get agent by name
  async getAgent(name: string): Promise<Agent | null> {
    return this.agents.get(name) || null;
  }

  // Create a new agent
  async createAgent(config: AgentConfig): Promise<string> {
    // Default model based on agent type
    const defaultModels = {
      researcher: { provider: 'openai', name: 'gpt-4-turbo' },
      architect: { provider: 'anthropic', name: 'claude-3-opus-20240229' },
      coder: { provider: 'openai', name: 'gpt-4-turbo' },
      tester: { provider: 'openai', name: 'gpt-4' },
      reviewer: { provider: 'anthropic', name: 'claude-3-sonnet-20240229' },
      monitor: { provider: 'openai', name: 'gpt-3.5-turbo' }
    };

    const model = config.model || defaultModels[config.type];

    const agent: Agent = {
      name: config.name.toLowerCase().replace(/\s+/g, '-'),
      description: `${config.type} agent: ${config.name}`,
      model,
      instructions: config.instructions || this.generateInstructions(config.type, config.capabilities),
      tools: [] // Tools will be assigned based on capabilities
    };
    
    // Store agent
    this.agents.set(agent.name, agent);
    
    // Store metadata
    this.agentMetadata.set(agent.name, {
      name: agent.name,
      type: config.type,
      description: agent.description || '',
      model,
      capabilities: config.capabilities.map(c => c.name)
    });
    
    return agent.name;
  }

  // Generate default instructions based on agent type
  private generateInstructions(type: string, capabilities: AgentCapability[]): string {
    const baseInstructions = {
      researcher: 'You are a research agent specialized in gathering and analyzing information.',
      architect: 'You are an architecture agent responsible for system design and planning.',
      coder: 'You are a coding agent specialized in implementation and development.',
      tester: 'You are a testing agent focused on quality assurance.',
      reviewer: 'You are a review agent responsible for code and design review.',
      monitor: 'You are a monitoring agent tasked with system observation.'
    };

    const capabilityInstructions = capabilities
      .map(cap => `- ${cap.description}`)
      .join('\n');

    return `${baseInstructions[type as keyof typeof baseInstructions]}\n\nCapabilities:\n${capabilityInstructions}`;
  }

  // Create a workflow
  async createWorkflow(config: WorkflowConfig): Promise<string> {
    const workflowId = `wf-${Date.now()}`;
    this.workflows.set(workflowId, config);
    this.emit('workflow:created', { workflowId, config });
    return workflowId;
  }

  // Execute a workflow
  async executeWorkflow(workflowId: string, inputs: Record<string, any> = {}): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = `exec-${Date.now()}`;
    const execution: ExecutionResult = {
      workflowId,
      status: 'pending',
      results: {},
      startTime: new Date()
    };

    this.executions.set(executionId, execution);
    
    // Simulate workflow execution
    setTimeout(() => {
      execution.status = 'running';
      this.emit('execution:started', { executionId, workflowId });
      
      // Simulate step execution
      workflow.steps.forEach((step, index) => {
        setTimeout(() => {
          execution.results[step.id] = {
            status: 'completed',
            output: `Result from ${step.agent} executing ${step.action}`
          };
          this.emit('step:completed', { executionId, stepId: step.id });
          
          if (index === workflow.steps.length - 1) {
            execution.status = 'completed';
            execution.endTime = new Date();
            this.emit('execution:completed', { executionId, results: execution.results });
          }
        }, (index + 1) * 1000);
      });
    }, 100);

    return executionId;
  }

  // Get execution status
  async getExecution(executionId: string): Promise<ExecutionResult | null> {
    return this.executions.get(executionId) || null;
  }

  // Get all workflows
  async getWorkflows(): Promise<WorkflowConfig[]> {
    return Array.from(this.workflows.values());
  }

  // Get agent metadata
  getAgentMetadata(agentName: string): AgentMetadata | undefined {
    return this.agentMetadata.get(agentName);
  }

  // Get all agent metadata
  getAllAgentMetadata(): AgentMetadata[] {
    return Array.from(this.agentMetadata.values());
  }
}

// Agent metadata interface
export interface AgentMetadata {
  name: string;
  type: string;
  description: string;
  model: {
    provider: string;
    name: string;
  };
  capabilities: string[];
}

// Create singleton instance
let mastraClient: MastraClient | null = null;

export function getMastraClient(config?: MastraConfig): MastraClient {
  if (!mastraClient) {
    mastraClient = new MastraClient(config);
  }
  return mastraClient;
}

// Mock Mastra agents for UI
export const mastraAgents = {
  researcher: {
    name: 'researcher',
    description: 'Research agent for information gathering',
    model: { provider: 'openai', name: 'gpt-4-turbo' }
  },
  architect: {
    name: 'architect', 
    description: 'Architecture agent for system design',
    model: { provider: 'anthropic', name: 'claude-3-opus' }
  },
  coder: {
    name: 'coder',
    description: 'Coding agent for implementation',
    model: { provider: 'openai', name: 'gpt-4-turbo' }
  },
  tester: {
    name: 'tester',
    description: 'Testing agent for quality assurance',
    model: { provider: 'openai', name: 'gpt-4' }
  },
  reviewer: {
    name: 'reviewer',
    description: 'Review agent for code review',
    model: { provider: 'anthropic', name: 'claude-3-sonnet' }
  },
  monitor: {
    name: 'monitor',
    description: 'Monitoring agent for system observation',
    model: { provider: 'openai', name: 'gpt-3.5-turbo' }
  }
};
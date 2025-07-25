import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Zap, Send, Trash2, Copy, Check, Save, Square } from 'lucide-react'

interface Message {
  id: string
  type: 'sent' | 'received'
  data: string
  timestamp: Date
}

const WebSocketTester: React.FC = () => {
  const [url, setUrl] = useState('ws://localhost:3001')
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [showRaw, setShowRaw] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [triedFallback, setTriedFallback] = useState(false)
  const [isStopped, setIsStopped] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const connect = useCallback(() => {
    // Check if stopped
    if (isStopped) {
      addMessage('❌ Connection stopped. Click Stop to reset, then try again.', 'received')
      return
    }

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Reset state for new connection attempt
    setConnectionAttempts(0)
    setTriedFallback(false)

    const attemptConnection = (wsUrl: string, isFallback = false) => {
      // Check if stopped before each attempt
      if (isStopped) {
        addMessage('❌ Connection attempt cancelled - stopped', 'received')
        return
      }

      setConnectionAttempts(prev => prev + 1)
      
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          // Check if stopped after connection opens
          if (isStopped) {
            ws.close()
            addMessage('❌ Connection opened but immediately closed - stopped', 'received')
            return
          }
          
          setConnected(true)
          setConnectionAttempts(0)
          setTriedFallback(false)
          addMessage(`✅ Connected to WebSocket server at ${wsUrl}`, 'received')
        }

        ws.onmessage = (event) => {
          // Only process messages if not stopped
          if (!isStopped) {
            addMessage(event.data, 'received')
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
        }

        ws.onclose = (event) => {
          setConnected(false)
          wsRef.current = null
          
          // Don't try to reconnect if stopped
          if (isStopped) {
            addMessage('🔌 Connection closed - stopped', 'received')
            return
          }
          
          // Only try fallback once and if connection failed immediately
          if (!triedFallback && event.code === 1006 && connectionAttempts < 2) {
            const fallbackUrl = wsUrl.includes('localhost') 
              ? wsUrl.replace('localhost', '127.0.0.1')
              : wsUrl.replace('127.0.0.1', 'localhost')
            
            if (fallbackUrl !== wsUrl) {
              setTriedFallback(true)
              addMessage(`❌ Connection failed to ${wsUrl}`, 'received')
              addMessage(`🔄 Trying fallback: ${fallbackUrl}`, 'received')
              setTimeout(() => attemptConnection(fallbackUrl, true), 1000)
              return
            }
          }
          
          // Show appropriate disconnect message
          if (event.code === 1006) {
            addMessage(`❌ Failed to connect to WebSocket server`, 'received')
          } else {
            addMessage('🔌 Disconnected from WebSocket server', 'received')
          }
          
          // Auto-reconnect logic (but not for initial connection failures)
          if (autoReconnect && event.code !== 1006 && connectionAttempts < 3 && !isStopped) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isStopped) {
                addMessage('🔄 Attempting to reconnect...', 'received')
                connect()
              }
            }, 3000)
          } else if (connectionAttempts >= 3) {
            addMessage('❌ Max connection attempts reached. Auto-reconnect disabled.', 'received')
            setAutoReconnect(false)
          }
        }
      } catch (error) {
        console.error('Failed to connect:', error)
        addMessage(`❌ Failed to connect to ${wsUrl}: ${error}`, 'received')
        
        // Try fallback only once
        if (!triedFallback && connectionAttempts < 2) {
          const fallbackUrl = wsUrl.includes('localhost') 
            ? wsUrl.replace('localhost', '127.0.0.1')
            : wsUrl.replace('127.0.0.1', 'localhost')
          
          if (fallbackUrl !== wsUrl) {
            setTriedFallback(true)
            addMessage(`🔄 Trying fallback: ${fallbackUrl}`, 'received')
            setTimeout(() => attemptConnection(fallbackUrl, true), 1000)
          }
        }
      }
    }

    addMessage(`🔌 Attempting to connect to ${url}...`, 'received')
    attemptConnection(url)
  }, [url, autoReconnect, connectionAttempts, triedFallback, isStopped])

  const disconnect = () => {
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnected(false)
    setConnectionAttempts(0)
    setTriedFallback(false)
    addMessage('🔌 Manually disconnected', 'received')
  }

  const stopAllConnections = () => {
    // Set stopped flag first to prevent new connections
    setIsStopped(true)
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Close current connection if exists
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    // Reset all states
    setConnected(false)
    setConnectionAttempts(0)
    setTriedFallback(false)
    setAutoReconnect(false)
    
    addMessage('⏹️ All connection attempts stopped. Click Stop again to reset.', 'received')
  }

  const resetConnection = () => {
    setIsStopped(false)
    setConnectionAttempts(0)
    setTriedFallback(false)
    addMessage('🔄 Connection reset. Ready to connect.', 'received')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const addMessage = (data: string, type: 'sent' | 'received') => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      data,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const sendMessage = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && messageInput) {
      wsRef.current.send(messageInput)
      addMessage(messageInput, 'sent')
      setMessageInput('')
    }
  }

  const clearMessages = () => {
    setMessages([])
  }

  const copyMessages = () => {
    const text = messages.map(m => 
      `[${m.timestamp.toISOString()}] ${m.type === 'sent' ? '→' : '←'} ${m.data}`
    ).join('\n')
    navigator.clipboard.writeText(text)
  }

  const saveSession = () => {
    const session = {
      url,
      messages,
      timestamp: new Date()
    }
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `websocket-session-${Date.now()}.json`
    a.click()
  }

  const formatMessage = (data: string) => {
    try {
      const parsed = JSON.parse(data)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return data
    }
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Connection Controls */}
      <div className="mb-4 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-3 py-2 bg-black border border-green-900 text-green-400 placeholder-green-600 focus:border-green-400 focus:outline-none font-mono text-sm"
            placeholder="ws://localhost:3001"
            disabled={connected}
          />
          {connected ? (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-700 rounded hover:bg-red-900/50 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connect}
              className="px-4 py-2 bg-green-900/30 text-green-400 border border-green-700 rounded hover:bg-green-900/50 transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Connect
            </button>
          )}
          
          {/* Stop/Reset button - always visible for emergency stop */}
          <button
            onClick={isStopped ? resetConnection : stopAllConnections}
            className={`px-4 py-2 border rounded hover:bg-opacity-50 transition-colors flex items-center gap-2 ${
              isStopped 
                ? 'bg-blue-900/30 text-blue-400 border-blue-700 hover:bg-blue-900/50' 
                : 'bg-gray-900/30 text-gray-400 border-gray-700 hover:bg-gray-800/50'
            }`}
            title={isStopped ? "Reset connection state" : "Stop all connection attempts and disable auto-reconnect"}
          >
            <Square className="w-4 h-4" />
            {isStopped ? 'Reset' : 'Stop'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-green-600">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-reconnect
            </label>
            <label className="flex items-center gap-2 text-xs text-green-600">
              <input
                type="checkbox"
                checked={showRaw}
                onChange={(e) => setShowRaw(e.target.checked)}
                className="w-3 h-3"
              />
              Show raw
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? '● Connected' : '● Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-gray-950 border-2 border-green-900 rounded overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-green-900 bg-gray-900">
          <h3 className="text-sm font-bold text-green-400">Messages ({messages.length})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyMessages}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-400 transition-colors"
              title="Copy messages"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={saveSession}
              className="px-2 py-1 text-xs text-green-600 hover:text-green-400 transition-colors"
              title="Save session"
            >
              <Save className="w-3 h-3" />
            </button>
            <button
              onClick={clearMessages}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-400 transition-colors"
              title="Clear messages"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.type === 'sent' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`max-w-[70%] ${
                message.type === 'sent' 
                  ? 'bg-blue-900/30 border-blue-700 text-blue-400' 
                  : 'bg-green-900/30 border-green-700 text-green-400'
              } border rounded p-2`}>
                <div className="text-xs opacity-70 mb-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
                <pre className={`whitespace-pre-wrap break-words ${!showRaw ? 'font-mono' : ''}`}>
                  {showRaw ? message.data : formatMessage(message.data)}
                </pre>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Send Message */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 px-3 py-2 bg-black border border-green-900 text-green-400 placeholder-green-600 focus:border-green-400 focus:outline-none font-mono text-sm"
          placeholder='{"type": "message", "data": "Hello"}'
          disabled={!connected}
        />
        <button
          onClick={sendMessage}
          disabled={!connected || !messageInput}
          className="px-4 py-2 bg-green-900/30 text-green-400 border border-green-700 rounded hover:bg-green-900/50 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>

      {/* Example Messages */}
      <div className="mt-4 p-4 bg-gray-900 rounded border border-green-900">
        <h4 className="text-xs font-bold text-green-400 mb-2">Example Messages</h4>
        <div className="space-y-2">
          <button
            onClick={() => setMessageInput('{"type": "subscribe", "channel": "swarm-updates"}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
          >
            Subscribe to swarm updates
          </button>
          <button
            onClick={() => setMessageInput('{"type": "execute", "tool": "swarm_status"}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
          >
            Get swarm status
          </button>
          <button
            onClick={() => setMessageInput('{"type": "stream", "command": "claude-flow start"}')}
            className="block w-full text-left px-2 py-1 text-xs text-green-600 hover:bg-gray-800 rounded transition-colors font-mono"
          >
            Stream command output
          </button>
        </div>
      </div>
    </div>
  )
}

export default WebSocketTester
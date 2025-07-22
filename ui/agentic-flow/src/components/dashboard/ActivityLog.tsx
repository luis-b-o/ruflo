import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LogEntry {
  id: number
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, time: '21:05:12', message: 'Agent RESEARCHER completed task: API pattern analysis', type: 'success' },
    { id: 2, time: '21:05:08', message: 'Agent CODER-1 spawned for: Authentication implementation', type: 'info' },
    { id: 3, time: '21:05:05', message: 'Swarm topology optimized: HIERARCHICAL mode', type: 'info' },
    { id: 4, time: '21:05:01', message: 'MCP tool executed: memory_usage (store)', type: 'info' },
    { id: 5, time: '21:04:58', message: 'Neural training completed: 98.7% accuracy', type: 'success' },
  ])

  // Simulate new log entries
  useEffect(() => {
    const messages = [
      { msg: 'Agent ARCHITECT designing: Database schema', type: 'info' as const },
      { msg: 'Agent CODER-2 implementing: REST endpoints', type: 'info' as const },
      { msg: 'Memory checkpoint saved: 15.2MB', type: 'success' as const },
      { msg: 'Performance optimization: Token usage reduced 12%', type: 'success' as const },
      { msg: 'Agent TESTER running: Unit test suite', type: 'info' as const },
      { msg: 'Task completed: User authentication module', type: 'success' as const },
      { msg: 'Warning: High memory usage detected', type: 'warning' as const },
      { msg: 'Neural pattern learned: API error handling', type: 'success' as const },
    ]

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const randomMessage = messages[Math.floor(Math.random() * messages.length)]
        const newEntry: LogEntry = {
          id: Date.now(),
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          message: randomMessage.msg,
          type: randomMessage.type
        }
        
        setLogs(prev => [newEntry, ...prev].slice(0, 10))
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const typeColors = {
    info: 'text-green-600',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  }

  const typeIcons = {
    info: '►',
    success: '✓',
    warning: '⚠',
    error: '✗'
  }

  return (
    <div className="retro-panel">
      <h2 className="text-lg font-semibold mb-4 text-green-400">ACTIVITY LOG</h2>
      
      <div className="font-mono text-xs space-y-1 h-64 overflow-y-auto">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className={`${typeColors[log.type]} flex items-start gap-2`}
            >
              <span className="flex-shrink-0">[{log.time}]</span>
              <span className="flex-shrink-0">{typeIcons[log.type]}</span>
              <span className="break-words">{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 pt-3 border-t border-green-900">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green-600">LOG STATUS:</span>
          <span className="text-green-400 animate-pulse">● LIVE</span>
        </div>
      </div>
    </div>
  )
}

export default ActivityLog
import React from 'react'
import { motion } from 'framer-motion'

interface Agent {
  id: string
  name: string
  type: string
  status: 'active' | 'idle' | 'error'
  tasks: number
  memory: string
  cpu: number
}

interface AgentCardProps {
  agent: Agent
}

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const statusColors = {
    active: 'text-green-400 animate-pulse',
    idle: 'text-yellow-400',
    error: 'text-red-400'
  }

  const typeIcons = {
    architect: '🏗️',
    coder: '💻',
    analyst: '📊',
    tester: '🧪',
    researcher: '🔍'
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="retro-panel relative overflow-hidden"
    >
      {/* Agent Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{typeIcons[agent.type as keyof typeof typeIcons] || '🤖'}</span>
          <h3 className="text-lg font-bold text-green-400">{agent.name}</h3>
        </div>
        <span className={`text-xs font-mono ${statusColors[agent.status]}`}>
          [{agent.status.toUpperCase()}]
        </span>
      </div>

      {/* Agent Stats */}
      <div className="space-y-2 text-sm font-mono">
        <div className="flex justify-between">
          <span className="text-green-600">TYPE:</span>
          <span className="text-green-400">{agent.type.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">TASKS:</span>
          <span className="text-green-400">{agent.tasks}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">MEMORY:</span>
          <span className="text-green-400">{agent.memory}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-600">CPU:</span>
          <span className="text-green-400">{agent.cpu.toFixed(1)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="h-2 bg-green-900/30 border border-green-900">
          <motion.div
            className="h-full bg-green-400"
            initial={{ width: 0 }}
            animate={{ width: `${agent.cpu}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ASCII Decoration */}
      <div className="absolute top-0 right-0 text-xs text-green-900 font-mono opacity-30">
        ▓▓▓▓
      </div>
    </motion.div>
  )
}

export default AgentCard
import React from 'react'
import { motion } from 'framer-motion'

interface Agent {
  id: string
  name: string
  type: string
  status: 'active' | 'idle' | 'error'
}

interface SwarmTopologyProps {
  agents: Agent[]
}

const SwarmTopology: React.FC<SwarmTopologyProps> = ({ agents }) => {
  return (
    <div className="retro-panel">
      <h2 className="text-lg font-semibold mb-4 text-green-400">SWARM TOPOLOGY - HIERARCHICAL</h2>
      
      {/* ASCII Art Topology Visualization */}
      <div className="font-mono text-xs text-green-600 whitespace-pre overflow-x-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {`
                        ┌─────────────┐
                        │ COORDINATOR │
                        └──────┬──────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
         │ ARCHITECT  │ │   ANALYST   │ │ RESEARCHER │
         └──────┬─────┘ └─────┬──────┘ └─────┬──────┘
                │             │              │
          ┌─────┴─────┐      │         ┌────┴────┐
          │           │      │         │         │
    ┌─────▼───┐ ┌────▼────┐ │   ┌────▼───┐ ┌───▼────┐
    │ CODER-1 │ │ CODER-2 │ │   │ TESTER │ │ DOCS   │
    └─────────┘ └─────────┘ │   └────────┘ └────────┘
                            │
                       ┌────▼────┐
                       │ MONITOR │
                       └─────────┘`}
        </motion.div>
      </div>

      {/* Connection Status */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span className="text-green-600">Active Connections:</span>
            <span className="text-green-400">12</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-yellow-400">●</span>
            <span className="text-green-600">Latency:</span>
            <span className="text-green-400">2.3ms</span>
          </div>
        </div>
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-400">●</span>
            <span className="text-green-600">Messages/sec:</span>
            <span className="text-green-400">847</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-green-400">●</span>
            <span className="text-green-600">Sync Status:</span>
            <span className="text-green-400">OPTIMAL</span>
          </div>
        </div>
      </div>

      {/* Agent Status Summary */}
      <div className="mt-4 pt-4 border-t border-green-900">
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-600">Swarm Health:</span>
          <div className="flex gap-1">
            {agents.map((agent) => (
              <motion.span
                key={agent.id}
                className={`inline-block w-2 h-2 ${
                  agent.status === 'active' ? 'bg-green-400' : 
                  agent.status === 'idle' ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: Math.random() * 0.5 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SwarmTopology
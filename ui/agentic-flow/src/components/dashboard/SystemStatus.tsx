import React from 'react'
import { motion } from 'framer-motion'

interface SystemStatusProps {
  time: Date
  swarmActive: boolean
}

const SystemStatus: React.FC<SystemStatusProps> = ({ time, swarmActive }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    }).replace(/\//g, '-')
  }

  return (
    <div className="retro-panel mb-6">
      <div className="flex items-center justify-between text-sm font-mono">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-green-600">SYSTEM:</span>
            <span className={swarmActive ? 'text-green-400 animate-pulse' : 'text-red-400'}>
              {swarmActive ? '● ONLINE' : '● OFFLINE'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-green-600">MODE:</span>
            <span className="text-green-400">NEURAL-SWARM</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-green-600">VERSION:</span>
            <span className="text-green-400">2.0.0</span>
          </div>
        </div>

        {/* Center Section - ASCII Animation */}
        <div className="hidden lg:block">
          <motion.div
            className="text-green-600 text-xs"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {'[▓▓▓▓▓▓▓▓░░]'}
          </motion.div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-green-600">DATE:</span>
            <span className="text-green-400">{formatDate(time)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-green-600">TIME:</span>
            <span className="text-green-400 font-bold">{formatTime(time)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Status Indicators */}
      <div className="mt-2 pt-2 border-t border-green-900 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-green-600">
            MCP: <span className="text-green-400">CONNECTED</span>
          </span>
          <span className="text-green-600">
            HOOKS: <span className="text-green-400">ACTIVE</span>
          </span>
          <span className="text-green-600">
            MEMORY: <span className="text-green-400">OPTIMAL</span>
          </span>
        </div>
        
        <div className="text-green-600">
          UPTIME: <span className="text-green-400">04:23:17</span>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus
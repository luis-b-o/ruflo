import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import AgentCard from './AgentCard'
import SwarmTopology from './SwarmTopology'
import MetricsDisplay from './MetricsDisplay'
import ActivityLog from './ActivityLog'
import SystemStatus from './SystemStatus'

// Mock data for agents
const mockAgents = [
  { id: 'architect', name: 'ARCHITECT', type: 'architect', status: 'active', tasks: 12, memory: '23.4MB', cpu: 15.2 },
  { id: 'coder-1', name: 'CODER-1', type: 'coder', status: 'active', tasks: 45, memory: '41.8MB', cpu: 32.7 },
  { id: 'coder-2', name: 'CODER-2', type: 'coder', status: 'active', tasks: 38, memory: '39.2MB', cpu: 28.4 },
  { id: 'analyst', name: 'ANALYST', type: 'analyst', status: 'active', tasks: 8, memory: '18.9MB', cpu: 12.3 },
  { id: 'tester', name: 'TESTER', type: 'tester', status: 'idle', tasks: 24, memory: '15.3MB', cpu: 8.9 }
]

const Dashboard: React.FC = () => {
  const [time, setTime] = useState(new Date())
  const [metrics, setMetrics] = useState({
    cpu: 23.4,
    memory: 87.3,
    tokenRate: 1200,
    tasksCompleted: 127,
    tasksActive: 5,
    tasksPending: 12
  })

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
      // Simulate metrics changes
      setMetrics(prev => ({
        ...prev,
        cpu: Math.min(100, Math.max(10, prev.cpu + (Math.random() - 0.5) * 5)),
        memory: Math.min(512, Math.max(50, prev.memory + (Math.random() - 0.5) * 10)),
        tokenRate: Math.min(2000, Math.max(800, prev.tokenRate + (Math.random() - 0.5) * 100)),
        tasksCompleted: prev.tasksCompleted + (Math.random() > 0.7 ? 1 : 0)
      }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="p-6 max-h-screen overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ASCII Art Header */}
        <div className="mb-6 font-mono text-xs text-green-600 whitespace-pre">
          {`╔══════════════════════════════════════════════════════════════════════════════╗
║  ██╗  ██╗██╗██╗   ██╗███████╗███╗   ███╗██╗███╗   ██╗██████╗               ║
║  ██║  ██║██║██║   ██║██╔════╝████╗ ████║██║████╗  ██║██╔══██╗              ║
║  ███████║██║██║   ██║█████╗  ██╔████╔██║██║██╔██╗ ██║██║  ██║              ║
║  ██╔══██║██║╚██╗ ██╔╝██╔══╝  ██║╚██╔╝██║██║██║╚██╗██║██║  ██║              ║
║  ██║  ██║██║ ╚████╔╝ ███████╗██║ ╚═╝ ██║██║██║ ╚████║██████╔╝              ║
║  ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═════╝  v2.0.0      ║
╚══════════════════════════════════════════════════════════════════════════════╝`}
        </div>
        
        <h1 className="text-2xl font-bold mb-6 glitch" data-text="NEURAL SWARM CONTROL CENTER">
          NEURAL SWARM CONTROL CENTER
        </h1>
        {/* System Status Bar */}
        <SystemStatus time={time} swarmActive={true} />
        
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Swarm Topology */}
          <div className="lg:col-span-2 space-y-6">
            <SwarmTopology agents={mockAgents} />
            
            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
          
          {/* Right Column - Metrics and Activity */}
          <div className="space-y-6">
            <MetricsDisplay metrics={metrics} />

            <ActivityLog />
          </div>
        </div>
        
        {/* Bottom ASCII Art */}
        <div className="mt-8 font-mono text-xs text-green-600 text-center whitespace-pre">
          {`═══════════════════════════════════════════════════════════════════════════════
[ CLAUDE FLOW AGENTIC SYSTEM ] - [ 84.8% SWE-BENCH ] - [ 2.8x SPEED ] - [ ACTIVE ]`}
        </div>
      </motion.div>
    </div>
  )
}

export default Dashboard
import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'

// Components (to be implemented)
import Dashboard from './components/dashboard/Dashboard'
import SwarmView from './components/swarm/SwarmView'
import MCPTools from './components/mcp/MCPTools'
import Terminal from './components/shared/Terminal'
import Navigation from './components/shared/Navigation'
import MemoryExplorer from './components/memory/MemoryExplorer'

// Stores (to be implemented)
import { useSwarmStore } from './stores/swarmStore'
import { useMCPStore } from './stores/mcpStore'

// Utils
import { cn } from './utils/cn'

function App() {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Simulate initialization
    setTimeout(() => setIsInitialized(true), 100)
  }, [])

  if (!isInitialized) {
    return null
  }

  return (
    <Router>
      <div className="app-container">
        {/* Retro console frame */}
        <div className="console-frame">
          {/* Terminal header */}
          <div className="terminal-header">
            <div className="terminal-title">
              <span className="terminal-icon">◼</span>
              <span>AGENTIC FLOW v2.0.0 - HIVEMIND CONSOLE</span>
            </div>
            <div className="terminal-controls">
              <button className="terminal-btn minimize">_</button>
              <button className="terminal-btn maximize">□</button>
              <button className="terminal-btn close">×</button>
            </div>
          </div>

          {/* Main content area */}
          <div className="console-content">
            {/* Navigation sidebar */}
            <Navigation />

            {/* Main view area */}
            <main className="main-view">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/swarm" element={<SwarmView />} />
                <Route path="/mcp-tools" element={<MCPTools />} />
                <Route path="/memory" element={<MemoryExplorer />} />
                <Route path="/terminal" element={<Terminal />} />
              </Routes>
            </main>
          </div>

          {/* Status bar */}
          <div className="status-bar">
            <div className="status-item">
              <span className="status-label">SWARM:</span>
              <span className="status-value status-active">ACTIVE</span>
            </div>
            <div className="status-item">
              <span className="status-label">AGENTS:</span>
              <span className="status-value">5/5</span>
            </div>
            <div className="status-item">
              <span className="status-label">MCP:</span>
              <span className="status-value">71 TOOLS</span>
            </div>
            <div className="status-item">
              <span className="status-label">MEMORY:</span>
              <span className="status-value">87.3MB</span>
            </div>
            <div className="status-item">
              <span className="status-label">CPU:</span>
              <span className="status-value">23.4%</span>
            </div>
            <div className="status-item status-time">
              {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
          </div>
        </div>

        {/* Toast notifications with retro styling */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#000',
              color: '#00ff00',
              border: '1px solid #00ff00',
              borderRadius: '0',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '12px',
              boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)',
            },
            success: {
              iconTheme: {
                primary: '#00ff00',
                secondary: '#000',
              },
            },
            error: {
              style: {
                color: '#ff0000',
                border: '1px solid #ff0000',
                boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
              },
              iconTheme: {
                primary: '#ff0000',
                secondary: '#000',
              },
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App
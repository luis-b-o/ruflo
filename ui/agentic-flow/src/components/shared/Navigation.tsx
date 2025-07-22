import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Network, 
  Wrench, 
  Terminal as TerminalIcon,
  Database 
} from 'lucide-react'

const Navigation: React.FC = () => {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'DASHBOARD' },
    { to: '/swarm', icon: Network, label: 'SWARM' },
    { to: '/mcp-tools', icon: Wrench, label: 'MCP TOOLS' },
    { to: '/memory', icon: Database, label: 'MEMORY' },
    { to: '/terminal', icon: TerminalIcon, label: 'TERMINAL' },
  ]

  return (
    <nav className="w-64 border-r border-green-900 bg-black/50 p-4 font-mono">
      <div className="mb-6">
        <div className="text-green-400 text-xs mb-2">
          ╔═══════════════════════════╗
        </div>
        <h2 className="text-lg font-bold text-green-400 mb-1 px-2">AGENTIC FLOW</h2>
        <p className="text-xs text-green-600 px-2">HIVEMIND CONSOLE v2.0.0</p>
        <div className="text-green-400 text-xs mt-2">
          ╚═══════════════════════════╝
        </div>
      </div>

      <div className="text-green-600 text-xs mb-3">
        ════ NAVIGATION ════
      </div>

      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm transition-all rounded ${
                  isActive
                    ? 'bg-green-900/30 text-green-400 border-l-2 border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.3)]'
                    : 'text-green-600 hover:text-green-400 hover:bg-green-900/10 border-l-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} className={isActive ? 'animate-pulse' : ''} />
                  <span className="font-mono tracking-wider">{item.label}</span>
                  {isActive && <span className="ml-auto text-xs animate-pulse">▶</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-6 text-green-600 text-xs">
        ═══════════════════
      </div>

      <div className="mt-6 pt-6">
        <div className="text-green-600 text-xs mb-3">
          ════ SYSTEM ════
        </div>
        <div className="text-xs text-green-600 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>MEMORY:</span>
            <span className="text-green-400">87.3MB</span>
          </div>
          <div className="flex justify-between">
            <span>UPTIME:</span>
            <span className="text-green-400">04:23:17</span>
          </div>
          <div className="flex justify-between">
            <span>VERSION:</span>
            <span className="text-green-400">2.0.0-α</span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-green-600 text-xs text-center">
        ╔═══════════════════════════╗
        ║  [SYSTEM OPERATIONAL]     ║
        ╚═══════════════════════════╝
      </div>
    </nav>
  )
}

export default Navigation
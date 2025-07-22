import React, { useEffect, useState } from 'react'
import { Search, Database, Clock, HardDrive, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MemoryEntry {
  id: string
  key: string
  value: any
  timestamp: number
  type: 'session' | 'swarm' | 'agent' | 'task' | 'neural'
  size: number
}

const MemoryExplorer: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null)

  // Mock data - in real app, this would connect to the actual memory store
  useEffect(() => {
    const mockMemories: MemoryEntry[] = [
      {
        id: '1',
        key: 'swarm/navigation/nav-update',
        value: { component: 'Navigation', action: 'update', status: 'completed' },
        timestamp: Date.now() - 300000,
        type: 'swarm',
        size: 248
      },
      {
        id: '2',
        key: 'session/current/state',
        value: { agents: 5, tasks: 12, uptime: '04:23:17' },
        timestamp: Date.now() - 120000,
        type: 'session',
        size: 156
      },
      {
        id: '3',
        key: 'agent/architect/decisions',
        value: { patterns: ['mvc', 'observer'], confidence: 0.92 },
        timestamp: Date.now() - 60000,
        type: 'agent',
        size: 312
      },
      {
        id: '4',
        key: 'neural/pattern/ui-components',
        value: { learned: true, accuracy: 0.87, iterations: 42 },
        timestamp: Date.now() - 180000,
        type: 'neural',
        size: 198
      },
      {
        id: '5',
        key: 'task/navigation-implementation',
        value: { status: 'in_progress', progress: 75, subtasks: 4 },
        timestamp: Date.now() - 30000,
        type: 'task',
        size: 167
      }
    ]
    setMemories(mockMemories)
  }, [])

  const filteredMemories = memories.filter(memory => {
    const matchesSearch = memory.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         JSON.stringify(memory.value).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || memory.type === selectedType
    return matchesSearch && matchesType
  })

  const totalSize = memories.reduce((acc, mem) => acc + mem.size, 0)
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString('en-US', { hour12: false })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'session': return <Clock size={14} />
      case 'swarm': return <Activity size={14} />
      case 'agent': return <Database size={14} />
      case 'neural': return <HardDrive size={14} />
      default: return <Database size={14} />
    }
  }

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="text-green-400 text-xs mb-2 font-mono">
          ╔════════════════════════════════════════╗
        </div>
        <h1 className="text-2xl font-bold text-green-400 mb-2 px-2 font-mono">MEMORY EXPLORER</h1>
        <p className="text-sm text-green-600 px-2 font-mono">Neural Storage & Session History</p>
        <div className="text-green-400 text-xs mt-2 font-mono">
          ╚════════════════════════════════════════╝
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">TOTAL ENTRIES</div>
          <div className="text-xl font-bold text-green-400 font-mono">{memories.length}</div>
        </div>
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">TOTAL SIZE</div>
          <div className="text-xl font-bold text-green-400 font-mono">{formatSize(totalSize)}</div>
        </div>
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">ACTIVE SESSIONS</div>
          <div className="text-xl font-bold text-green-400 font-mono">3</div>
        </div>
        <div className="bg-black/50 border border-green-900 p-3 rounded">
          <div className="text-xs text-green-600 mb-1">NEURAL PATTERNS</div>
          <div className="text-xl font-bold text-green-400 font-mono">27</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search memory keys or values..."
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-green-900 text-green-400 placeholder-green-700 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 bg-black/50 border border-green-900 text-green-400 focus:outline-none focus:border-green-400 rounded font-mono text-sm"
        >
          <option value="all">ALL TYPES</option>
          <option value="session">SESSION</option>
          <option value="swarm">SWARM</option>
          <option value="agent">AGENT</option>
          <option value="task">TASK</option>
          <option value="neural">NEURAL</option>
        </select>
      </div>

      {/* Memory List */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            <AnimatePresence>
              {filteredMemories.map((memory) => (
                <motion.div
                  key={memory.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-3 bg-black/50 border border-green-900 rounded cursor-pointer transition-all hover:border-green-400 hover:shadow-[0_0_10px_rgba(0,255,0,0.3)] ${
                    selectedMemory?.id === memory.id ? 'border-green-400 shadow-[0_0_10px_rgba(0,255,0,0.3)]' : ''
                  }`}
                  onClick={() => setSelectedMemory(memory)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(memory.type)}
                        <span className="text-xs text-green-600 uppercase font-mono">{memory.type}</span>
                        <span className="text-xs text-green-700 font-mono">{formatTimestamp(memory.timestamp)}</span>
                      </div>
                      <div className="text-sm text-green-400 font-mono break-all">{memory.key}</div>
                    </div>
                    <div className="text-xs text-green-600 font-mono ml-4">{formatSize(memory.size)}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Detail View */}
        {selectedMemory && (
          <div className="w-96 bg-black/50 border border-green-900 rounded p-4 overflow-y-auto">
            <div className="text-green-400 text-xs mb-3 font-mono">
              ════ MEMORY DETAILS ════
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs text-green-600 mb-1">KEY</div>
                <div className="text-sm text-green-400 font-mono break-all">{selectedMemory.key}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">TYPE</div>
                <div className="text-sm text-green-400 font-mono uppercase">{selectedMemory.type}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">SIZE</div>
                <div className="text-sm text-green-400 font-mono">{formatSize(selectedMemory.size)}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">TIMESTAMP</div>
                <div className="text-sm text-green-400 font-mono">{new Date(selectedMemory.timestamp).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-green-600 mb-1">VALUE</div>
                <pre className="text-sm text-green-400 font-mono bg-black/30 p-2 rounded overflow-x-auto">
                  {JSON.stringify(selectedMemory.value, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MemoryExplorer
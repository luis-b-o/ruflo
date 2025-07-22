import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface CommandOutput {
  command: string
  output: string[]
  timestamp: Date
  type: 'input' | 'output' | 'error' | 'success' | 'info'
}

const COMMAND_RESPONSES: Record<string, string[]> = {
  help: [
    'Available commands:',
    '',
    '  help                  Show this help message',
    '  clear                 Clear terminal screen',
    '  swarm status          Show swarm status and active agents',
    '  agent list            List all available agents',
    '  mcp tools             Display available MCP tools',
    '  memory usage          Show memory usage statistics',
    '  benchmark run         Run performance benchmarks',
    '  neural status         Check neural network status',
    '  repo analyze          Analyze current repository',
    '  ls                    List directory contents',
    '  pwd                   Print working directory',
    '  echo <text>           Echo text to terminal',
    '',
    'Press ↑/↓ to navigate command history',
    'Press Tab for auto-completion',
  ],
  'swarm status': [
    '🐝 Swarm Status: ACTIVE',
    '├── 🏗️ Topology: hierarchical',
    '├── 👥 Agents: 6/8 active',
    '├── ⚡ Mode: parallel execution',
    '├── 📊 Tasks: 12 total (4 complete, 6 in-progress, 2 pending)',
    '└── 🧠 Memory: 15 coordination points stored',
    '',
    'Agent Activity:',
    '├── 🟢 architect: Designing database schema...',
    '├── 🟢 coder-1: Implementing auth endpoints...',
    '├── 🟢 coder-2: Building user CRUD operations...',
    '├── 🟢 analyst: Optimizing query performance...',
    '├── 🟡 tester: Waiting for auth completion...',
    '└── 🟢 coordinator: Monitoring progress...',
  ],
  'agent list': [
    'Available Agent Types:',
    '',
    '🏛️ architect       - System design and architecture planning',
    '💻 coder           - Code implementation and development',
    '🔍 analyst         - Code analysis and optimization',
    '🧪 tester          - Test creation and quality assurance',
    '📚 researcher      - Documentation and research tasks',
    '🎯 coordinator     - Task coordination and management',
    '🔧 debugger        - Bug fixing and troubleshooting',
    '🚀 deployer        - Deployment and DevOps operations',
    '',
    'Total registered agents: 8',
  ],
  'mcp tools': [
    'Available MCP Tools:',
    '',
    '🎯 Coordination Tools:',
    '  • swarm_init         - Initialize swarm with topology',
    '  • agent_spawn        - Spawn specialized agents',
    '  • task_orchestrate   - Orchestrate complex tasks',
    '',
    '📊 Monitoring Tools:',
    '  • swarm_status       - Monitor swarm activity',
    '  • agent_metrics      - Track agent performance',
    '  • task_status        - Check task progress',
    '',
    '🧠 Neural Tools:',
    '  • neural_status      - Neural network status',
    '  • neural_train       - Train patterns',
    '  • neural_patterns    - View learned patterns',
    '',
    '💾 Memory Tools:',
    '  • memory_usage       - Memory statistics',
    '  • memory_store       - Store data',
    '  • memory_retrieve    - Retrieve data',
  ],
  'memory usage': [
    '💾 Memory Usage Statistics:',
    '',
    '├── Database: .swarm/memory.db',
    '├── Size: 1.2 MB',
    '├── Sessions: 42',
    '├── Coordination Points: 156',
    '├── Neural Patterns: 27',
    '└── Cache Entries: 89',
    '',
    'Memory Distribution:',
    '├── Agent Context: 35%',
    '├── Task History: 25%',
    '├── Neural Patterns: 20%',
    '├── Session Data: 15%',
    '└── Cache: 5%',
  ],
  ls: [
    'src/',
    'tests/',
    'docs/',
    'package.json',
    'README.md',
    'tsconfig.json',
    '.gitignore',
  ],
  pwd: ['/workspaces/claude-code-flow/ui/agentic-flow'],
  'benchmark run': [
    '🚀 Running performance benchmarks...',
    '',
    '✅ Token Usage: 32.3% reduction',
    '✅ Execution Speed: 2.8x improvement',
    '✅ Parallel Tasks: 4.4x faster',
    '✅ Memory Efficiency: 89% optimal',
    '✅ Cache Hit Rate: 76%',
    '',
    'Overall Performance Score: A+',
  ],
  'neural status': [
    '🧠 Neural Network Status:',
    '',
    '├── Models Loaded: 27',
    '├── Training Epochs: 1,024',
    '├── Accuracy: 94.7%',
    '├── Last Training: 2 hours ago',
    '└── Next Training: Scheduled in 4 hours',
    '',
    'Pattern Recognition:',
    '├── Code Patterns: 156 learned',
    '├── Task Patterns: 89 learned',
    '├── Error Patterns: 42 learned',
    '└── Optimization Patterns: 67 learned',
  ],
  'repo analyze': [
    '🔍 Analyzing repository...',
    '',
    '📊 Repository Statistics:',
    '├── Language: TypeScript (68%), JavaScript (22%), CSS (10%)',
    '├── Total Files: 342',
    '├── Total Lines: 24,567',
    '├── Components: 47',
    '├── Tests: 89 (76% coverage)',
    '└── Dependencies: 28',
    '',
    '🏗️ Architecture:',
    '├── Framework: React 18.2 + Vite',
    '├── State: Zustand',
    '├── Routing: React Router v6',
    '├── Styling: Tailwind CSS',
    '└── Testing: Jest + React Testing Library',
  ],
}

const Terminal: React.FC = () => {
  const [history, setHistory] = useState<CommandOutput[]>([
    {
      command: '',
      output: [
        'Claude Flow Terminal v2.0.0',
        'Type "help" for available commands',
        '',
      ],
      timestamp: new Date(),
      type: 'info'
    }
  ])
  const [currentCommand, setCurrentCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const executeCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim().toLowerCase()
    
    // Add command to history
    const commandEntry: CommandOutput = {
      command: cmd,
      output: [],
      timestamp: new Date(),
      type: 'input'
    }
    
    let output: string[] = []
    let outputType: CommandOutput['type'] = 'output'

    if (trimmedCmd === 'clear') {
      setHistory([])
      setCommandHistory([...commandHistory, cmd])
      return
    }

    if (trimmedCmd.startsWith('echo ')) {
      output = [cmd.substring(5)]
    } else if (COMMAND_RESPONSES[trimmedCmd]) {
      output = COMMAND_RESPONSES[trimmedCmd]
      if (trimmedCmd.includes('error')) outputType = 'error'
      else if (trimmedCmd.includes('status')) outputType = 'success'
    } else if (trimmedCmd === '') {
      // Empty command, just add to history
      setHistory([...history, commandEntry])
      return
    } else {
      output = [`Command not found: ${cmd}`, 'Type "help" for available commands']
      outputType = 'error'
    }

    const outputEntry: CommandOutput = {
      command: '',
      output,
      timestamp: new Date(),
      type: outputType
    }

    setHistory([...history, commandEntry, outputEntry])
    setCommandHistory([...commandHistory, cmd])
    setCurrentCommand('')
    setHistoryIndex(-1)
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(currentCommand)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCurrentCommand('')
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleAutoComplete()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleAutoComplete = () => {
    if (currentCommand.trim() === '') {
      setSuggestions(Object.keys(COMMAND_RESPONSES))
      setShowSuggestions(true)
      return
    }

    const matches = Object.keys(COMMAND_RESPONSES).filter(cmd => 
      cmd.startsWith(currentCommand.toLowerCase())
    )

    if (matches.length === 1) {
      setCurrentCommand(matches[0])
      setShowSuggestions(false)
    } else if (matches.length > 1) {
      setSuggestions(matches)
      setShowSuggestions(true)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCurrentCommand(value)
    
    // Show suggestions as user types
    if (value.trim()) {
      const matches = Object.keys(COMMAND_RESPONSES).filter(cmd => 
        cmd.startsWith(value.toLowerCase())
      )
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const renderOutput = (entry: CommandOutput) => {
    const colorClass = {
      input: 'text-green-400',
      output: 'text-green-400',
      error: 'text-red-400',
      success: 'text-green-500',
      info: 'text-cyan-400'
    }[entry.type]

    if (entry.type === 'input') {
      return (
        <div className="flex mb-1">
          <span className="text-green-600 mr-2">❯</span>
          <span className={colorClass}>{entry.command}</span>
        </div>
      )
    }

    return (
      <div className={`mb-2 ${colorClass}`}>
        {entry.output.map((line, i) => (
          <div key={i} className="whitespace-pre">{line || '\u00A0'}</div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6 glitch" data-text="TERMINAL">
        TERMINAL
      </h1>
      <div className="retro-panel flex-1 bg-black p-4 font-mono text-sm flex flex-col relative overflow-hidden">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="h-px bg-green-400 animate-scan-line" 
               style={{ animation: 'scan-line 6s linear infinite' }} />
        </div>
        
        {/* Terminal content */}
        <div ref={terminalRef} className="flex-1 overflow-y-auto pr-2 text-green-400">
          {history.map((entry, index) => (
            <div key={index}>{renderOutput(entry)}</div>
          ))}
          
          {/* Current input line */}
          <div className="flex items-center relative">
            <span className="text-green-600 mr-2">❯</span>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={currentCommand}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="bg-transparent border-none outline-none text-green-400 w-full"
                style={{ caretColor: 'transparent' }}
                autoComplete="off"
                spellCheck={false}
              />
              <span 
                className="terminal-cursor absolute"
                style={{ 
                  left: `${currentCommand.length * 0.6}em`,
                  top: '0'
                }}
              />
              
              {/* Auto-completion suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 bg-black border border-green-900 p-2 min-w-[200px]">
                  {suggestions.map((suggestion, i) => (
                    <div 
                      key={i}
                      className="text-green-400 hover:bg-green-900 hover:text-black px-2 py-1 cursor-pointer"
                      onClick={() => {
                        setCurrentCommand(suggestion)
                        setShowSuggestions(false)
                        inputRef.current?.focus()
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Terminal info bar */}
        <div className="mt-2 pt-2 border-t border-green-900 text-xs text-green-600 flex justify-between">
          <span>claude-flow@2.0.0</span>
          <span>/workspaces/claude-code-flow</span>
        </div>
      </div>
    </div>
  )
}

export default Terminal
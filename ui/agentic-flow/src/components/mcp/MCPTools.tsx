import React, { useState, useMemo } from 'react'
import { Search, Terminal, Brain, Database, Activity, Workflow, Github, Settings, ChevronRight, Play, Copy, Check } from 'lucide-react'

// Tool categories with their tools
const toolCategories = {
  neural: {
    name: 'Neural Network Tools',
    icon: Brain,
    color: 'text-purple-400',
    tools: [
      { name: 'neural_status', description: 'Check neural network status', params: [] },
      { name: 'neural_train', description: 'Train neural patterns', params: [{ name: 'pattern', type: 'string', required: true }] },
      { name: 'neural_patterns', description: 'List available patterns', params: [] },
      { name: 'neural_sync', description: 'Synchronize neural state', params: [] },
      { name: 'pattern_learn', description: 'Learn from code patterns', params: [{ name: 'file', type: 'string' }] },
      { name: 'neural_reset', description: 'Reset neural network', params: [] },
      { name: 'neural_export', description: 'Export neural model', params: [{ name: 'format', type: 'string' }] },
      { name: 'neural_import', description: 'Import neural model', params: [{ name: 'path', type: 'string' }] },
      { name: 'neural_optimize', description: 'Optimize neural performance', params: [] },
      { name: 'neural_benchmark', description: 'Benchmark neural operations', params: [] },
      { name: 'neural_analyze', description: 'Analyze neural patterns', params: [{ name: 'depth', type: 'number' }] },
      { name: 'neural_predict', description: 'Predict code patterns', params: [{ name: 'context', type: 'string' }] },
      { name: 'neural_suggest', description: 'Get AI suggestions', params: [{ name: 'task', type: 'string' }] },
      { name: 'neural_evaluate', description: 'Evaluate neural accuracy', params: [] },
      { name: 'neural_visualize', description: 'Visualize neural network', params: [] }
    ]
  },
  memory: {
    name: 'Memory & Persistence',
    icon: Database,
    color: 'text-blue-400',
    tools: [
      { name: 'memory_usage', description: 'Store/retrieve memory', params: [{ name: 'action', type: 'select', options: ['store', 'retrieve', 'list'], required: true }, { name: 'key', type: 'string' }, { name: 'value', type: 'json' }] },
      { name: 'memory_search', description: 'Search memory patterns', params: [{ name: 'query', type: 'string', required: true }] },
      { name: 'memory_clear', description: 'Clear memory storage', params: [{ name: 'pattern', type: 'string' }] },
      { name: 'memory_export', description: 'Export memory database', params: [{ name: 'format', type: 'select', options: ['json', 'sqlite'] }] },
      { name: 'memory_import', description: 'Import memory data', params: [{ name: 'path', type: 'string', required: true }] },
      { name: 'memory_stats', description: 'Memory usage statistics', params: [] },
      { name: 'memory_compact', description: 'Compact memory storage', params: [] },
      { name: 'memory_backup', description: 'Backup memory database', params: [{ name: 'destination', type: 'string' }] },
      { name: 'memory_restore', description: 'Restore memory backup', params: [{ name: 'source', type: 'string', required: true }] },
      { name: 'memory_sync', description: 'Sync memory across agents', params: [] }
    ]
  },
  monitoring: {
    name: 'Monitoring & Analysis',
    icon: Activity,
    color: 'text-green-400',
    tools: [
      { name: 'swarm_monitor', description: 'Monitor swarm activity', params: [{ name: 'interval', type: 'number' }] },
      { name: 'agent_metrics', description: 'Get agent performance metrics', params: [{ name: 'agent_id', type: 'string' }] },
      { name: 'task_status', description: 'Check task progress', params: [{ name: 'task_id', type: 'string' }] },
      { name: 'benchmark_run', description: 'Run performance benchmarks', params: [{ name: 'type', type: 'select', options: ['speed', 'memory', 'tokens'] }] },
      { name: 'bottleneck_detect', description: 'Detect performance bottlenecks', params: [] },
      { name: 'performance_report', description: 'Generate performance report', params: [{ name: 'format', type: 'select', options: ['text', 'json', 'html'] }] },
      { name: 'token_usage', description: 'Analyze token consumption', params: [{ name: 'period', type: 'string' }] },
      { name: 'real_time_view', description: 'Real-time activity monitor', params: [] },
      { name: 'swarm_status', description: 'Get swarm status overview', params: [] },
      { name: 'agent_list', description: 'List active agents', params: [] },
      { name: 'task_results', description: 'View task results', params: [{ name: 'task_id', type: 'string', required: true }] },
      { name: 'error_logs', description: 'View error logs', params: [{ name: 'limit', type: 'number' }] },
      { name: 'metrics_export', description: 'Export metrics data', params: [{ name: 'format', type: 'select', options: ['csv', 'json'] }] }
    ]
  },
  workflow: {
    name: 'Workflow & Automation',
    icon: Workflow,
    color: 'text-yellow-400',
    tools: [
      { name: 'workflow_create', description: 'Create new workflow', params: [{ name: 'name', type: 'string', required: true }, { name: 'steps', type: 'json' }] },
      { name: 'workflow_execute', description: 'Execute workflow', params: [{ name: 'workflow_id', type: 'string', required: true }] },
      { name: 'workflow_export', description: 'Export workflow definition', params: [{ name: 'workflow_id', type: 'string', required: true }] },
      { name: 'auto_agent', description: 'Auto-spawn optimal agents', params: [{ name: 'task', type: 'string', required: true }] },
      { name: 'smart_spawn', description: 'Intelligently spawn agents', params: [{ name: 'context', type: 'string' }] },
      { name: 'workflow_select', description: 'Select best workflow', params: [{ name: 'task', type: 'string', required: true }] },
      { name: 'parallel_execute', description: 'Execute tasks in parallel', params: [{ name: 'tasks', type: 'json', required: true }] },
      { name: 'cache_manage', description: 'Manage workflow cache', params: [{ name: 'action', type: 'select', options: ['clear', 'optimize', 'stats'] }] },
      { name: 'topology_optimize', description: 'Optimize swarm topology', params: [] },
      { name: 'workflow_list', description: 'List available workflows', params: [] },
      { name: 'workflow_delete', description: 'Delete workflow', params: [{ name: 'workflow_id', type: 'string', required: true }] }
    ]
  },
  github: {
    name: 'GitHub Integration',
    icon: Github,
    color: 'text-orange-400',
    tools: [
      { name: 'github_swarm', description: 'Create GitHub management swarm', params: [{ name: 'repository', type: 'string', required: true }, { name: 'agents', type: 'number' }] },
      { name: 'repo_analyze', description: 'Deep repository analysis', params: [{ name: 'deep', type: 'boolean' }, { name: 'include', type: 'json' }] },
      { name: 'pr_enhance', description: 'Enhance pull request', params: [{ name: 'pr_number', type: 'number', required: true }, { name: 'add_tests', type: 'boolean' }] },
      { name: 'issue_triage', description: 'Triage GitHub issues', params: [{ name: 'labels', type: 'json' }] },
      { name: 'code_review', description: 'Automated code review', params: [{ name: 'pr_number', type: 'number', required: true }] },
      { name: 'pr_create', description: 'Create pull request', params: [{ name: 'title', type: 'string', required: true }, { name: 'body', type: 'string' }] },
      { name: 'issue_create', description: 'Create GitHub issue', params: [{ name: 'title', type: 'string', required: true }, { name: 'body', type: 'string' }] },
      { name: 'release_notes', description: 'Generate release notes', params: [{ name: 'tag', type: 'string' }] }
    ]
  },
  system: {
    name: 'System & Utilities',
    icon: Settings,
    color: 'text-cyan-400',
    tools: [
      { name: 'features_detect', description: 'Detect available features', params: [] },
      { name: 'system_info', description: 'Get system information', params: [] },
      { name: 'config_get', description: 'Get configuration', params: [{ name: 'key', type: 'string' }] },
      { name: 'config_set', description: 'Set configuration', params: [{ name: 'key', type: 'string', required: true }, { name: 'value', type: 'json' }] },
      { name: 'version_info', description: 'Get version information', params: [] },
      { name: 'health_check', description: 'System health check', params: [] }
    ]
  },
  coordination: {
    name: 'Swarm Coordination',
    icon: Terminal,
    color: 'text-red-400',
    tools: [
      { name: 'swarm_init', description: 'Initialize swarm topology', params: [{ name: 'topology', type: 'select', options: ['mesh', 'hierarchical', 'ring', 'star'], required: true }, { name: 'maxAgents', type: 'number' }] },
      { name: 'agent_spawn', description: 'Spawn specialized agent', params: [{ name: 'type', type: 'select', options: ['architect', 'coder', 'analyst', 'tester', 'researcher', 'coordinator'], required: true }, { name: 'name', type: 'string' }] },
      { name: 'task_orchestrate', description: 'Orchestrate complex task', params: [{ name: 'task', type: 'string', required: true }, { name: 'strategy', type: 'select', options: ['parallel', 'sequential', 'adaptive'] }] },
      { name: 'swarm_reset', description: 'Reset swarm state', params: [] },
      { name: 'agent_communicate', description: 'Send message between agents', params: [{ name: 'from', type: 'string' }, { name: 'to', type: 'string' }, { name: 'message', type: 'string' }] },
      { name: 'task_split', description: 'Split task into subtasks', params: [{ name: 'task', type: 'string', required: true }] }
    ]
  }
}

interface Tool {
  name: string
  description: string
  params: Array<{
    name: string
    type: string
    required?: boolean
    options?: string[]
  }>
}

const MCPTools: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [paramValues, setParamValues] = useState<Record<string, any>>({})
  const [executionResult, setExecutionResult] = useState<string | null>(null)
  const [copiedResult, setCopiedResult] = useState(false)

  // Filter tools based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return toolCategories

    const filtered: typeof toolCategories = {}
    
    Object.entries(toolCategories).forEach(([key, category]) => {
      const matchingTools = category.tools.filter(tool => 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      
      if (matchingTools.length > 0 || category.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        filtered[key as keyof typeof toolCategories] = {
          ...category,
          tools: matchingTools.length > 0 ? matchingTools : category.tools
        }
      }
    })
    
    return filtered
  }, [searchQuery])

  // Count total tools
  const totalTools = Object.values(toolCategories).reduce((sum, cat) => sum + cat.tools.length, 0)
  const filteredToolsCount = Object.values(filteredCategories).reduce((sum, cat) => sum + cat.tools.length, 0)

  const handleToolSelect = (tool: Tool, categoryKey: string) => {
    setSelectedTool(tool)
    setSelectedCategory(categoryKey)
    setParamValues({})
    setExecutionResult(null)
  }

  const handleParamChange = (paramName: string, value: any) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }))
  }

  const handleExecute = () => {
    // Mock execution result
    const mockResults = [
      `✅ Successfully executed ${selectedTool?.name}`,
      `📊 ${selectedTool?.name} completed with status: SUCCESS`,
      `🔄 Processing ${selectedTool?.name}... Done!`,
      `⚡ ${selectedTool?.name} executed in 0.${Math.floor(Math.random() * 999)}ms`
    ]
    
    const result = `
╔════════════════════════════════════════════════════════════════╗
║ EXECUTION RESULT                                               ║
╠════════════════════════════════════════════════════════════════╣
║ Tool: mcp__claude-flow__${selectedTool?.name}                  ║
║ Category: ${selectedCategory}                                   ║
║ Status: SUCCESS                                                ║
║                                                                ║
║ Parameters:                                                    ║
${Object.entries(paramValues).map(([key, value]) => 
  `║   ${key}: ${JSON.stringify(value)}`.padEnd(65) + '║'
).join('\n')}
║                                                                ║
║ Output:                                                        ║
║   ${mockResults[Math.floor(Math.random() * mockResults.length)].padEnd(60)} ║
║                                                                ║
║ Timestamp: ${new Date().toISOString()}                ║
╚════════════════════════════════════════════════════════════════╝
    `.trim()
    
    setExecutionResult(result)
    setCopiedResult(false)
  }

  const handleCopyResult = () => {
    if (executionResult) {
      navigator.clipboard.writeText(executionResult)
      setCopiedResult(true)
      setTimeout(() => setCopiedResult(false), 2000)
    }
  }

  return (
    <div className="p-6 h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 glitch" data-text="MCP TOOLS INTERFACE">
          MCP TOOLS INTERFACE
        </h1>
        <p className="text-green-600 text-sm">
          {totalTools}+ Claude Flow MCP Tools • {Object.keys(toolCategories).length} Categories
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 w-4 h-4" />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black border border-green-900 text-green-400 focus:border-green-400"
          />
          {searchQuery && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              {filteredToolsCount} tools found
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Categories and Tools List */}
        <div className="w-1/2 overflow-y-auto retro-panel">
          <div className="space-y-4">
            {Object.entries(filteredCategories).map(([key, category]) => {
              const Icon = category.icon
              return (
                <div key={key} className="border border-green-900">
                  <div className={`p-3 bg-green-950/30 flex items-center gap-2 ${category.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="font-bold text-sm">{category.name}</span>
                    <span className="text-xs text-green-600 ml-auto">{category.tools.length} tools</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {category.tools.map((tool) => (
                      <button
                        key={tool.name}
                        onClick={() => handleToolSelect(tool, key)}
                        className={`w-full text-left px-3 py-2 text-sm transition-all ${
                          selectedTool?.name === tool.name
                            ? 'bg-green-900/30 text-green-400 border-l-2 border-green-400'
                            : 'text-green-600 hover:bg-green-950/30 hover:text-green-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono">{tool.name}</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                        <div className="text-xs text-green-700 mt-1">{tool.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tool Details and Execution */}
        <div className="w-1/2 overflow-y-auto retro-panel">
          {selectedTool ? (
            <div className="space-y-4">
              {/* Tool Header */}
              <div className="border-b border-green-900 pb-4">
                <h2 className="text-lg font-bold text-green-400 mb-2">
                  mcp__claude-flow__{selectedTool.name}
                </h2>
                <p className="text-sm text-green-600">{selectedTool.description}</p>
              </div>

              {/* Parameters */}
              {selectedTool.params.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-green-400">Parameters:</h3>
                  {selectedTool.params.map((param) => (
                    <div key={param.name} className="space-y-1">
                      <label className="text-xs text-green-600">
                        {param.name} {param.required && <span className="text-red-400">*</span>}
                      </label>
                      {param.type === 'select' && param.options ? (
                        <select
                          value={paramValues[param.name] || ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          className="w-full px-2 py-1 bg-black border border-green-900 text-green-400"
                        >
                          <option value="">Select {param.name}</option>
                          {param.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : param.type === 'boolean' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paramValues[param.name] || false}
                            onChange={(e) => handleParamChange(param.name, e.target.checked)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-green-400">Enable</span>
                        </label>
                      ) : param.type === 'number' ? (
                        <input
                          type="number"
                          value={paramValues[param.name] || ''}
                          onChange={(e) => handleParamChange(param.name, parseInt(e.target.value))}
                          className="w-full px-2 py-1 bg-black border border-green-900 text-green-400"
                          placeholder={`Enter ${param.name}`}
                        />
                      ) : param.type === 'json' ? (
                        <textarea
                          value={paramValues[param.name] || ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          className="w-full px-2 py-1 bg-black border border-green-900 text-green-400 font-mono text-xs"
                          rows={3}
                          placeholder={`Enter JSON for ${param.name}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={paramValues[param.name] || ''}
                          onChange={(e) => handleParamChange(param.name, e.target.value)}
                          className="w-full px-2 py-1 bg-black border border-green-900 text-green-400"
                          placeholder={`Enter ${param.name}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600">This tool has no parameters</p>
              )}

              {/* Execute Button */}
              <button
                onClick={handleExecute}
                className="w-full px-4 py-2 bg-green-900/30 border border-green-400 text-green-400 hover:bg-green-900/50 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Execute Tool
              </button>

              {/* Execution Result */}
              {executionResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-green-400">Execution Result:</h3>
                    <button
                      onClick={handleCopyResult}
                      className="px-2 py-1 text-xs border border-green-900 text-green-600 hover:text-green-400 hover:border-green-400 flex items-center gap-1"
                    >
                      {copiedResult ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedResult ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-3 bg-black border border-green-900 text-green-400 text-xs font-mono overflow-x-auto">
                    {executionResult}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-2">
                <Terminal className="w-12 h-12 text-green-600 mx-auto animate-pulse" />
                <p className="text-green-600">Select a tool to view details and execute</p>
                <p className="text-xs text-green-700">
                  {filteredToolsCount} tools available across {Object.keys(filteredCategories).length} categories
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MCPTools
import React, { useCallback, useEffect, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  MiniMap,
  MarkerType,
} from 'react-flow-renderer'
import { useSwarmStore } from '../../stores/swarmStore'
import { getMastraClient } from '../../api/mastra-client'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Play, Plus, Trash2, Users, Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react'

// Agent type definitions
interface Agent {
  id: string
  name: string
  type: 'researcher' | 'architect' | 'coder' | 'tester' | 'reviewer' | 'monitor'
  status: 'idle' | 'busy' | 'error'
  tasks: number
  performance: number
  model?: string
}

// Custom node component for agents
const AgentNode = ({ data }: { data: Agent }) => {
  const statusColors = {
    idle: 'border-green-500',
    busy: 'border-yellow-500',
    error: 'border-red-500',
  }

  const typeColors = {
    researcher: 'bg-blue-900',
    architect: 'bg-purple-900',
    coder: 'bg-green-900',
    tester: 'bg-orange-900',
    reviewer: 'bg-pink-900',
    monitor: 'bg-gray-700',
  }

  return (
    <div className={`bg-black border-2 ${statusColors[data.status]} rounded-lg p-4 min-w-[200px] shadow-lg`}>
      <div className={`text-xs px-2 py-1 rounded ${typeColors[data.type]} text-green-400 mb-2`}>
        {data.type.toUpperCase()}
      </div>
      <div className="text-green-400 font-bold text-sm mb-1">{data.name}</div>
      <div className="text-green-300 text-xs mb-2">{data.model || 'GPT-4'}</div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-500">Tasks: {data.tasks}</span>
        <span className="text-green-500">Perf: {data.performance}%</span>
      </div>
      {data.status === 'busy' && (
        <div className="mt-2 text-yellow-400 text-xs animate-pulse">
          Processing...
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  agent: AgentNode,
}

function SwarmView() {
  const { agents, addAgent, removeAgent, updateAgentStatus } = useSwarmStore()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [mastraAgents, setMastraAgents] = useState<Record<string, any>>({})
  const [newAgentType, setNewAgentType] = useState<Agent['type']>('researcher')

  // Load Mastra agents
  useEffect(() => {
    const loadMastraAgents = async () => {
      const client = getMastraClient()
      const agents = await client.getAgents()
      const agentMap: Record<string, any> = {}
      agents.forEach(agent => {
        agentMap[agent.name] = agent
      })
      setMastraAgents(agentMap)
    }
    loadMastraAgents()
  }, [])

  // Update nodes when agents change
  useEffect(() => {
    const newNodes: Node[] = agents.map((agent, index) => {
      const angle = (index / agents.length) * 2 * Math.PI
      const radius = 250
      const x = 400 + radius * Math.cos(angle)
      const y = 300 + radius * Math.sin(angle)

      return {
        id: agent.id,
        type: 'agent',
        position: { x, y },
        data: agent,
      }
    })
    setNodes(newNodes)

    // Create mesh topology - all agents connected to each other
    const newEdges: Edge[] = []
    agents.forEach((agent1, i) => {
      agents.forEach((agent2, j) => {
        if (i < j) {
          newEdges.push({
            id: `${agent1.id}-${agent2.id}`,
            source: agent1.id,
            target: agent2.id,
            type: 'smoothstep',
            animated: agent1.status === 'busy' || agent2.status === 'busy',
            style: {
              stroke: '#00ff00',
              strokeWidth: 1,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#00ff00',
            },
          })
        }
      })
    })
    setEdges(newEdges)
  }, [agents, setNodes, setEdges])

  const handleAddAgent = () => {
    const id = `agent-${Date.now()}`
    const mastraAgent = mastraAgents[newAgentType]
    addAgent({
      id,
      name: `${newAgentType.toUpperCase()}-${agents.length + 1}`,
      type: newAgentType,
      status: 'idle',
      tasks: 0,
      performance: 100,
      model: mastraAgent?.model?.name || 'Unknown',
    })
  }

  const handleRemoveAgent = (id: string) => {
    removeAgent(id)
  }

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedAgent(node.id)
  }, [])

  const simulateActivity = () => {
    agents.forEach(agent => {
      const random = Math.random()
      if (random > 0.7) {
        updateAgentStatus(agent.id, 'busy')
        setTimeout(() => {
          updateAgentStatus(agent.id, 'idle')
        }, 3000)
      }
    })
  }

  return (
    <div className="w-full h-full bg-black text-green-400 font-mono">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-2 animate-pulse">SWARM MANAGEMENT</h1>
        <p className="text-green-300 mb-6">Real-time agent coordination and topology visualization</p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Controls */}
          <Card className="bg-black border-green-500">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Spawn Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={newAgentType}
                onChange={(e) => setNewAgentType(e.target.value as Agent['type'])}
                className="w-full mb-2 bg-black border border-green-500 text-green-400 p-2 rounded"
              >
                <option value="researcher">Researcher</option>
                <option value="architect">Architect</option>
                <option value="coder">Coder</option>
                <option value="tester">Tester</option>
                <option value="reviewer">Reviewer</option>
                <option value="monitor">Monitor</option>
              </select>
              <Button
                onClick={handleAddAgent}
                className="w-full bg-green-500 hover:bg-green-600 text-black"
              >
                Spawn
              </Button>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card className="bg-black border-green-500">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <span className="text-sm">{agent.name}</span>
                    <Button
                      onClick={() => handleRemoveAgent(agent.id)}
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-black border-green-500">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={simulateActivity}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black mb-2"
              >
                <Play className="w-4 h-4 mr-2" />
                Simulate Activity
              </Button>
              <Button
                onClick={() => setNodes([])}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white"
              >
                Change Topology
              </Button>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="bg-black border-green-500">
            <CardHeader>
              <CardTitle className="text-green-400">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Agents: {agents.length}/8</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-500" />
                  <span>Active: {agents.filter(a => a.status === 'busy').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Tasks: {agents.reduce((sum, a) => sum + a.tasks, 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Topology View */}
        <div className="relative">
          <div className="absolute top-4 left-4 z-10">
            <Badge className="bg-green-500 text-black">
              MESH TOPOLOGY
            </Badge>
          </div>
          <div className="h-[600px] border-2 border-green-500 rounded-lg overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              className="bg-black"
            >
              <Background color="#00ff00" gap={20} />
              <Controls className="bg-black border-green-500" />
              <MiniMap
                nodeStrokeColor="#00ff00"
                nodeColor="#000000"
                nodeBorderRadius={8}
                className="bg-black border-green-500"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Mastra Agents Info */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {Object.entries(mastraAgents).map(([name, agent]) => (
            <Card key={name} className="bg-black border-green-500">
              <CardHeader>
                <CardTitle className="text-green-400 text-lg">{agent.name}</CardTitle>
                <CardDescription className="text-green-300">
                  {agent.model?.provider} - {agent.model?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-400">{agent.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SwarmView
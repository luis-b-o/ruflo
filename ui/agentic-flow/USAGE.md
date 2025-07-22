# Agentic-Flow UI Usage Guide

## 🚀 Quick Start

### Launch the UI

There are three ways to launch the Agentic-Flow UI:

1. **Standalone UI Command**
   ```bash
   claude-flow ui
   ```

2. **With Start Command**
   ```bash
   claude-flow start --vite
   ```

3. **With Options**
   ```bash
   claude-flow ui --port 5173 --open
   ```

### UI Command Options

- `--port, -p <number>`: Port to run the UI server (default: 5173)
- `--host, -h <string>`: Host to bind the server (default: localhost)
- `--open, -o`: Automatically open browser
- `--mode, -m <dev|prod>`: Development or production mode

## 🖥️ Interface Overview

### Main Dashboard
The dashboard provides real-time monitoring of your HiveMind swarm:

- **Swarm Status**: Active/Inactive state with topology visualization
- **Agent Grid**: Shows all 5 agents with their current status and tasks
- **Performance Metrics**: Token usage, execution time, and efficiency
- **System Health**: CPU, memory, and network usage

### Navigation

- **Dashboard** (`/`): Main overview and system status
- **Swarm** (`/swarm`): Detailed swarm management and topology view
- **MCP Tools** (`/mcp-tools`): Browse and execute 71+ MCP tools
- **Terminal** (`/terminal`): Integrated terminal for direct commands

## 🎮 Features

### 1. HiveMind Dashboard
- Real-time 5-agent swarm visualization
- Mesh topology network graph
- Queen status and consensus indicators
- Agent activity monitoring
- Task distribution view

### 2. Mastra AI Integration
- Pre-configured AI agents:
  - Researcher Agent
  - Architect Agent
  - Coder Agent
  - Tester Agent
  - Reviewer Agent
- Custom agent creation
- Agent capability matrix

### 3. MCP Tools Interface
- Browse all 71+ available tools
- Visual parameter builders
- Real-time execution monitoring
- Result visualization
- Tool chain creation

### 4. Retro Console Theme
- Monochrome green phosphor display (#00ff00)
- CRT monitor effects with scanlines
- ASCII art borders and decorations
- Terminal-style interactions
- Glitch and glow effects

## 🔧 Configuration

### Environment Variables

Set these before launching the UI:

```bash
export MCP_SERVER_URL=http://localhost:3000
export HIVE_MIND_URL=ws://localhost:8080
```

### Custom Configuration

Create a `.env` file in the UI directory:

```env
VITE_MCP_SERVER_URL=http://localhost:3000
VITE_HIVE_MIND_URL=ws://localhost:8080
VITE_API_TIMEOUT=30000
VITE_ENABLE_MOCK_DATA=false
```

## 📡 WebSocket Events

The UI connects to the HiveMind system via WebSocket for real-time updates:

- `swarm:status` - Swarm state changes
- `agent:update` - Agent status updates
- `task:progress` - Task execution progress
- `consensus:reached` - Consensus decisions
- `memory:sync` - Memory synchronization

## 🎨 UI Components

### Retro Components
- **ConsoleFrame**: CRT monitor frame with curvature
- **RetroButton**: Phosphor green glowing buttons
- **RetroInput**: Terminal-style input fields
- **RetroPanel**: ASCII-bordered panels
- **GlowText**: Animated glowing text
- **ASCIIBorder**: Box-drawing borders

### HiveMind Components
- **SwarmDashboard**: Main swarm control center
- **AgentCard**: Individual agent status cards
- **TopologyView**: Interactive topology visualization
- **ConsensusIndicator**: Consensus algorithm status

## 🛠️ Development

### Run in Development Mode
```bash
cd ui/agentic-flow
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

### Testing
```bash
npm run test
npm run test:ui
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   claude-flow ui --port 5174
   ```

2. **Cannot Connect to HiveMind**
   - Ensure HiveMind is running: `claude-flow hive-mind start`
   - Check WebSocket URL configuration

3. **Blank Screen**
   - Check browser console for errors
   - Ensure all dependencies are installed: `npm install`

4. **Slow Performance**
   - Disable CRT effects in settings
   - Reduce animation intensity
   - Use production mode: `--mode production`

## 🎯 Usage Examples

### Basic Swarm Management
```bash
# Start UI with swarm
claude-flow start --vite --swarm

# Open UI in browser
claude-flow ui --open

# Custom port and host
claude-flow ui --port 8080 --host 0.0.0.0
```

### Advanced Configuration
```bash
# Production mode with custom settings
MCP_SERVER_URL=https://api.example.com \
HIVE_MIND_URL=wss://hive.example.com \
claude-flow ui --mode production --port 443
```

## 🔗 Integration

The UI integrates with:
- **HiveMind**: Real-time swarm coordination
- **MCP Server**: Tool execution and management
- **Mastra Agents**: AI agent orchestration
- **Memory System**: Persistent storage access
- **GitHub Integration**: Repository management

## 📚 Additional Resources

- [Architecture Documentation](../../docs/UI_ARCHITECTURE.md)
- [Component Library](./src/components/README.md)
- [API Reference](../../docs/API.md)
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md)

---

For more information, visit the [Claude-Flow Documentation](https://github.com/ruvnet/claude-flow).
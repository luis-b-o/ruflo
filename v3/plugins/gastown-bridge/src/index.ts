/**
 * Gas Town Bridge Plugin - Main Entry Point
 *
 * GasTownBridgePlugin class implementing the IPlugin interface:
 * - register(): Register with claude-flow plugin system
 * - initialize(): Load WASM modules, set up bridges
 * - shutdown(): Cleanup resources
 *
 * Provides integration with Steve Yegge's Gas Town orchestrator:
 * - Beads: Git-backed issue tracking with graph semantics
 * - Formulas: TOML-defined workflows (convoy, workflow, expansion, aspect)
 * - Convoys: Work-order tracking for slung work
 * - WASM: 352x faster formula parsing and graph analysis
 *
 * @module gastown-bridge
 * @version 0.1.0
 */

import { EventEmitter } from 'events';

import type {
  Bead,
  Formula,
  Convoy,
  GasTownConfig,
  CreateBeadOptions,
  CreateConvoyOptions,
  SlingOptions,
  SyncResult,
  TopoSortResult,
  CriticalPathResult,
  BeadGraph,
  FormulaType,
  CookedFormula,
} from './types.js';

import {
  DEFAULT_CONFIG,
  GasTownErrorCodes,
  validateConfig,
} from './types.js';

// Bridge imports
import { GtBridge, createGtBridge } from './bridges/gt-bridge.js';
import { BdBridge, createBdBridge } from './bridges/bd-bridge.js';
import { SyncBridge, createSyncBridge } from './bridges/sync-bridge.js';

// Formula executor
import { FormulaExecutor, createFormulaExecutor, type IWasmLoader } from './formula/executor.js';

// Convoy management
import { ConvoyTracker, createConvoyTracker } from './convoy/tracker.js';
import { ConvoyObserver, createConvoyObserver, type WasmGraphModule } from './convoy/observer.js';

// WASM loader
import {
  isWasmAvailable,
  loadFormulaWasm,
  loadGnnWasm,
  parseFormula as wasmParseFormula,
  cookFormula as wasmCookFormula,
  cookBatch as wasmCookBatch,
  topoSort as wasmTopoSort,
  detectCycles as wasmDetectCycles,
  criticalPath as wasmCriticalPath,
  preloadWasmModules,
  getWasmVersions,
} from './wasm-loader.js';

// MCP Tools
import {
  gasTownBridgeTools,
  toolHandlers,
  toolCategories,
  getTool,
  getToolsByLayer,
  type MCPTool,
  type ToolContext,
  type MCPToolResult,
} from './mcp-tools.js';

// Errors
import {
  GasTownError,
  GasTownErrorCode,
} from './errors.js';

// ============================================================================
// Plugin Interfaces (matching claude-flow plugin system)
// ============================================================================

/**
 * Plugin context interface
 */
export interface PluginContext {
  get<T>(key: string): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
}

/**
 * MCP Tool definition for plugin interface
 */
export interface PluginMCPTool {
  name: string;
  description: string;
  category: string;
  version: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (
    input: unknown,
    context: PluginContext
  ) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

/**
 * Hook priority type
 */
export type HookPriority = number;

/**
 * Plugin hook definition
 */
export interface PluginHook {
  name: string;
  event: string;
  priority: HookPriority;
  description: string;
  handler: (context: PluginContext, payload: unknown) => Promise<unknown>;
}

/**
 * Plugin interface
 */
export interface IPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  register(context: PluginContext): Promise<void>;
  initialize(context: PluginContext): Promise<{ success: boolean; error?: string }>;
  shutdown(context: PluginContext): Promise<{ success: boolean; error?: string }>;
  getCapabilities(): string[];
  getMCPTools(): PluginMCPTool[];
  getHooks(): PluginHook[];
}

// ============================================================================
// Bridge Interfaces
// ============================================================================

/**
 * Gas Town CLI bridge interface
 */
export interface IGasTownBridge {
  gt(args: string[]): Promise<string>;
  bd(args: string[]): Promise<string>;
  createBead(opts: CreateBeadOptions): Promise<Bead>;
  getReady(limit?: number, rig?: string): Promise<Bead[]>;
  showBead(beadId: string): Promise<Bead>;
  addDep(child: string, parent: string): Promise<void>;
  removeDep(child: string, parent: string): Promise<void>;
  sling(opts: SlingOptions): Promise<void>;
}

/**
 * Formula engine interface
 */
export interface IFormulaEngine {
  parse(content: string): Formula;
  cook(formula: Formula, vars: Record<string, string>): Formula;
  toMolecule(formula: Formula, bridge: IGasTownBridge): Promise<string[]>;
}

/**
 * WASM bridge interface
 */
export interface IWasmBridge {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  dispose(): Promise<void>;
  parseFormula(content: string): Formula;
  cookFormula(formula: Formula, vars: Record<string, string>): Formula;
  resolveDeps(beads: Bead[]): TopoSortResult;
  detectCycle(graph: BeadGraph): boolean;
  criticalPath(beads: Bead[], durations: Map<string, number>): CriticalPathResult;
  batchCook(formulas: Formula[], vars: Record<string, string>[]): Formula[];
}

/**
 * Sync service interface
 */
export interface ISyncService {
  pullBeads(rig?: string): Promise<number>;
  pushTasks(namespace: string): Promise<number>;
  sync(direction: 'pull' | 'push' | 'both', rig?: string): Promise<SyncResult>;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Gas Town Bridge Plugin configuration
 */
export interface GasTownBridgeConfig {
  /** Base Gas Town configuration */
  gastown: Partial<GasTownConfig>;

  /** GtBridge configuration */
  gtBridge?: {
    /** Path to gt CLI binary */
    gtPath?: string;
    /** CLI execution timeout in ms */
    timeout?: number;
    /** Working directory */
    cwd?: string;
  };

  /** BdBridge configuration */
  bdBridge?: {
    /** Path to bd CLI binary */
    bdPath?: string;
    /** CLI execution timeout in ms */
    timeout?: number;
    /** Working directory */
    cwd?: string;
  };

  /** SyncBridge configuration */
  syncBridge?: {
    /** AgentDB namespace for beads */
    namespace?: string;
    /** Sync interval in ms */
    syncInterval?: number;
    /** Enable auto-sync */
    autoSync?: boolean;
  };

  /** FormulaExecutor configuration */
  formulaExecutor?: {
    /** Enable WASM acceleration */
    useWasm?: boolean;
    /** Step execution timeout in ms */
    stepTimeout?: number;
    /** Maximum parallel steps */
    maxParallel?: number;
  };

  /** ConvoyTracker configuration */
  convoyTracker?: {
    /** Auto-update progress on issue changes */
    autoUpdateProgress?: boolean;
    /** Progress update interval in ms */
    progressUpdateInterval?: number;
    /** Enable persistent storage */
    persistConvoys?: boolean;
    /** Storage path for convoy data */
    storagePath?: string;
  };

  /** ConvoyObserver configuration */
  convoyObserver?: {
    /** Polling interval in ms */
    pollInterval?: number;
    /** Maximum poll attempts (0 = unlimited) */
    maxPollAttempts?: number;
    /** Enable WASM for graph analysis */
    useWasm?: boolean;
  };

  /** WASM configuration */
  wasm?: {
    /** Enable WASM acceleration */
    enabled?: boolean;
    /** Preload WASM modules on init */
    preload?: boolean;
  };

  /** GUPP (Git Universal Pull/Push) adapter configuration */
  gupp?: {
    /** Enable GUPP adapter */
    enabled?: boolean;
    /** GUPP endpoint URL */
    endpoint?: string;
    /** Authentication token */
    authToken?: string;
  };

  /** Logger configuration */
  logger?: {
    /** Log level */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /** Enable structured logging */
    structured?: boolean;
  };
}

/**
 * Default plugin configuration
 */
const DEFAULT_PLUGIN_CONFIG: GasTownBridgeConfig = {
  gastown: DEFAULT_CONFIG,
  gtBridge: {
    timeout: 30000,
  },
  bdBridge: {
    timeout: 30000,
  },
  syncBridge: {
    namespace: 'gastown:beads',
    syncInterval: 60000,
    autoSync: false,
  },
  formulaExecutor: {
    useWasm: true,
    stepTimeout: 60000,
    maxParallel: 4,
  },
  convoyTracker: {
    autoUpdateProgress: true,
    progressUpdateInterval: 30000,
    persistConvoys: false,
    storagePath: './data/convoys',
  },
  convoyObserver: {
    pollInterval: 10000,
    maxPollAttempts: 0,
    useWasm: true,
  },
  wasm: {
    enabled: true,
    preload: true,
  },
  gupp: {
    enabled: false,
  },
  logger: {
    level: 'info',
    structured: false,
  },
};

// ============================================================================
// GUPP Adapter (Stub)
// ============================================================================

/**
 * GUPP (Git Universal Pull/Push) Adapter
 *
 * Provides integration with external Git services for cross-repository
 * bead synchronization. This is a stub implementation - full implementation
 * would connect to GUPP services.
 */
export interface IGuppAdapter {
  /** Check if GUPP is available */
  isAvailable(): boolean;
  /** Pull beads from remote */
  pull(options?: { rig?: string; since?: Date }): Promise<Bead[]>;
  /** Push beads to remote */
  push(beads: Bead[]): Promise<{ pushed: number; errors: string[] }>;
  /** Sync with remote */
  sync(): Promise<{ pulled: number; pushed: number; conflicts: string[] }>;
}

/**
 * GUPP Adapter stub implementation
 */
class GuppAdapterStub implements IGuppAdapter {
  private enabled: boolean;
  private endpoint?: string;

  constructor(config?: GasTownBridgeConfig['gupp']) {
    this.enabled = config?.enabled ?? false;
    this.endpoint = config?.endpoint;
  }

  isAvailable(): boolean {
    return this.enabled && !!this.endpoint;
  }

  async pull(_options?: { rig?: string; since?: Date }): Promise<Bead[]> {
    if (!this.isAvailable()) {
      return [];
    }
    // Stub: Would connect to GUPP endpoint
    console.warn('[GUPP] Pull not implemented - stub adapter');
    return [];
  }

  async push(_beads: Bead[]): Promise<{ pushed: number; errors: string[] }> {
    if (!this.isAvailable()) {
      return { pushed: 0, errors: ['GUPP not configured'] };
    }
    // Stub: Would connect to GUPP endpoint
    console.warn('[GUPP] Push not implemented - stub adapter');
    return { pushed: 0, errors: ['Not implemented'] };
  }

  async sync(): Promise<{ pulled: number; pushed: number; conflicts: string[] }> {
    if (!this.isAvailable()) {
      return { pulled: 0, pushed: 0, conflicts: [] };
    }
    // Stub: Would connect to GUPP endpoint
    console.warn('[GUPP] Sync not implemented - stub adapter');
    return { pulled: 0, pushed: 0, conflicts: [] };
  }
}

// ============================================================================
// Logger
// ============================================================================

interface PluginLogger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

function createPluginLogger(config?: GasTownBridgeConfig['logger']): PluginLogger {
  const level = config?.level ?? 'info';
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[level];

  const log = (msgLevel: keyof typeof levels, msg: string, meta?: Record<string, unknown>) => {
    if (levels[msgLevel] >= currentLevel) {
      const prefix = `[gastown-bridge:${msgLevel}]`;
      if (config?.structured) {
        console.log(JSON.stringify({ level: msgLevel, msg, ...meta, timestamp: new Date().toISOString() }));
      } else {
        console.log(`${prefix} ${msg}`, meta ?? '');
      }
    }
  };

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
  };
}

// ============================================================================
// WASM Loader Adapter
// ============================================================================

/**
 * Adapter to make wasm-loader work with FormulaExecutor's IWasmLoader interface
 */
class WasmLoaderAdapter implements IWasmLoader {
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      await loadFormulaWasm();
      await loadGnnWasm();
      this.initialized = true;
    } catch {
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized && isWasmAvailable();
  }

  parseFormula(content: string): Formula {
    return wasmParseFormula(content);
  }

  cookFormula(formula: Formula, vars: Record<string, string>): CookedFormula {
    const cooked = wasmCookFormula(formula, vars);
    return {
      ...cooked,
      cookedAt: new Date(),
      cookedVars: vars,
      originalName: formula.name,
    };
  }

  batchCook(formulas: Formula[], varsArray: Record<string, string>[]): CookedFormula[] {
    return wasmCookBatch(formulas, varsArray).map((cooked, i) => ({
      ...cooked,
      cookedAt: new Date(),
      cookedVars: varsArray[i] ?? {},
      originalName: formulas[i]?.name ?? 'unknown',
    }));
  }

  resolveStepDependencies(steps: Array<{ id: string; needs?: string[] }>): typeof steps {
    const result = wasmTopoSort(steps.map(s => ({
      id: s.id,
      dependencies: s.needs ?? [],
    })));
    if (result.hasCycle) {
      throw new GasTownError(
        'Cycle detected in step dependencies',
        GasTownErrorCode.DEPENDENCY_CYCLE,
        { cycleNodes: result.cycleNodes }
      );
    }
    // Return steps in sorted order
    const stepMap = new Map(steps.map(s => [s.id, s]));
    return result.sorted.map(id => stepMap.get(id)).filter(Boolean) as typeof steps;
  }

  detectCycle(steps: Array<{ id: string; needs?: string[] }>): { hasCycle: boolean; cycleSteps?: string[] } {
    const result = wasmDetectCycles(steps.map(s => ({
      id: s.id,
      dependencies: s.needs ?? [],
    })));
    return {
      hasCycle: result.hasCycle,
      cycleSteps: result.cycleNodes,
    };
  }
}

// ============================================================================
// Plugin Implementation
// ============================================================================

/**
 * Gas Town Bridge Plugin for Claude Flow V3
 *
 * Provides integration with Gas Town orchestrator:
 * - 5 Beads MCP tools (CLI-based)
 * - 3 Convoy MCP tools
 * - 4 Formula MCP tools (WASM-accelerated)
 * - 5 WASM computation tools
 * - 3 Orchestration tools
 */
export class GasTownBridgePlugin extends EventEmitter implements IPlugin {
  readonly name = '@claude-flow/plugin-gastown-bridge';
  readonly version = '0.1.0';
  readonly description =
    'Gas Town orchestrator integration with WASM-accelerated formula parsing and graph analysis';

  private config: GasTownBridgeConfig;
  private pluginContext: PluginContext | null = null;
  private logger: PluginLogger;

  // Component instances
  private gtBridge: GtBridge | null = null;
  private bdBridge: BdBridge | null = null;
  private syncBridge: SyncBridge | null = null;
  private formulaExecutor: FormulaExecutor | null = null;
  private convoyTracker: ConvoyTracker | null = null;
  private convoyObserver: ConvoyObserver | null = null;
  private wasmLoader: WasmLoaderAdapter | null = null;
  private guppAdapter: IGuppAdapter | null = null;

  // State
  private wasmInitialized = false;
  private cliAvailable = false;
  private initialized = false;

  constructor(config?: Partial<GasTownBridgeConfig>) {
    super();
    this.config = this.mergeConfig(DEFAULT_PLUGIN_CONFIG, config);
    this.logger = createPluginLogger(this.config.logger);
  }

  /**
   * Register the plugin with claude-flow
   */
  async register(context: PluginContext): Promise<void> {
    this.pluginContext = context;

    // Register plugin in context
    context.set('gastown-bridge', this);
    context.set('gt.version', this.version);
    context.set('gt.capabilities', this.getCapabilities());

    this.logger.info('Plugin registered', { version: this.version });
  }

  /**
   * Initialize the plugin (load WASM, set up bridges)
   */
  async initialize(context: PluginContext): Promise<{ success: boolean; error?: string }> {
    if (this.initialized) {
      return { success: true };
    }

    try {
      this.logger.info('Initializing Gas Town Bridge Plugin...');

      // Step 1: Initialize WASM loader if enabled
      if (this.config.wasm?.enabled) {
        await this.initializeWasm();
      }

      // Step 2: Check CLI availability
      this.cliAvailable = await this.checkCliAvailable();
      if (!this.cliAvailable) {
        this.logger.warn('CLI tools (gt, bd) not found. Some features will be unavailable.');
      }

      // Step 3: Initialize bridges
      await this.initializeBridges();

      // Step 4: Initialize formula executor
      await this.initializeFormulaExecutor();

      // Step 5: Initialize convoy tracker and observer
      await this.initializeConvoyComponents();

      // Step 6: Initialize GUPP adapter
      this.initializeGuppAdapter();

      // Store instances in plugin context
      context.set('gt.config', this.config);
      context.set('gt.wasmReady', this.wasmInitialized);
      context.set('gt.cliAvailable', this.cliAvailable);
      context.set('gt.bridges', {
        gt: this.gtBridge,
        bd: this.bdBridge,
        sync: this.syncBridge,
      });
      context.set('gt.executor', this.formulaExecutor);
      context.set('gt.tracker', this.convoyTracker);
      context.set('gt.observer', this.convoyObserver);
      context.set('gt.gupp', this.guppAdapter);

      this.initialized = true;
      this.emit('initialized');

      this.logger.info('Plugin initialized successfully', {
        wasmReady: this.wasmInitialized,
        cliAvailable: this.cliAvailable,
        toolCount: this.getMCPTools().length,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to initialize plugin', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Shutdown the plugin (cleanup resources)
   */
  async shutdown(_context: PluginContext): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info('Shutting down Gas Town Bridge Plugin...');

      // Cleanup convoy observer
      if (this.convoyObserver) {
        this.convoyObserver.dispose();
        this.convoyObserver = null;
      }

      // Cleanup convoy tracker
      if (this.convoyTracker) {
        this.convoyTracker.dispose();
        this.convoyTracker = null;
      }

      // Cleanup sync bridge
      if (this.syncBridge) {
        await this.syncBridge.dispose();
        this.syncBridge = null;
      }

      // Cleanup bridges
      this.gtBridge = null;
      this.bdBridge = null;

      // Cleanup WASM resources
      this.wasmLoader = null;
      this.wasmInitialized = false;

      // Reset state
      this.pluginContext = null;
      this.initialized = false;

      this.emit('shutdown');
      this.removeAllListeners();

      this.logger.info('Plugin shutdown complete');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to shutdown plugin', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get plugin capabilities
   */
  getCapabilities(): string[] {
    return [
      'beads-integration',
      'convoy-tracking',
      'formula-parsing',
      'formula-cooking',
      'formula-execution',
      'wasm-acceleration',
      'dependency-resolution',
      'topological-sort',
      'cycle-detection',
      'critical-path',
      'agentdb-sync',
      'sling-operations',
      'gupp-adapter',
    ];
  }

  /**
   * Get plugin MCP tools
   */
  getMCPTools(): PluginMCPTool[] {
    // Convert MCPTool to PluginMCPTool format
    return gasTownBridgeTools.map(tool => this.convertMcpTool(tool));
  }

  /**
   * Get plugin hooks
   */
  getHooks(): PluginHook[] {
    return [
      this.createPreTaskHook(),
      this.createPostTaskHook(),
      this.createBeadsSyncHook(),
      this.createConvoyProgressHook(),
    ];
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the current configuration
   */
  getConfig(): GasTownBridgeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<GasTownBridgeConfig>): void {
    this.config = this.mergeConfig(this.config, config);
    if (this.config.gastown) {
      this.config.gastown = validateConfig({ ...DEFAULT_CONFIG, ...this.config.gastown });
    }
  }

  /**
   * Check if WASM is initialized
   */
  isWasmReady(): boolean {
    return this.wasmInitialized;
  }

  /**
   * Check if CLI tools are available
   */
  isCliAvailable(): boolean {
    return this.cliAvailable;
  }

  /**
   * Get bridge instances
   */
  getBridges(): { gt: GtBridge | null; bd: BdBridge | null; sync: SyncBridge | null } {
    return {
      gt: this.gtBridge,
      bd: this.bdBridge,
      sync: this.syncBridge,
    };
  }

  /**
   * Get formula executor
   */
  getFormulaExecutor(): FormulaExecutor | null {
    return this.formulaExecutor;
  }

  /**
   * Get convoy tracker
   */
  getConvoyTracker(): ConvoyTracker | null {
    return this.convoyTracker;
  }

  /**
   * Get convoy observer
   */
  getConvoyObserver(): ConvoyObserver | null {
    return this.convoyObserver;
  }

  /**
   * Get GUPP adapter
   */
  getGuppAdapter(): IGuppAdapter | null {
    return this.guppAdapter;
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    repository: string;
    keywords: string[];
    mcpTools: string[];
    capabilities: string[];
  } {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'rUv',
      license: 'MIT',
      repository: 'https://github.com/ruvnet/claude-flow',
      keywords: [
        'claude-flow',
        'plugin',
        'gastown',
        'beads',
        'orchestration',
        'workflows',
        'formulas',
        'wasm',
        'multi-agent',
      ],
      mcpTools: gasTownBridgeTools.map(t => t.name),
      capabilities: this.getCapabilities(),
    };
  }

  // ============================================================================
  // Private Methods - Initialization
  // ============================================================================

  private mergeConfig(base: GasTownBridgeConfig, override?: Partial<GasTownBridgeConfig>): GasTownBridgeConfig {
    if (!override) return { ...base };

    return {
      gastown: { ...base.gastown, ...override.gastown },
      gtBridge: { ...base.gtBridge, ...override.gtBridge },
      bdBridge: { ...base.bdBridge, ...override.bdBridge },
      syncBridge: { ...base.syncBridge, ...override.syncBridge },
      formulaExecutor: { ...base.formulaExecutor, ...override.formulaExecutor },
      convoyTracker: { ...base.convoyTracker, ...override.convoyTracker },
      convoyObserver: { ...base.convoyObserver, ...override.convoyObserver },
      wasm: { ...base.wasm, ...override.wasm },
      gupp: { ...base.gupp, ...override.gupp },
      logger: { ...base.logger, ...override.logger },
    };
  }

  private async initializeWasm(): Promise<void> {
    try {
      this.wasmLoader = new WasmLoaderAdapter();

      if (this.config.wasm?.preload) {
        await preloadWasmModules();
      }

      await this.wasmLoader.initialize();
      this.wasmInitialized = this.wasmLoader.isInitialized();

      if (this.wasmInitialized) {
        const versions = await getWasmVersions();
        this.logger.info('WASM modules initialized', { versions });
      }
    } catch (error) {
      this.logger.warn('WASM initialization failed, using JS fallback', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.wasmInitialized = false;
    }
  }

  private async checkCliAvailable(): Promise<boolean> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      await execAsync('which gt');
      await execAsync('which bd');
      return true;
    } catch {
      return false;
    }
  }

  private async initializeBridges(): Promise<void> {
    // Initialize GtBridge
    this.gtBridge = createGtBridge({
      gtPath: this.config.gtBridge?.gtPath,
      timeout: this.config.gtBridge?.timeout,
      cwd: this.config.gtBridge?.cwd,
    });
    await this.gtBridge.initialize();

    // Initialize BdBridge
    this.bdBridge = createBdBridge({
      bdPath: this.config.bdBridge?.bdPath,
      timeout: this.config.bdBridge?.timeout,
      cwd: this.config.bdBridge?.cwd,
    });
    await this.bdBridge.initialize();

    // Initialize SyncBridge
    this.syncBridge = createSyncBridge({
      bdBridge: this.bdBridge,
      namespace: this.config.syncBridge?.namespace ?? 'gastown:beads',
    });

    this.logger.debug('Bridges initialized');
  }

  private async initializeFormulaExecutor(): Promise<void> {
    if (!this.gtBridge) {
      throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
    }

    const wasmLoader = this.config.formulaExecutor?.useWasm && this.wasmLoader
      ? this.wasmLoader
      : undefined;

    this.formulaExecutor = createFormulaExecutor(
      this.gtBridge,
      wasmLoader,
      this.logger
    );

    this.logger.debug('Formula executor initialized', {
      wasmEnabled: !!wasmLoader,
    });
  }

  private async initializeConvoyComponents(): Promise<void> {
    if (!this.bdBridge) {
      throw new GasTownError('BdBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
    }

    // Initialize ConvoyTracker
    this.convoyTracker = createConvoyTracker(
      {
        bdBridge: this.bdBridge,
        autoUpdateProgress: this.config.convoyTracker?.autoUpdateProgress,
        progressUpdateInterval: this.config.convoyTracker?.progressUpdateInterval,
        persistConvoys: this.config.convoyTracker?.persistConvoys,
        storagePath: this.config.convoyTracker?.storagePath,
      },
      this.logger
    );

    // Initialize ConvoyObserver
    this.convoyObserver = createConvoyObserver(
      {
        bdBridge: this.bdBridge,
        tracker: this.convoyTracker,
        pollInterval: this.config.convoyObserver?.pollInterval,
        maxPollAttempts: this.config.convoyObserver?.maxPollAttempts,
        useWasm: this.config.convoyObserver?.useWasm,
      },
      this.logger
    );

    this.logger.debug('Convoy components initialized');
  }

  private initializeGuppAdapter(): void {
    this.guppAdapter = new GuppAdapterStub(this.config.gupp);
    this.logger.debug('GUPP adapter initialized', {
      enabled: this.guppAdapter.isAvailable(),
    });
  }

  // ============================================================================
  // Private Methods - MCP Tool Conversion
  // ============================================================================

  private convertMcpTool(tool: MCPTool): PluginMCPTool {
    return {
      name: tool.name,
      description: tool.description,
      category: tool.category,
      version: tool.version,
      inputSchema: this.zodToJsonSchema(tool.inputSchema),
      handler: async (input, context) => {
        // Create tool context from plugin context
        const toolContext = this.createToolContext(context);
        const result = await tool.handler(input, toolContext);
        return result;
      },
    };
  }

  private zodToJsonSchema(zodSchema: unknown): { type: 'object'; properties: Record<string, unknown>; required?: string[] } {
    // Simplified conversion - in production use zod-to-json-schema
    try {
      const schema = zodSchema as { _def?: { shape?: () => Record<string, unknown> } };
      if (schema._def?.shape) {
        const shape = schema._def.shape();
        const properties: Record<string, unknown> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
          const fieldSchema = value as { _def?: { typeName?: string; innerType?: unknown } };
          const typeName = fieldSchema._def?.typeName ?? 'ZodString';

          // Map Zod types to JSON Schema types
          let jsonType = 'string';
          if (typeName.includes('Number')) jsonType = 'number';
          else if (typeName.includes('Boolean')) jsonType = 'boolean';
          else if (typeName.includes('Array')) jsonType = 'array';
          else if (typeName.includes('Object')) jsonType = 'object';

          properties[key] = { type: jsonType };

          // Check if required (not optional)
          if (!typeName.includes('Optional') && !typeName.includes('Default')) {
            required.push(key);
          }
        }

        return { type: 'object', properties, required: required.length > 0 ? required : undefined };
      }
    } catch {
      // Fallback
    }

    return { type: 'object', properties: {} };
  }

  private createToolContext(pluginContext: PluginContext): ToolContext {
    const gasTownConfig = this.config.gastown ?? DEFAULT_CONFIG;

    return {
      get: <T>(key: string) => pluginContext.get<T>(key),
      set: <T>(key: string, value: T) => pluginContext.set(key, value),
      bridges: {
        gastown: this.createBridgeFacade(),
        beadsSync: this.createSyncFacade(),
        formulaWasm: this.createFormulaWasmFacade(),
        dependencyWasm: this.createDependencyWasmFacade(),
      },
      config: {
        townRoot: gasTownConfig.townRoot ?? '',
        allowedRigs: gasTownConfig.allowedRigs ?? [],
        maxBeadsLimit: 100,
        maskSecrets: true,
        enableWasm: this.wasmInitialized,
      },
    };
  }

  private createBridgeFacade(): ToolContext['bridges']['gastown'] {
    const gt = this.gtBridge;
    const bd = this.bdBridge;

    return {
      async createBead(opts) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.createBead(opts);
      },
      async getReady(limit, rig, _labels) {
        if (!bd) throw new GasTownError('BdBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return bd.getReady({ limit, rig });
      },
      async showBead(beadId) {
        if (!bd) throw new GasTownError('BdBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        const bead = await bd.getBead(beadId);
        return {
          bead: {
            id: bead.id,
            title: bead.content.slice(0, 100),
            description: bead.content,
            status: 'open' as const,
            priority: 0,
            labels: bead.tags ?? [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          dependencies: bead.parentId ? [bead.parentId] : [],
          dependents: [],
        };
      },
      async manageDependency(action, child, parent) {
        if (!bd) throw new GasTownError('BdBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        if (action === 'add') {
          await bd.addDependency(child, parent);
        } else {
          await bd.removeDependency(child, parent);
        }
      },
      async createConvoy(opts) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.createConvoy(opts);
      },
      async getConvoyStatus(convoyId, _detailed) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.getConvoyStatus(convoyId);
      },
      async trackConvoy(convoyId, action, issues) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        await gt.trackConvoy(convoyId, action, issues);
      },
      async listFormulas(_type, _includeBuiltin) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.listFormulas();
      },
      async cookFormula(formula, vars) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.cookFormula(formula, vars);
      },
      async executeFormula(formula, vars, targetAgent, dryRun) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.executeFormula(formula, vars, targetAgent, dryRun);
      },
      async createFormula(opts) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.createFormula(opts);
      },
      async sling(beadId, target, formula, priority) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        await gt.sling({ beadId, target, formula, priority });
      },
      async listAgents(_rig, _role, _includeInactive) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.listAgents();
      },
      async sendMail(to, subject, body) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.sendMail(to, subject, body);
      },
      async readMail(mailId) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.readMail(mailId);
      },
      async listMail(limit) {
        if (!gt) throw new GasTownError('GtBridge not initialized', GasTownErrorCode.NOT_INITIALIZED);
        return gt.listMail(limit);
      },
    };
  }

  private createSyncFacade(): ToolContext['bridges']['beadsSync'] {
    const sync = this.syncBridge;

    return {
      async pullBeads(_rig, _namespace) {
        if (!sync) return { synced: 0, conflicts: 0 };
        const result = await sync.pull(_rig);
        return { synced: result.synced, conflicts: result.conflicts };
      },
      async pushTasks(_namespace) {
        if (!sync) return { pushed: 0, conflicts: 0 };
        const result = await sync.push();
        return { pushed: result.pushed, conflicts: result.conflicts };
      },
    };
  }

  private createFormulaWasmFacade(): ToolContext['bridges']['formulaWasm'] {
    const loader = this.wasmLoader;

    return {
      isInitialized: () => loader?.isInitialized() ?? false,
      async initialize() {
        if (loader) await loader.initialize();
      },
      async parseFormula(content, _validate) {
        if (!loader) throw new GasTownError('WASM not initialized', GasTownErrorCode.NOT_INITIALIZED);
        const formula = loader.parseFormula(content);
        return { type: formula.type, name: formula.name, steps: formula.steps ?? [] };
      },
      async cookFormula(formula, vars, _isContent) {
        if (!loader) throw new GasTownError('WASM not initialized', GasTownErrorCode.NOT_INITIALIZED);
        const parsed = typeof formula === 'string' ? loader.parseFormula(formula) : formula;
        return loader.cookFormula(parsed, vars);
      },
      async cookBatch(formulas, vars, _continueOnError) {
        if (!loader) throw new GasTownError('WASM not initialized', GasTownErrorCode.NOT_INITIALIZED);
        const parsedFormulas = formulas.map(f => loader.parseFormula(f.content));
        const cooked = loader.batchCook(parsedFormulas, vars);
        return { cooked, errors: [] };
      },
    };
  }

  private createDependencyWasmFacade(): ToolContext['bridges']['dependencyWasm'] {
    const loader = this.wasmLoader;

    return {
      isInitialized: () => loader?.isInitialized() ?? false,
      async initialize() {
        if (loader) await loader.initialize();
      },
      async resolveDependencies(beads, action) {
        if (!loader) throw new GasTownError('WASM not initialized', GasTownErrorCode.NOT_INITIALIZED);

        const nodes = beads.map(b => ({ id: b.id, dependencies: b.dependencies ?? [] }));

        if (action === 'topo_sort') {
          const result = wasmTopoSort(nodes);
          return { action, sorted: result.sorted, hasCycle: result.hasCycle, cycleNodes: result.cycleNodes };
        } else if (action === 'cycle_detect') {
          const result = wasmDetectCycles(nodes);
          return { action, hasCycle: result.hasCycle, cycleNodes: result.cycleNodes };
        } else {
          const result = wasmCriticalPath(nodes, new Map());
          return { action, criticalPath: result.path, totalDuration: result.totalDuration };
        }
      },
      async matchPatterns(query, candidates, k, threshold) {
        // Simplified pattern matching - in production use WASM HNSW
        const matches = candidates
          .map((candidate, index) => ({
            index,
            candidate,
            similarity: this.simpleSimilarity(query, candidate),
          }))
          .filter(m => m.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, k);

        return matches;
      },
      async optimizeConvoy(convoy, strategy, _constraints) {
        if (!loader) throw new GasTownError('WASM not initialized', GasTownErrorCode.NOT_INITIALIZED);

        const nodes = convoy.trackedIssues.map(id => ({ id, dependencies: [] }));
        const sorted = wasmTopoSort(nodes);

        return {
          convoyId: convoy.id,
          strategy,
          executionOrder: sorted.sorted,
          parallelGroups: [sorted.sorted], // Simplified
          estimatedDuration: convoy.trackedIssues.length * 1000,
        };
      },
    };
  }

  private simpleSimilarity(a: string, b: string): number {
    // Simple Jaccard similarity
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  // ============================================================================
  // Hook Implementations
  // ============================================================================

  private createPreTaskHook(): PluginHook {
    return {
      name: 'gt/pre-task',
      event: 'pre-task',
      priority: 50,
      description: 'Check for related beads before task execution',
      handler: async (_context: PluginContext, payload: unknown) => {
        // Check if task matches any beads in Gas Town
        if (this.config.gastown?.autoCreateBeads) {
          this.logger.debug('Pre-task hook: checking for related beads');
        }
        return payload;
      },
    };
  }

  private createPostTaskHook(): PluginHook {
    return {
      name: 'gt/post-task',
      event: 'post-task',
      priority: 50,
      description: 'Update bead status after task completion',
      handler: async (_context: PluginContext, payload: unknown) => {
        // Update bead status if autoCreateBeads is enabled
        if (this.config.gastown?.autoCreateBeads) {
          this.logger.debug('Post-task hook: updating bead status');
        }
        return payload;
      },
    };
  }

  private createBeadsSyncHook(): PluginHook {
    return {
      name: 'gt/beads-sync',
      event: 'session-start',
      priority: 100,
      description: 'Sync beads with AgentDB on session start',
      handler: async (_context: PluginContext, payload: unknown) => {
        if (this.config.gastown?.enableBeadsSync && this.syncBridge) {
          this.logger.info('Beads sync triggered on session start');
          try {
            await this.syncBridge.sync();
          } catch (error) {
            this.logger.warn('Beads sync failed', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return payload;
      },
    };
  }

  private createConvoyProgressHook(): PluginHook {
    return {
      name: 'gt/convoy-progress',
      event: 'task-complete',
      priority: 60,
      description: 'Update convoy progress when tasks complete',
      handler: async (_context: PluginContext, payload: unknown) => {
        if (this.convoyTracker) {
          // Refresh active convoy progress
          const activeConvoys = this.convoyTracker.listConvoys('active');
          for (const convoy of activeConvoys) {
            try {
              await this.convoyTracker.getStatus(convoy.id);
            } catch {
              // Ignore errors during refresh
            }
          }
        }
        return payload;
      },
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Gas Town Bridge Plugin instance
 */
export function createGasTownBridgePlugin(config?: Partial<GasTownBridgeConfig>): GasTownBridgePlugin {
  return new GasTownBridgePlugin(config);
}

// ============================================================================
// Exports
// ============================================================================

// Re-export types
export * from './types.js';

// Re-export bridges
export * from './bridges/index.js';

// Re-export convoy module
export * from './convoy/index.js';

// Re-export formula executor
export {
  FormulaExecutor,
  createFormulaExecutor,
  type IWasmLoader,
  type ExecuteOptions,
  type StepContext,
  type StepResult,
  type Molecule,
  type ExecutionProgress,
  type ExecutorEvents,
} from './formula/executor.js';

// Re-export MCP tools
export {
  gasTownBridgeTools,
  toolHandlers,
  toolCategories,
  getTool,
  getToolsByLayer,
  type MCPTool,
  type ToolContext,
  type MCPToolResult,
} from './mcp-tools.js';

// Re-export WASM loader
export {
  // Availability check
  isWasmAvailable,
  // Formula operations
  loadFormulaWasm,
  parseFormula,
  cookFormula,
  cookBatch,
  // Graph operations
  loadGnnWasm,
  topoSort,
  detectCycles,
  criticalPath,
  // Module management
  preloadWasmModules,
  getWasmVersions,
  resetWasmCache,
  // Performance timing
  getPerformanceLog,
  clearPerformanceLog,
  // Types
  type PerformanceTiming,
  type GraphEdge,
  type NodeWeight,
  type CycleDetectionResult,
  // Default export
  default as WasmLoader,
} from './wasm-loader.js';

// Re-export security modules (explicit exports to avoid conflicts)
export {
  // Error classes
  GasTownError,
  BeadsError,
  ValidationError,
  CLIExecutionError,
  FormulaError,
  ConvoyError,
  // Error codes (aliased to avoid conflict with types.ts)
  GasTownErrorCode as ErrorCodes,
  type GasTownErrorCodeType,
  type ValidationConstraint,
  // Error utilities
  isGasTownError,
  isValidationError,
  isCLIExecutionError,
  isBeadsError,
  wrapError,
  getErrorMessage,
} from './errors.js';

export {
  // Validation functions
  validateBeadId,
  validateFormulaName,
  validateConvoyId,
  validateGtArgs,
  // Compound validators (aliased to avoid conflicts)
  validateCreateBeadOptions as validateBeadOptions,
  validateCreateConvoyOptions as validateConvoyOptions,
  validateSlingOptions as validateSling,
  // Validation schemas (aliased to avoid conflicts)
  BeadIdSchema as BeadIdValidationSchema,
  FormulaNameSchema,
  ConvoyIdSchema,
  GtArgsSchema,
  SafeStringSchema as ValidatorSafeStringSchema,
  RigNameSchema,
  PrioritySchema,
  LabelsSchema,
  // Security utilities
  containsShellMetacharacters,
  containsPathTraversal,
  isSafeArgument,
  isValidBeadId,
  isValidFormulaName,
  isValidConvoyId,
  // Constants
  MAX_LENGTHS,
  SHELL_METACHARACTERS,
  PATH_TRAVERSAL_PATTERNS,
  BEAD_ID_PATTERN,
  FORMULA_NAME_PATTERN,
  UUID_PATTERN,
  CONVOY_HASH_PATTERN,
} from './validators.js';

export {
  // Sanitization functions
  sanitizeBeadOutput,
  sanitizeFormulaOutput,
  sanitizeConvoyOutput,
  sanitizeBeadsListOutput,
  // Constants
  MAX_OUTPUT_SIZE,
  SENSITIVE_FIELD_PATTERNS,
  REDACTED_FIELDS,
  // Internal helpers (for testing)
  redactSensitiveFields,
  sanitizeString,
  sanitizePath,
  parseDate,
  sanitizeMetadata,
} from './sanitizers.js';

// Default export
export default GasTownBridgePlugin;

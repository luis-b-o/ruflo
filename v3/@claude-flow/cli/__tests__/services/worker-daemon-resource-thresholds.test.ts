/**
 * WorkerDaemon Resource Thresholds Tests
 *
 * Validates CPU-proportional defaults, config priority chain,
 * state persistence, resource gating, and input validation.
 *
 * Uses real temp directories for filesystem isolation.
 * All resource gating tests use explicit constructor config
 * to avoid host-machine dependency.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkerDaemon } from '../../src/services/worker-daemon.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir, cpus } from 'os';

describe('WorkerDaemon resource thresholds', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'worker-daemon-test-'));
    mkdirSync(join(tempDir, '.claude-flow', 'logs'), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('os');
    rmSync(tempDir, { recursive: true, force: true });
    // Clean up signal listeners to prevent MaxListenersExceededWarning
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGHUP');
  });

  // =========================================================================
  // Smart CPU-proportional defaults
  // =========================================================================
  describe('smart CPU-proportional defaults', () => {
    it('should compute maxCpuLoad as max(cpuCount * 0.8, 2.0)', () => {
      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      const cpuCount = cpus().length || 1;
      const expected = Math.max(cpuCount * 0.8, 2.0);

      expect(config.resourceThresholds.maxCpuLoad).toBeCloseTo(expected, 1);
    });

    it('should always be at least 2.0 regardless of CPU count', () => {
      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBeGreaterThanOrEqual(2.0);
    });

    it('should scale above 2.0 on multi-core machines', () => {
      const cpuCount = cpus().length;
      if (cpuCount <= 3) return; // skip on small machines

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBeGreaterThan(2.0);
    });
  });

  // =========================================================================
  // Resource gating via canRunWorker
  // =========================================================================
  describe('resource gating', () => {
    it('should allow workers when CPU load is below threshold', async () => {
      // Explicitly set threshold — decoupled from host machine
      const daemon = new WorkerDaemon(tempDir, {
        resourceThresholds: { maxCpuLoad: 9.6, minFreeMemoryPercent: 20 },
      });

      vi.doMock('os', () => ({
        default: {
          loadavg: () => [3.5, 3.0, 2.5],
          totalmem: () => 16e9,
          freemem: () => 8e9, // 50% free
        },
        loadavg: () => [3.5, 3.0, 2.5],
        totalmem: () => 16e9,
        freemem: () => 8e9,
      }));

      const result = await (daemon as any).canRunWorker();
      expect(result.allowed).toBe(true);
    });

    it('should block workers when CPU load exceeds threshold', async () => {
      const daemon = new WorkerDaemon(tempDir, {
        resourceThresholds: { maxCpuLoad: 2.0, minFreeMemoryPercent: 5 },
      });

      vi.doMock('os', () => ({
        default: {
          loadavg: () => [5.0, 4.0, 3.0],
          totalmem: () => 16e9,
          freemem: () => 8e9,
        },
        loadavg: () => [5.0, 4.0, 3.0],
        totalmem: () => 16e9,
        freemem: () => 8e9,
      }));

      const result = await (daemon as any).canRunWorker();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('CPU');
    });

    it('should block workers when free memory is below threshold', async () => {
      const daemon = new WorkerDaemon(tempDir, {
        resourceThresholds: { maxCpuLoad: 100, minFreeMemoryPercent: 50 },
      });

      vi.doMock('os', () => ({
        default: {
          loadavg: () => [0.5, 0.5, 0.5],
          totalmem: () => 16e9,
          freemem: () => 1e9, // ~6% free — below 50% threshold
        },
        loadavg: () => [0.5, 0.5, 0.5],
        totalmem: () => 16e9,
        freemem: () => 1e9,
      }));

      const result = await (daemon as any).canRunWorker();
      expect(result.allowed).toBe(false);
      expect(result.reason.toLowerCase()).toContain('memory');
    });
  });

  // =========================================================================
  // Config file reading
  // =========================================================================
  describe('config.json reading', () => {
    it('should read daemon settings from flat dot-notation keys', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        'daemon.resourceThresholds.maxCpuLoad': 10,
        'daemon.resourceThresholds.minFreeMemoryPercent': 25,
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBe(10);
      expect(config.resourceThresholds.minFreeMemoryPercent).toBe(25);
    });

    it('should read daemon settings from scopes.project', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        scopes: {
          project: {
            'daemon.resourceThresholds.maxCpuLoad': 12,
          },
        },
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBe(12);
    });

    it('should handle malformed config.json gracefully', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, '{ invalid json !!!');

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBeGreaterThanOrEqual(2.0);
      expect(config.resourceThresholds.minFreeMemoryPercent).toBe(20);
    });
  });

  // =========================================================================
  // Config priority chain
  // =========================================================================
  describe('config priority: constructor arg > config.json > smart default', () => {
    it('should prefer constructor arg over config.json', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        'daemon.resourceThresholds.maxCpuLoad': 10,
      }));

      const daemon = new WorkerDaemon(tempDir, {
        resourceThresholds: { maxCpuLoad: 15, minFreeMemoryPercent: 5 },
      });
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBe(15);
    });

    it('should prefer config.json over smart default', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        'daemon.resourceThresholds.maxCpuLoad': 42,
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBe(42);
    });
  });

  // =========================================================================
  // State persistence
  // =========================================================================
  describe('state persistence', () => {
    it('should restore resourceThresholds from daemon-state.json', () => {
      const stateFile = join(tempDir, '.claude-flow', 'daemon-state.json');
      writeFileSync(stateFile, JSON.stringify({
        running: false,
        workers: {},
        config: {
          resourceThresholds: { maxCpuLoad: 8.0, minFreeMemoryPercent: 15 },
          workers: [],
        },
        savedAt: new Date().toISOString(),
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBe(8.0);
      expect(config.resourceThresholds.minFreeMemoryPercent).toBe(15);
    });

    it('should restore maxConcurrent and workerTimeoutMs from state', () => {
      const stateFile = join(tempDir, '.claude-flow', 'daemon-state.json');
      writeFileSync(stateFile, JSON.stringify({
        running: false,
        workers: {},
        config: {
          maxConcurrent: 6,
          workerTimeoutMs: 600000,
          resourceThresholds: { maxCpuLoad: 10.0, minFreeMemoryPercent: 10 },
          workers: [],
        },
        savedAt: new Date().toISOString(),
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.maxConcurrent).toBe(6);
      expect(config.workerTimeoutMs).toBe(600000);
    });

    it('should reject invalid values from saved state', () => {
      const stateFile = join(tempDir, '.claude-flow', 'daemon-state.json');
      writeFileSync(stateFile, JSON.stringify({
        running: false,
        workers: {},
        config: {
          resourceThresholds: { maxCpuLoad: -10, minFreeMemoryPercent: 200 },
          maxConcurrent: 0,
          workerTimeoutMs: -500,
          workers: [],
        },
        savedAt: new Date().toISOString(),
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBeGreaterThan(0);
      expect(config.resourceThresholds.minFreeMemoryPercent).toBeLessThanOrEqual(100);
      expect(config.maxConcurrent).toBeGreaterThan(0);
      expect(config.workerTimeoutMs).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Input validation
  // =========================================================================
  describe('input validation', () => {
    it('should ignore non-numeric values in config.json', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        'daemon.resourceThresholds.maxCpuLoad': 'not-a-number',
        'daemon.resourceThresholds.minFreeMemoryPercent': null,
        'daemon.maxConcurrent': true,
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(typeof config.resourceThresholds.maxCpuLoad).toBe('number');
      expect(config.resourceThresholds.maxCpuLoad).toBeGreaterThanOrEqual(2.0);
      expect(config.resourceThresholds.minFreeMemoryPercent).toBe(20);
      expect(config.maxConcurrent).toBe(2); // default
    });

    it('should ignore negative values in config.json', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        'daemon.resourceThresholds.maxCpuLoad': -5,
        'daemon.maxConcurrent': -1,
        'daemon.workerTimeoutMs': -100,
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.maxCpuLoad).toBeGreaterThan(0);
      expect(config.maxConcurrent).toBeGreaterThan(0);
      expect(config.workerTimeoutMs).toBeGreaterThan(0);
    });

    it('should reject minFreeMemoryPercent outside 0-100 range', () => {
      const configFile = join(tempDir, '.claude-flow', 'config.json');
      writeFileSync(configFile, JSON.stringify({
        'daemon.resourceThresholds.minFreeMemoryPercent': 150,
      }));

      const daemon = new WorkerDaemon(tempDir);
      const config = daemon.getStatus().config;

      expect(config.resourceThresholds.minFreeMemoryPercent).toBeLessThanOrEqual(100);
    });
  });
});

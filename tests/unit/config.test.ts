import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig, saveConfig, getRpcUrl, getChainId, getConfigDir, getConfigFile } from '../../src/config/store';

describe('getConfigDir and getConfigFile', () => {
  test('returns config directory path', () => {
    expect(getConfigDir()).toContain('.8004-cli');
  });

  test('returns config file path', () => {
    expect(getConfigFile()).toContain('config.json');
  });
});

describe('config store', () => {
  let tmpDir: string;
  let configFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), '8004-cli-test-'));
    configFile = path.join(tmpDir, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    test('returns empty object if file does not exist', () => {
      expect(loadConfig(configFile)).toEqual({});
    });

    test('loads config from file', () => {
      fs.writeFileSync(configFile, JSON.stringify({ rpcUrl: 'https://test.rpc' }));
      expect(loadConfig(configFile).rpcUrl).toBe('https://test.rpc');
    });

    test('returns empty object on corrupted file', () => {
      fs.writeFileSync(configFile, 'not json');
      expect(loadConfig(configFile)).toEqual({});
    });
  });

  describe('saveConfig', () => {
    test('creates config file and directory', () => {
      const nestedFile = path.join(tmpDir, 'sub', 'config.json');
      saveConfig({ rpcUrl: 'https://new.rpc' }, nestedFile);
      expect(loadConfig(nestedFile).rpcUrl).toBe('https://new.rpc');
    });

    test('merges with existing config', () => {
      saveConfig({ rpcUrl: 'https://first.rpc' }, configFile);
      saveConfig({ chain: 'ethereum' }, configFile);
      const config = loadConfig(configFile);
      expect(config.rpcUrl).toBe('https://first.rpc');
      expect(config.chain).toBe('ethereum');
    });
  });

  describe('getRpcUrl', () => {
    test('returns env var if set', () => {
      const original = process.env.ERC8004_RPC_URL;
      try {
        process.env.ERC8004_RPC_URL = 'https://env.rpc';
        expect(getRpcUrl('base', configFile)).toBe('https://env.rpc');
      } finally {
        if (original !== undefined) process.env.ERC8004_RPC_URL = original;
        else delete process.env.ERC8004_RPC_URL;
      }
    });

    test('returns chain default rpc', () => {
      const original = process.env.ERC8004_RPC_URL;
      try {
        delete process.env.ERC8004_RPC_URL;
        expect(getRpcUrl('ethereum', configFile)).toBe('https://eth.llamarpc.com');
      } finally {
        if (original !== undefined) process.env.ERC8004_RPC_URL = original;
        else delete process.env.ERC8004_RPC_URL;
      }
    });

    test('defaults to base', () => {
      const original = process.env.ERC8004_RPC_URL;
      try {
        delete process.env.ERC8004_RPC_URL;
        expect(getRpcUrl(undefined, configFile)).toBe('https://mainnet.base.org');
      } finally {
        if (original !== undefined) process.env.ERC8004_RPC_URL = original;
        else delete process.env.ERC8004_RPC_URL;
      }
    });
  });

  describe('getChainId', () => {
    test('returns chain ID for known chain', () => {
      expect(getChainId('ethereum')).toBe(1);
      expect(getChainId('base')).toBe(8453);
      expect(getChainId('sepolia')).toBe(11155111);
    });

    test('defaults to base', () => {
      expect(getChainId(undefined)).toBe(8453);
    });

    test('returns base for unknown chain', () => {
      expect(getChainId('unknown-chain')).toBe(8453);
    });
  });
});

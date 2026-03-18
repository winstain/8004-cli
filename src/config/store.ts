import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CHAINS } from './contracts';

export interface Config {
  rpcUrl?: string;
  chain?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.8004-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigFile(): string {
  return CONFIG_FILE;
}

export function loadConfig(configFile?: string): Config {
  const file = configFile || CONFIG_FILE;
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      return JSON.parse(raw) as Config;
    }
  } catch {
    // Corrupted file, return defaults
  }
  return {};
}

export function saveConfig(config: Partial<Config>, configFile?: string): void {
  const file = configFile || CONFIG_FILE;
  const dir = path.dirname(file);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existing = loadConfig(file);
  const merged = { ...existing, ...config };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

export function getRpcUrl(chain?: string, configFile?: string): string {
  const envUrl = process.env.ERC8004_RPC_URL;
  if (envUrl) return envUrl;

  const config = loadConfig(configFile);

  // Use explicit chain arg, then config chain, then default to base
  const chainName = chain || config.chain || 'base';
  const resolved = CHAINS[chainName.toLowerCase()];
  if (resolved) return config.rpcUrl || resolved.rpc;

  return config.rpcUrl || CHAINS.base.rpc;
}

export function getChainId(chain?: string, configFile?: string): number {
  const config = loadConfig(configFile);
  const chainName = chain || config.chain || 'base';
  const resolved = CHAINS[chainName.toLowerCase()];
  return resolved?.id || 8453; // default Base
}

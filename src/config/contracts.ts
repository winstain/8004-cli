// ERC-8004 registry addresses — same across all deployed chains
export const CONTRACTS = {
  identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' as const,
  reputationRegistry: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63' as const,
  validationRegistry: '0x8004Cb1BF31DAf7788923b405b754f57acEB4272' as const,
} as const;

// Supported chains with their RPC defaults
export const CHAINS: Record<string, { id: number; name: string; rpc: string }> = {
  ethereum: { id: 1, name: 'Ethereum', rpc: 'https://eth.llamarpc.com' },
  base: { id: 8453, name: 'Base', rpc: 'https://mainnet.base.org' },
  sepolia: { id: 11155111, name: 'Sepolia', rpc: 'https://rpc.sepolia.org' },
  'base-sepolia': { id: 84532, name: 'Base Sepolia', rpc: 'https://sepolia.base.org' },
  polygon: { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  arbitrum: { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
  optimism: { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
  celo: { id: 42220, name: 'Celo', rpc: 'https://forno.celo.org' },
};

export function resolveChain(nameOrId: string): { id: number; name: string; rpc: string } | null {
  const lower = nameOrId.toLowerCase().trim();
  if (CHAINS[lower]) return CHAINS[lower];

  const asNum = parseInt(lower, 10);
  if (!isNaN(asNum)) {
    const match = Object.values(CHAINS).find((c) => c.id === asNum);
    if (match) return match;
  }

  return null;
}

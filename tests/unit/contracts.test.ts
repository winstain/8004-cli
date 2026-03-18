import { CONTRACTS, CHAINS, resolveChain } from '../../src/config/contracts';

describe('contracts', () => {
  test('all addresses are valid', () => {
    for (const addr of Object.values(CONTRACTS)) {
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    }
  });

  test('all addresses are unique', () => {
    const addrs = Object.values(CONTRACTS);
    expect(new Set(addrs).size).toBe(addrs.length);
  });
});

describe('CHAINS', () => {
  test('has expected chains', () => {
    expect(CHAINS.base).toBeDefined();
    expect(CHAINS.ethereum).toBeDefined();
    expect(CHAINS.sepolia).toBeDefined();
  });

  test('each chain has id, name, rpc', () => {
    for (const chain of Object.values(CHAINS)) {
      expect(chain.id).toBeGreaterThan(0);
      expect(chain.name).toBeTruthy();
      expect(chain.rpc).toMatch(/^https?:\/\//);
    }
  });
});

describe('resolveChain', () => {
  test('resolves by name', () => {
    expect(resolveChain('base')?.id).toBe(8453);
    expect(resolveChain('ethereum')?.id).toBe(1);
  });

  test('resolves by chain ID', () => {
    expect(resolveChain('8453')?.name).toBe('Base');
    expect(resolveChain('1')?.name).toBe('Ethereum');
  });

  test('case insensitive', () => {
    expect(resolveChain('BASE')?.id).toBe(8453);
  });

  test('returns null for unknown', () => {
    expect(resolveChain('unknown')).toBeNull();
    expect(resolveChain('99999')).toBeNull();
  });
});

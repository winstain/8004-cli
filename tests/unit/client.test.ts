const mockReadContract = jest.fn();
const mockGetBalance = jest.fn();

jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(() => ({
      readContract: mockReadContract,
      getBalance: mockGetBalance,
    })),
    http: jest.fn(),
  };
});

jest.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
  polygon: { id: 137, name: 'Polygon' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  optimism: { id: 10, name: 'Optimism' },
  celo: { id: 42220, name: 'Celo' },
}));

import { ERC8004Client } from '../../src/api/client';

describe('ERC8004Client', () => {
  let client: ERC8004Client;

  beforeEach(() => {
    client = new ERC8004Client('https://test.rpc', 8453);
    jest.clearAllMocks();
  });

  describe('getAgentURI', () => {
    test('returns URI string', async () => {
      mockReadContract.mockResolvedValue('ipfs://QmTest');
      const result = await client.getAgentURI(BigInt(1));
      expect(result).toBe('ipfs://QmTest');
    });
  });

  describe('getAgentOwner', () => {
    test('returns owner address', async () => {
      mockReadContract.mockResolvedValue('0xabc123');
      const result = await client.getAgentOwner(BigInt(1));
      expect(result).toBe('0xabc123');
    });
  });

  describe('getAgentWallet', () => {
    test('returns wallet address', async () => {
      mockReadContract.mockResolvedValue('0xwallet');
      const result = await client.getAgentWallet(BigInt(1));
      expect(result).toBe('0xwallet');
    });
  });

  describe('getMetadata', () => {
    test('returns metadata value', async () => {
      mockReadContract.mockResolvedValue('0xdata');
      const result = await client.getMetadata(BigInt(1), 'key');
      expect(result).toBe('0xdata');
    });
  });

  describe('getTotalAgents', () => {
    test('returns total supply', async () => {
      mockReadContract.mockResolvedValue(BigInt(42));
      const result = await client.getTotalAgents();
      expect(result).toBe(BigInt(42));
    });
  });

  describe('getReputationSummary', () => {
    test('returns summary data', async () => {
      mockReadContract.mockResolvedValue([BigInt(10), BigInt(95), 0]);
      const result = await client.getReputationSummary(BigInt(1), ['0xabc' as `0x${string}`]);
      expect(result.count).toBe(BigInt(10));
      expect(result.summaryValue).toBe(BigInt(95));
      expect(result.summaryValueDecimals).toBe(0);
    });
  });

  describe('getClients', () => {
    test('returns client addresses', async () => {
      mockReadContract.mockResolvedValue(['0xabc', '0xdef']);
      const result = await client.getClients(BigInt(1));
      expect(result).toEqual(['0xabc', '0xdef']);
    });
  });

  describe('getLastFeedbackIndex', () => {
    test('returns last index', async () => {
      mockReadContract.mockResolvedValue(BigInt(5));
      const result = await client.getLastFeedbackIndex(BigInt(1), '0xabc' as `0x${string}`);
      expect(result).toBe(BigInt(5));
    });
  });

  describe('readFeedback', () => {
    test('returns feedback data', async () => {
      mockReadContract.mockResolvedValue([BigInt(95), 0, 'excellent', 'fast', false]);
      const result = await client.readFeedback(BigInt(1), '0xabc' as `0x${string}`, BigInt(0));
      expect(result.value).toBe(BigInt(95));
      expect(result.tag1).toBe('excellent');
      expect(result.isRevoked).toBe(false);
    });
  });

  describe('getValidationStatus', () => {
    test('returns validation data', async () => {
      mockReadContract.mockResolvedValue(['0xvalidator', BigInt(1), 85, '0xhash', 'quality', BigInt(1700000000)]);
      const result = await client.getValidationStatus('0xreqhash' as `0x${string}`);
      expect(result.validatorAddress).toBe('0xvalidator');
      expect(result.response).toBe(85);
      expect(result.tag).toBe('quality');
    });
  });

  describe('getAgentValidations', () => {
    test('returns validation hashes', async () => {
      mockReadContract.mockResolvedValue(['0xhash1', '0xhash2']);
      const result = await client.getAgentValidations(BigInt(1));
      expect(result).toEqual(['0xhash1', '0xhash2']);
    });
  });

  describe('getValidationSummary', () => {
    test('returns summary', async () => {
      mockReadContract.mockResolvedValue([BigInt(5), 90]);
      const result = await client.getValidationSummary(BigInt(1), ['0xval' as `0x${string}`]);
      expect(result.count).toBe(BigInt(5));
      expect(result.avgResponse).toBe(90);
    });
  });

  describe('build transactions', () => {
    test('buildRegisterTransaction without URI', () => {
      const tx = client.buildRegisterTransaction();
      expect(tx.to).toBe('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
      expect(tx.data).toBe('register()');
    });

    test('buildRegisterTransaction with URI', () => {
      const tx = client.buildRegisterTransaction('ipfs://QmTest');
      expect(tx.data).toContain('ipfs://QmTest');
    });

    test('buildSetURITransaction', () => {
      const tx = client.buildSetURITransaction('1', 'ipfs://new');
      expect(tx.to).toBe('0x8004A169FB4a3325136EB29fA0ceB6D2e539a432');
      expect(tx.data).toContain('setAgentURI');
    });

    test('buildGiveFeedbackTransaction', () => {
      const tx = client.buildGiveFeedbackTransaction('1', 95, 0, 'excellent', 'fast');
      expect(tx.to).toBe('0x8004BAa17C55a88189AE136b182e5fdA19dE9b63');
      expect(tx.description).toContain('95');
    });

    test('buildValidationRequestTransaction', () => {
      const tx = client.buildValidationRequestTransaction('0xval', '1', 'ipfs://req', '0xhash');
      expect(tx.to).toBe('0x8004Cb1BF31DAf7788923b405b754f57acEB4272');
      expect(tx.description).toContain('agent 1');
    });
  });
});

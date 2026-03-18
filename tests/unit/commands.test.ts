jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBalance: jest.fn() })),
  http: jest.fn(),
}));

jest.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
  mainnet: { id: 1, name: 'Ethereum' },
  sepolia: { id: 11155111, name: 'Sepolia' },
  polygon: { id: 137, name: 'Polygon' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  optimism: { id: 10, name: 'Optimism' },
  celo: { id: 42220, name: 'Celo' },
}));

const mockGetAgentURI = jest.fn();
const mockGetAgentOwner = jest.fn();
const mockGetAgentWallet = jest.fn();
const mockGetTotalAgents = jest.fn();
const mockGetClients = jest.fn();
const mockGetReputationSummary = jest.fn();
const mockReadFeedback = jest.fn();
const mockGetValidationStatus = jest.fn();
const mockGetAgentValidations = jest.fn();
const mockGetValidationSummary = jest.fn();
const mockBuildRegisterTransaction = jest.fn();
const mockBuildGiveFeedbackTransaction = jest.fn();

jest.mock('../../src/api/client', () => ({
  ERC8004Client: jest.fn().mockImplementation(() => ({
    getAgentURI: mockGetAgentURI,
    getAgentOwner: mockGetAgentOwner,
    getAgentWallet: mockGetAgentWallet,
    getTotalAgents: mockGetTotalAgents,
    getClients: mockGetClients,
    getReputationSummary: mockGetReputationSummary,
    readFeedback: mockReadFeedback,
    getValidationStatus: mockGetValidationStatus,
    getAgentValidations: mockGetAgentValidations,
    getValidationSummary: mockGetValidationSummary,
    buildRegisterTransaction: mockBuildRegisterTransaction,
    buildGiveFeedbackTransaction: mockBuildGiveFeedbackTransaction,
  })),
}));

const mockGetRpcUrl = jest.fn().mockReturnValue('https://mock.rpc');
const mockGetChainId = jest.fn().mockReturnValue(8453);

jest.mock('../../src/config/store', () => ({
  getRpcUrl: (...args: any[]) => mockGetRpcUrl(...args),
  getChainId: (...args: any[]) => mockGetChainId(...args),
}));

import { makeLookupCommand } from '../../src/commands/lookup';
import { makeStatsCommand } from '../../src/commands/stats';
import { makeRegisterCommand } from '../../src/commands/register';
import { makeRateCommand } from '../../src/commands/rate';
import { makeReputationCommand } from '../../src/commands/reputation';
import { makeValidationCommand } from '../../src/commands/validation';
import { makeChainsCommand } from '../../src/commands/chains';

describe('commands', () => {
  const originalLog = console.log;
  const originalStderrWrite = process.stderr.write;
  let stdoutOutput: string[] = [];
  let stderrOutput: string[] = [];

  beforeEach(() => {
    stdoutOutput = [];
    stderrOutput = [];
    console.log = (...args: unknown[]) => { stdoutOutput.push(args.map(String).join(' ')); };
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrOutput.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    process.exitCode = undefined;

    mockGetAgentURI.mockResolvedValue('ipfs://QmTest');
    mockGetAgentOwner.mockResolvedValue('0xOwner123');
    mockGetAgentWallet.mockResolvedValue('0xWallet456');
    mockGetTotalAgents.mockResolvedValue(BigInt(100));
    mockGetClients.mockResolvedValue(['0xclient1', '0xclient2']);
    mockGetReputationSummary.mockResolvedValue({ count: BigInt(10), summaryValue: BigInt(95), summaryValueDecimals: 0 });
    mockReadFeedback.mockResolvedValue({ value: BigInt(95), valueDecimals: 0, tag1: 'good', tag2: 'fast', isRevoked: false });
    mockGetValidationStatus.mockResolvedValue({
      validatorAddress: '0xvalidator', agentId: BigInt(1), response: 85,
      responseHash: '0xhash', tag: 'quality', lastUpdate: BigInt(1700000000),
    });
    mockGetAgentValidations.mockResolvedValue(['0xhash1', '0xhash2']);
    mockGetValidationSummary.mockResolvedValue({ count: BigInt(5), avgResponse: 90 });
    mockBuildRegisterTransaction.mockReturnValue({
      to: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432', data: '0x1234', value: '0x0', description: 'Register new agent',
    });
    mockBuildGiveFeedbackTransaction.mockReturnValue({
      to: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63', data: '0xabcd', value: '0x0', description: 'Give feedback to agent 1: value=95',
    });
  });

  afterEach(() => {
    console.log = originalLog;
    process.stderr.write = originalStderrWrite;
    process.exitCode = undefined;
    jest.clearAllMocks();
  });

  describe('lookup', () => {
    test('outputs JSON by default', async () => {
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.agentId).toBe('1');
      expect(output.owner).toBe('0xOwner123');
      expect(output.wallet).toBe('0xWallet456');
    });

    test('outputs pretty format', async () => {
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Agent #1');
    });

    test('handles RPC error', async () => {
      mockGetAgentURI.mockRejectedValue(new Error('RPC fail'));
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const err = JSON.parse(stderrOutput[0]);
      expect(err.code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockGetAgentURI.mockRejectedValue(null);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const err = JSON.parse(stderrOutput[0]);
      expect(err.code).toBe('UNKNOWN');
    });

    test('handles wallet fetch failure', async () => {
      mockGetAgentWallet.mockRejectedValue(new Error('no wallet'));
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.wallet).toBeNull();
    });

    test('parses data: URI registration', async () => {
      const reg = { name: 'TestAgent', description: 'Test', active: true, services: [{ name: 'MCP', endpoint: 'https://mcp.test' }] };
      const b64 = Buffer.from(JSON.stringify(reg)).toString('base64');
      mockGetAgentURI.mockResolvedValue(`data:application/json;base64,${b64}`);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.registration.name).toBe('TestAgent');
    });

    test('parses ipfs:// URI', async () => {
      mockGetAgentURI.mockResolvedValue('ipfs://QmTest123');
      // Mock global fetch for IPFS gateway
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ name: 'IPFSAgent' }) }) as any;
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.registration.name).toBe('IPFSAgent');
      global.fetch = originalFetch;
    });

    test('handles fetch failure gracefully', async () => {
      mockGetAgentURI.mockResolvedValue('https://example.com/agent.json');
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('network error')) as any;
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.registration).toBeNull();
      global.fetch = originalFetch;
    });

    test('handles non-ok fetch response', async () => {
      mockGetAgentURI.mockResolvedValue('https://example.com/agent.json');
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: false }) as any;
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.registration).toBeNull();
      global.fetch = originalFetch;
    });

    test('pretty with registration data', async () => {
      const reg = { name: 'TestAgent', description: 'A test', active: true, services: [{ name: 'MCP', endpoint: 'https://mcp.test' }] };
      const b64 = Buffer.from(JSON.stringify(reg)).toString('base64');
      mockGetAgentURI.mockResolvedValue(`data:application/json;base64,${b64}`);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('TestAgent');
      expect(output).toContain('A test');
      expect(output).toContain('Service: MCP');
    });

    test('pretty without wallet', async () => {
      mockGetAgentWallet.mockRejectedValue(new Error('no wallet'));
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('Agent #1');
      expect(output).not.toContain('Wallet');
    });

    test('pretty with registration missing description and endpoint', async () => {
      const reg = { name: 'Agent', active: true, services: [{ name: 'MCP' }] };
      const b64 = Buffer.from(JSON.stringify(reg)).toString('base64');
      mockGetAgentURI.mockResolvedValue(`data:application/json;base64,${b64}`);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('Agent');
      expect(output).toContain('Service: MCP');
    });

    test('pretty with partial registration (no services)', async () => {
      const reg = { name: 'Partial', active: false };
      const b64 = Buffer.from(JSON.stringify(reg)).toString('base64');
      mockGetAgentURI.mockResolvedValue(`data:application/json;base64,${b64}`);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('Partial');
      expect(output).toContain('false');
    });

    test('pretty with registration missing name', async () => {
      const reg = { active: true };
      const b64 = Buffer.from(JSON.stringify(reg)).toString('base64');
      mockGetAgentURI.mockResolvedValue(`data:application/json;base64,${b64}`);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('Agent #1');
      expect(output).not.toContain('Name');
    });

    test('pretty with registration with empty services', async () => {
      const reg = { name: 'Agent', services: [] };
      const b64 = Buffer.from(JSON.stringify(reg)).toString('base64');
      mockGetAgentURI.mockResolvedValue(`data:application/json;base64,${b64}`);
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('Agent');
    });

    test('skips URI parsing for non-fetchable URIs', async () => {
      mockGetAgentURI.mockResolvedValue('urn:something:else');
      const cmd = makeLookupCommand();
      await cmd.parseAsync(['--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.registration).toBeNull();
    });
  });

  describe('stats', () => {
    test('outputs JSON by default', async () => {
      const cmd = makeStatsCommand();
      await cmd.parseAsync([], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.totalAgents).toBe('100');
      expect(output.contracts).toBeDefined();
    });

    test('outputs pretty format', async () => {
      const cmd = makeStatsCommand();
      await cmd.parseAsync(['--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('ERC-8004 Registry Statistics');
    });

    test('handles totalSupply failure gracefully', async () => {
      mockGetTotalAgents.mockRejectedValue(new Error('reverted'));
      const cmd = makeStatsCommand();
      await cmd.parseAsync([], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.totalAgents).toBe('unknown');
    });

    test('handles non-Error thrown in totalAgents', async () => {
      mockGetTotalAgents.mockImplementation(() => { throw 'oops'; });
      const cmd = makeStatsCommand();
      await cmd.parseAsync([], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.totalAgents).toBe('unknown');
    });

    test('pretty with unknown totalAgents', async () => {
      mockGetTotalAgents.mockRejectedValue(new Error('reverted'));
      const cmd = makeStatsCommand();
      await cmd.parseAsync(['--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('unknown');
    });

    test('outer catch with Error', async () => {
      mockGetChainId.mockImplementationOnce(() => { throw new Error('chain fail'); });
      const cmd = makeStatsCommand();
      await cmd.parseAsync([], { from: 'user' });
      const err = JSON.parse(stderrOutput[0]);
      expect(err.code).toBe('RPC_ERROR');
    });

    test('outer catch with non-Error', async () => {
      mockGetChainId.mockImplementationOnce(() => { throw 42; });
      const cmd = makeStatsCommand();
      await cmd.parseAsync([], { from: 'user' });
      const err = JSON.parse(stderrOutput[0]);
      expect(err.code).toBe('UNKNOWN');
    });
  });

  describe('register', () => {
    test('outputs JSON by default', async () => {
      const cmd = makeRegisterCommand();
      await cmd.parseAsync([], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.to).toContain('0x8004');
    });

    test('passes URI option', async () => {
      const cmd = makeRegisterCommand();
      await cmd.parseAsync(['--uri', 'ipfs://QmTest'], { from: 'user' });
      expect(mockBuildRegisterTransaction).toHaveBeenCalledWith('ipfs://QmTest', undefined);
    });

    test('passes from option', async () => {
      const cmd = makeRegisterCommand();
      await cmd.parseAsync(['--from', '0x1111111111111111111111111111111111111111'], { from: 'user' });
      expect(mockBuildRegisterTransaction).toHaveBeenCalledWith(
        undefined,
        '0x1111111111111111111111111111111111111111',
      );
    });

    test('outputs pretty format', async () => {
      const cmd = makeRegisterCommand();
      await cmd.parseAsync(['--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Register New Agent');
    });

    test('pretty with URI', async () => {
      const cmd = makeRegisterCommand();
      await cmd.parseAsync(['--uri', 'ipfs://QmTest', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('ipfs://QmTest');
    });

    test('handles error', async () => {
      mockBuildRegisterTransaction.mockImplementation(() => { throw new Error('fail'); });
      const cmd = makeRegisterCommand();
      await cmd.parseAsync([], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockBuildRegisterTransaction.mockImplementation(() => { throw null; });
      const cmd = makeRegisterCommand();
      await cmd.parseAsync([], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('rate', () => {
    test('outputs JSON by default', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.to).toContain('0x8004');
      expect(output.data.startsWith('0x')).toBe(true);
      expect(output.value).toBe('0x0');
    });

    test('passes from option', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync([
        '--agent',
        '1',
        '--value',
        '95',
        '--from',
        '0x1111111111111111111111111111111111111111',
      ], { from: 'user' });
      expect(mockBuildGiveFeedbackTransaction).toHaveBeenCalledWith(
        '1',
        95,
        0,
        '',
        '',
        '',
        '',
        '0x1111111111111111111111111111111111111111',
      );
    });

    test('rejects non-numeric value', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', 'abc'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('INVALID_INPUT');
    });

    test('rejects invalid decimals', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95', '--decimals', '20'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('INVALID_INPUT');
    });

    test('rejects negative decimals', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95', '--decimals', '-1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('INVALID_INPUT');
    });

    test('rejects NaN decimals', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95', '--decimals', 'abc'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('INVALID_INPUT');
    });

    test('outputs pretty format', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Rate Agent');
    });

    test('pretty with tags and endpoint', async () => {
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95', '--tag1', 'good', '--tag2', 'fast', '--endpoint', 'https://test', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('good');
      expect(output).toContain('fast');
      expect(output).toContain('https://test');
    });

    test('handles error', async () => {
      mockBuildGiveFeedbackTransaction.mockImplementation(() => { throw new Error('fail'); });
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockBuildGiveFeedbackTransaction.mockImplementation(() => { throw undefined; });
      const cmd = makeRateCommand();
      await cmd.parseAsync(['--agent', '1', '--value', '95'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('reputation summary', () => {
    test('outputs JSON by default', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['summary', '--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.feedbackCount).toBe('10');
    });

    test('outputs pretty format', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['summary', '--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Reputation');
    });

    test('uses provided client addresses', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['summary', '--agent', '1', '--clients', '0xabc,0xdef'], { from: 'user' });
      expect(mockGetReputationSummary).toHaveBeenCalled();
    });

    test('pretty with tag filters', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['summary', '--agent', '1', '--tag1', 'good', '--tag2', 'fast', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('good');
      expect(output).toContain('fast');
    });

    test('handles error', async () => {
      mockGetClients.mockRejectedValue(new Error('fail'));
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['summary', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockGetClients.mockRejectedValue(42);
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['summary', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('reputation clients', () => {
    test('outputs JSON', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['clients', '--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.clients).toEqual(['0xclient1', '0xclient2']);
    });

    test('pretty with no clients', async () => {
      mockGetClients.mockResolvedValue([]);
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['clients', '--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('No feedback clients');
    });

    test('pretty with clients', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['clients', '--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Clients for Agent');
    });

    test('handles error', async () => {
      mockGetClients.mockRejectedValue(new Error('fail'));
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['clients', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockGetClients.mockRejectedValue(false);
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['clients', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('reputation feedback', () => {
    test('outputs JSON', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['feedback', '--agent', '1', '--client', '0xabc', '--index', '0'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.value).toBe('95');
      expect(output.tag1).toBe('good');
    });

    test('pretty format', async () => {
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['feedback', '--agent', '1', '--client', '0xabc', '--index', '0', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Feedback');
    });

    test('pretty with empty tags shows (none)', async () => {
      mockReadFeedback.mockResolvedValue({ value: BigInt(50), valueDecimals: 0, tag1: '', tag2: '', isRevoked: false });
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['feedback', '--agent', '1', '--client', '0xabc', '--index', '0', '--pretty'], { from: 'user' });
      const output = stdoutOutput.join('\n');
      expect(output).toContain('(none)');
    });

    test('handles error', async () => {
      mockReadFeedback.mockRejectedValue(new Error('fail'));
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['feedback', '--agent', '1', '--client', '0xabc', '--index', '0'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockReadFeedback.mockRejectedValue(null);
      const cmd = makeReputationCommand();
      await cmd.parseAsync(['feedback', '--agent', '1', '--client', '0xabc', '--index', '0'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('validation status', () => {
    test('outputs JSON', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['status', '--hash', '0xabc'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.response).toBe(85);
    });

    test('pretty format', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['status', '--hash', '0xabc', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Validation Status');
    });

    test('pretty with empty tag shows (none)', async () => {
      mockGetValidationStatus.mockResolvedValue({
        validatorAddress: '0xval', agentId: BigInt(1), response: 90,
        responseHash: '0x', tag: '', lastUpdate: BigInt(1700000000),
      });
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['status', '--hash', '0xabc', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('(none)');
    });

    test('handles error', async () => {
      mockGetValidationStatus.mockRejectedValue(new Error('fail'));
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['status', '--hash', '0xabc'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockGetValidationStatus.mockRejectedValue(0);
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['status', '--hash', '0xabc'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('validation list', () => {
    test('outputs JSON', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['list', '--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.validations).toEqual(['0xhash1', '0xhash2']);
    });

    test('pretty with no validations', async () => {
      mockGetAgentValidations.mockResolvedValue([]);
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['list', '--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('No validations');
    });

    test('pretty with validations', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['list', '--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Validations for Agent');
    });

    test('handles error', async () => {
      mockGetAgentValidations.mockRejectedValue(new Error('fail'));
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['list', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockGetAgentValidations.mockRejectedValue(undefined);
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['list', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('validation summary', () => {
    test('outputs JSON', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['summary', '--agent', '1'], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(output.avgResponse).toBe(90);
    });

    test('pretty format', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['summary', '--agent', '1', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Validation Summary');
    });

    test('with validators and tag', async () => {
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['summary', '--agent', '1', '--validators', '0xval1,0xval2', '--tag', 'quality', '--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('quality');
    });

    test('handles error', async () => {
      mockGetValidationSummary.mockRejectedValue(new Error('fail'));
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['summary', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('RPC_ERROR');
    });

    test('handles non-Error thrown', async () => {
      mockGetValidationSummary.mockRejectedValue(false);
      const cmd = makeValidationCommand();
      await cmd.parseAsync(['summary', '--agent', '1'], { from: 'user' });
      expect(JSON.parse(stderrOutput[0]).code).toBe('UNKNOWN');
    });
  });

  describe('chains', () => {
    test('outputs JSON by default', () => {
      const cmd = makeChainsCommand();
      cmd.parse([], { from: 'user' });
      const output = JSON.parse(stdoutOutput.join(''));
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });

    test('pretty format', () => {
      const cmd = makeChainsCommand();
      cmd.parse(['--pretty'], { from: 'user' });
      expect(stdoutOutput.join('\n')).toContain('Supported Chains');
    });
  });
});

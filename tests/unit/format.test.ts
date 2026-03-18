import { jsonError, header, row, shortAddr } from '../../src/utils/format';

describe('jsonError', () => {
  const originalWrite = process.stderr.write;
  let stderrOutput: string[] = [];

  beforeEach(() => {
    stderrOutput = [];
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrOutput.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
    process.exitCode = undefined;
  });

  test('writes structured JSON error to stderr', () => {
    jsonError('Something failed', 'RPC_ERROR', 1);
    const output = JSON.parse(stderrOutput[0]);
    expect(output).toEqual({ error: 'Something failed', code: 'RPC_ERROR', exitCode: 1 });
  });

  test('sets process exit code', () => {
    jsonError('Bad input', 'INVALID_INPUT', 2);
    expect(process.exitCode).toBe(2);
  });
});

describe('header', () => {
  const originalLog = console.log;
  let output: string[] = [];

  beforeEach(() => { output = []; console.log = (...args: unknown[]) => { output.push(args.map(String).join(' ')); }; });
  afterEach(() => { console.log = originalLog; });

  test('prints header text', () => {
    header('Test Header');
    expect(output.length).toBe(3);
  });
});

describe('row', () => {
  const originalLog = console.log;
  let output: string[] = [];

  beforeEach(() => { output = []; console.log = (...args: unknown[]) => { output.push(args.map(String).join(' ')); }; });
  afterEach(() => { console.log = originalLog; });

  test('prints label-value pair', () => {
    row('Label', 'Value');
    expect(output.length).toBe(1);
    expect(output[0]).toContain('Value');
  });
});

describe('shortAddr', () => {
  test('shortens long addresses', () => {
    expect(shortAddr('0x89E9E1ab11dD1B138b1dcE6d6A4a0926aaFD5029')).toBe('0x89E9...5029');
  });

  test('returns short strings as-is', () => {
    expect(shortAddr('0xabc')).toBe('0xabc');
  });
});

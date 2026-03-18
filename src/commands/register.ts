import { Command } from 'commander';
import { ERC8004Client } from '../api/client';
import { getRpcUrl, getChainId } from '../config/store';
import { type Address } from 'viem';
import { header, row, jsonError } from '../utils/format';

export function makeRegisterCommand(): Command {
  const cmd = new Command('register')
    .description('Build a transaction to register a new agent')
    .option('--uri <uri>', 'Agent registration file URI (IPFS, HTTP, or data: URI)')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--from <address>', 'Sender address for unsigned tx payload')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const tx = client.buildRegisterTransaction(opts.uri, opts.from as Address | undefined);

        const data = { ...tx, chainId };

        if (opts.pretty) {
          header('Register New Agent');
          row('Chain', `${opts.chain} (${chainId})`);
          row('Contract', tx.to);
          if (opts.from) row('From', opts.from);
          if (opts.uri) row('URI', opts.uri);
          row('Action', tx.description);
          return;
        }

        console.log(JSON.stringify(data));
      } catch (err) {
        if (err instanceof Error) {
          jsonError(err.message, 'RPC_ERROR', 1);
        } else {
          jsonError('Unknown error', 'UNKNOWN', 1);
        }
      }
    });

  return cmd;
}

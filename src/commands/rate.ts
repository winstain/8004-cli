import { Command } from 'commander';
import { ERC8004Client } from '../api/client';
import { getRpcUrl, getChainId } from '../config/store';
import { type Address } from 'viem';
import { header, row, jsonError } from '../utils/format';

export function makeRateCommand(): Command {
  const cmd = new Command('rate')
    .description('Build a transaction to rate an agent')
    .requiredOption('--agent <id>', 'Agent ID')
    .requiredOption('--value <n>', 'Rating value (e.g. 95)')
    .option('--decimals <n>', 'Value decimals (default 0)', '0')
    .option('--tag1 <tag>', 'Primary tag', '')
    .option('--tag2 <tag>', 'Secondary tag', '')
    .option('--endpoint <url>', 'Endpoint being rated', '')
    .option('--feedback-uri <uri>', 'URI to detailed feedback file', '')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--from <address>', 'Sender address for unsigned tx payload')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const value = parseInt(opts.value, 10);
        if (isNaN(value)) {
          jsonError('Invalid value. Must be a number.', 'INVALID_INPUT', 1);
          return;
        }

        const decimals = parseInt(opts.decimals, 10);
        if (isNaN(decimals) || decimals < 0 || decimals > 18) {
          jsonError('Invalid decimals. Must be 0-18.', 'INVALID_INPUT', 1);
          return;
        }

        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const tx = client.buildGiveFeedbackTransaction(
          opts.agent,
          value,
          decimals,
          opts.tag1,
          opts.tag2,
          opts.endpoint,
          opts.feedbackUri || '',
          opts.from as Address | undefined,
        );

        const data = { ...tx, chainId };

        if (opts.pretty) {
          header(`Rate Agent #${opts.agent}`);
          row('Value', `${value} (${decimals} decimals)`);
          if (opts.tag1) row('Tag1', opts.tag1);
          if (opts.tag2) row('Tag2', opts.tag2);
          if (opts.endpoint) row('Endpoint', opts.endpoint);
          row('Contract', tx.to);
          if (opts.from) row('From', opts.from);
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

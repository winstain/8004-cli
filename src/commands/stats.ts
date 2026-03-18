import { Command } from 'commander';
import { ERC8004Client } from '../api/client';
import { getRpcUrl, getChainId } from '../config/store';
import { CONTRACTS } from '../config/contracts';
import { header, row, jsonError } from '../utils/format';

export function makeStatsCommand(): Command {
  const cmd = new Command('stats')
    .description('Get ERC-8004 registry statistics')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);

        let totalAgents: string;
        try {
          totalAgents = (await client.getTotalAgents()).toString();
        } catch {
          totalAgents = 'unknown';
        }

        const data = {
          chainId,
          totalAgents,
          contracts: CONTRACTS,
        };

        if (opts.pretty) {
          header('ERC-8004 Registry Statistics');
          row('Chain', `${opts.chain} (${chainId})`);
          row('Total Agents', totalAgents.toString());
          console.log();
          row('Identity Registry', CONTRACTS.identityRegistry);
          row('Reputation Registry', CONTRACTS.reputationRegistry);
          row('Validation Registry', CONTRACTS.validationRegistry);
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

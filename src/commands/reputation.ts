import { Command } from 'commander';
import { type Address } from 'viem';
import { ERC8004Client } from '../api/client';
import { getRpcUrl, getChainId } from '../config/store';
import { header, row, shortAddr, jsonError } from '../utils/format';

export function makeReputationCommand(): Command {
  const cmd = new Command('reputation')
    .description('Get reputation summary for an agent');

  cmd
    .command('summary')
    .description('Get aggregated reputation score')
    .requiredOption('--agent <id>', 'Agent ID')
    .option('--clients <addresses>', 'Comma-separated client addresses')
    .option('--tag1 <tag>', 'Filter by tag1', '')
    .option('--tag2 <tag>', 'Filter by tag2', '')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const agentId = BigInt(opts.agent);

        let clientAddresses: Address[] = [];
        if (opts.clients) {
          clientAddresses = opts.clients.split(',').map((a: string) => a.trim() as Address);
        } else {
          // Get all clients who gave feedback
          clientAddresses = await client.getClients(agentId);
        }

        const summary = await client.getReputationSummary(agentId, clientAddresses, opts.tag1, opts.tag2);

        const data = {
          agentId: opts.agent,
          chainId,
          feedbackCount: summary.count.toString(),
          summaryValue: summary.summaryValue.toString(),
          summaryValueDecimals: summary.summaryValueDecimals,
          clientCount: clientAddresses.length,
          filters: { tag1: opts.tag1 || null, tag2: opts.tag2 || null },
        };

        if (opts.pretty) {
          header(`Reputation: Agent #${opts.agent}`);
          row('Feedback Count', summary.count.toString());
          row('Summary Value', summary.summaryValue.toString());
          row('Value Decimals', summary.summaryValueDecimals.toString());
          row('Clients Queried', clientAddresses.length.toString());
          if (opts.tag1) row('Tag1 Filter', opts.tag1);
          if (opts.tag2) row('Tag2 Filter', opts.tag2);
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

  cmd
    .command('clients')
    .description('List all clients who gave feedback to an agent')
    .requiredOption('--agent <id>', 'Agent ID')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const agentId = BigInt(opts.agent);

        const clients = await client.getClients(agentId);

        const data = { agentId: opts.agent, chainId, clients };

        if (opts.pretty) {
          header(`Clients for Agent #${opts.agent}`);
          if (clients.length === 0) {
            console.log('  No feedback clients found.');
          } else {
            for (const addr of clients) {
              row('Client', addr);
            }
          }
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

  cmd
    .command('feedback')
    .description('Read specific feedback entry')
    .requiredOption('--agent <id>', 'Agent ID')
    .requiredOption('--client <address>', 'Client address')
    .requiredOption('--index <n>', 'Feedback index')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const agentId = BigInt(opts.agent);
        const index = BigInt(opts.index);

        const fb = await client.readFeedback(agentId, opts.client as Address, index);

        const data = {
          agentId: opts.agent,
          client: opts.client,
          index: opts.index,
          value: fb.value.toString(),
          valueDecimals: fb.valueDecimals,
          tag1: fb.tag1,
          tag2: fb.tag2,
          isRevoked: fb.isRevoked,
        };

        if (opts.pretty) {
          header(`Feedback #${opts.index} for Agent #${opts.agent}`);
          row('Client', opts.client);
          row('Value', fb.value.toString());
          row('Value Decimals', fb.valueDecimals.toString());
          row('Tag1', fb.tag1 || '(none)');
          row('Tag2', fb.tag2 || '(none)');
          row('Revoked', String(fb.isRevoked));
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

import { Command } from 'commander';
import { type Address } from 'viem';
import { ERC8004Client } from '../api/client';
import { getRpcUrl, getChainId } from '../config/store';
import { header, row, shortAddr, jsonError } from '../utils/format';

export function makeValidationCommand(): Command {
  const cmd = new Command('validation')
    .description('Manage agent validations');

  cmd
    .command('status')
    .description('Check validation request status')
    .requiredOption('--hash <hash>', 'Validation request hash')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);

        const status = await client.getValidationStatus(opts.hash as `0x${string}`);

        const data = {
          requestHash: opts.hash,
          chainId,
          validatorAddress: status.validatorAddress,
          agentId: status.agentId.toString(),
          response: status.response,
          responseHash: status.responseHash,
          tag: status.tag,
          lastUpdate: status.lastUpdate.toString(),
        };

        if (opts.pretty) {
          header('Validation Status');
          row('Request Hash', shortAddr(opts.hash));
          row('Validator', status.validatorAddress);
          row('Agent ID', status.agentId.toString());
          row('Response', status.response.toString());
          row('Tag', status.tag || '(none)');
          row('Last Update', new Date(Number(status.lastUpdate) * 1000).toISOString());
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
    .command('list')
    .description('List all validations for an agent')
    .requiredOption('--agent <id>', 'Agent ID')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const agentId = BigInt(opts.agent);

        const validations = await client.getAgentValidations(agentId);

        const data = { agentId: opts.agent, chainId, validations };

        if (opts.pretty) {
          header(`Validations for Agent #${opts.agent}`);
          if (validations.length === 0) {
            console.log('  No validations found.');
          } else {
            for (const hash of validations) {
              row('Request Hash', shortAddr(hash));
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
    .command('summary')
    .description('Get aggregated validation score')
    .requiredOption('--agent <id>', 'Agent ID')
    .option('--validators <addresses>', 'Comma-separated validator addresses')
    .option('--tag <tag>', 'Filter by tag', '')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const agentId = BigInt(opts.agent);

        const validatorAddresses: Address[] = opts.validators
          ? opts.validators.split(',').map((a: string) => a.trim() as Address)
          : [];

        const summary = await client.getValidationSummary(agentId, validatorAddresses, opts.tag);

        const data = {
          agentId: opts.agent,
          chainId,
          validationCount: summary.count.toString(),
          avgResponse: summary.avgResponse,
          tag: opts.tag || null,
        };

        if (opts.pretty) {
          header(`Validation Summary: Agent #${opts.agent}`);
          row('Validation Count', summary.count.toString());
          row('Avg Response', summary.avgResponse.toString());
          if (opts.tag) row('Tag Filter', opts.tag);
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

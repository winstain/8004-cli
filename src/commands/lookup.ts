import { Command } from 'commander';
import { ERC8004Client } from '../api/client';
import { getRpcUrl, getChainId } from '../config/store';
import { header, row, shortAddr, jsonError } from '../utils/format';

export function makeLookupCommand(): Command {
  const cmd = new Command('lookup')
    .description('Look up an agent by ID')
    .requiredOption('--agent <id>', 'Agent ID')
    .option('--chain <chain>', 'Chain name or ID', 'base')
    .option('--pretty', 'Human-readable colored output')
    .action(async (opts) => {
      try {
        const chainId = getChainId(opts.chain);
        const client = new ERC8004Client(getRpcUrl(opts.chain), chainId);
        const agentId = BigInt(opts.agent);

        const [uri, owner, wallet] = await Promise.all([
          client.getAgentURI(agentId),
          client.getAgentOwner(agentId),
          client.getAgentWallet(agentId).catch(() => null),
        ]);

        // Try to fetch and parse the registration file
        let registration: any = null;
        if (uri && (uri.startsWith('http') || uri.startsWith('ipfs') || uri.startsWith('data:'))) {
          try {
            let fetchUrl = uri;
            if (uri.startsWith('ipfs://')) {
              fetchUrl = `https://ipfs.io/ipfs/${uri.slice(7)}`;
            } else if (uri.startsWith('data:')) {
              const base64 = uri.split(',')[1];
              registration = JSON.parse(Buffer.from(base64, 'base64').toString());
            }
            if (!registration) {
              const res = await fetch(fetchUrl);
              if (res.ok) registration = await res.json();
            }
          } catch {
            // Failed to fetch/parse registration file
          }
        }

        const data = {
          agentId: opts.agent,
          chainId,
          owner,
          wallet: wallet || null,
          uri,
          registration,
        };

        if (opts.pretty) {
          header(`Agent #${opts.agent}`);
          row('Chain', `${opts.chain} (${chainId})`);
          row('Owner', owner);
          if (wallet) row('Wallet', wallet);
          row('URI', uri);
          if (registration) {
            if (registration.name) row('Name', registration.name);
            if (registration.description) row('Description', registration.description);
            if (registration.active !== undefined) row('Active', String(registration.active));
            if (registration.services) {
              for (const svc of registration.services) {
                row(`Service: ${svc.name}`, svc.endpoint || '');
              }
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

  return cmd;
}

import { Command } from 'commander';
import chalk from 'chalk';
import { CHAINS } from '../config/contracts';
import { header } from '../utils/format';

export function makeChainsCommand(): Command {
  const cmd = new Command('chains')
    .description('List supported chains')
    .option('--pretty', 'Human-readable colored output')
    .action((opts) => {
      const chains = Object.entries(CHAINS).map(([key, val]) => ({
        name: key,
        chainId: val.id,
        displayName: val.name,
        rpc: val.rpc,
      }));

      if (opts.pretty) {
        header('Supported Chains');
        console.log();
        console.log(
          '  ' +
          chalk.gray('Name'.padEnd(16)) +
          chalk.gray('ID'.padEnd(12)) +
          chalk.gray('Display'.padEnd(16)) +
          chalk.gray('RPC'),
        );
        console.log('  ' + '-'.repeat(70));
        for (const c of chains) {
          console.log(
            '  ' +
            c.name.padEnd(16) +
            String(c.chainId).padEnd(12) +
            c.displayName.padEnd(16) +
            c.rpc,
          );
        }
        console.log();
        return;
      }

      console.log(JSON.stringify(chains));
    });

  return cmd;
}

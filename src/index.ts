#!/usr/bin/env node

import { Command } from 'commander';
import { makeLookupCommand } from './commands/lookup';
import { makeReputationCommand } from './commands/reputation';
import { makeRegisterCommand } from './commands/register';
import { makeRateCommand } from './commands/rate';
import { makeValidationCommand } from './commands/validation';
import { makeStatsCommand } from './commands/stats';
import { makeChainsCommand } from './commands/chains';

const pkg = require('../package.json');

const program = new Command();

program
  .name('8004')
  .description('Agent-first CLI for ERC-8004 agent identity, reputation, and validation. JSON output by default.')
  .version(pkg.version);

program.addCommand(makeLookupCommand());
program.addCommand(makeReputationCommand());
program.addCommand(makeRegisterCommand());
program.addCommand(makeRateCommand());
program.addCommand(makeValidationCommand());
program.addCommand(makeStatsCommand());
program.addCommand(makeChainsCommand());

// MCP server subcommand
program
  .command('mcp')
  .description('Start MCP server over stdio (for Claude Desktop, Claude Code, etc.)')
  .action(async () => {
    const { startMcpServer } = await import('./mcp');
    await startMcpServer();
  });

program.parse();

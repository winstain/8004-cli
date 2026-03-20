# 8004-cli

Agent-first CLI for ERC-8004 agent identity, reputation, and validation. JSON output by default.

## Install

```bash
npm install -g 8004-cli
```

## Usage

```bash
8004 --help
8004 chains
8004 stats
8004 lookup --agent-id 1
8004 reputation summary --agent-id 1
8004 reputation clients --agent-id 1
8004 validation status --hash 0x...
8004 register --from 0x...
8004 rate --agent-id 1 --value 5 --from 0x...
```

## Configuration

The CLI reads configuration from:

- `~/.8004-cli/config.json`
- per-chain defaults in code

RPC resolution falls back to the configured/default chain, with Base as the default network.

## Output contract

Read commands return protocol state and derived summaries as JSON by default.

Write-oriented commands like `register` and `rate` return unsigned EVM transaction payloads so they can be signed elsewhere.

## MCP server

```bash
8004 mcp
```

Starts the MCP server over stdio for agent/tool integrations.

## Development

```bash
npm ci
npm run build
npm test
```

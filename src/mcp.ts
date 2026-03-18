import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { type Address } from 'viem';
import { ERC8004Client } from './api/client';
import { getRpcUrl, getChainId } from './config/store';

function getClient(chain?: string): ERC8004Client {
  return new ERC8004Client(getRpcUrl(chain), getChainId(chain));
}

export async function startMcpServer() {
  const server = new McpServer({
    name: '8004-cli',
    version: '1.0.0',
  });

  server.tool(
    'erc8004_lookup',
    'Look up an ERC-8004 agent by ID — returns identity, owner, wallet, and registration file',
    {
      agentId: z.string().describe('Agent ID'),
      chain: z.string().optional().describe('Chain name or ID (default: base)'),
    },
    async ({ agentId, chain }) => {
      const client = getClient(chain);
      const id = BigInt(agentId);
      const [uri, owner, wallet] = await Promise.all([
        client.getAgentURI(id),
        client.getAgentOwner(id),
        client.getAgentWallet(id).catch(() => null),
      ]);

      let registration: any = null;
      if (uri && (uri.startsWith('http') || uri.startsWith('ipfs') || uri.startsWith('data:'))) {
        try {
          let fetchUrl = uri;
          if (uri.startsWith('ipfs://')) fetchUrl = `https://ipfs.io/ipfs/${uri.slice(7)}`;
          else if (uri.startsWith('data:')) {
            const base64 = uri.split(',')[1];
            registration = JSON.parse(Buffer.from(base64, 'base64').toString());
          }
          if (!registration) {
            const res = await fetch(fetchUrl);
            if (res.ok) registration = await res.json();
          }
        } catch { /* ignore */ }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ agentId, owner, wallet, uri, registration }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'erc8004_stats',
    'Get ERC-8004 registry statistics (total agents, contract addresses)',
    { chain: z.string().optional().describe('Chain name or ID (default: base)') },
    async ({ chain }) => {
      const client = getClient(chain);
      const totalAgents = await client.getTotalAgents();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ totalAgents: totalAgents.toString() }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'erc8004_reputation_summary',
    'Get aggregated reputation score for an agent',
    {
      agentId: z.string().describe('Agent ID'),
      tag1: z.string().optional().describe('Filter by tag1'),
      tag2: z.string().optional().describe('Filter by tag2'),
      chain: z.string().optional().describe('Chain name or ID (default: base)'),
    },
    async ({ agentId, tag1, tag2, chain }) => {
      const client = getClient(chain);
      const id = BigInt(agentId);
      const clients = await client.getClients(id);
      const summary = await client.getReputationSummary(id, clients, tag1 || '', tag2 || '');
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            agentId,
            feedbackCount: summary.count.toString(),
            summaryValue: summary.summaryValue.toString(),
            summaryValueDecimals: summary.summaryValueDecimals,
            clientCount: clients.length,
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'erc8004_register',
    'Build a transaction to register a new ERC-8004 agent (returns calldata, does not execute)',
    {
      uri: z.string().optional().describe('Agent registration file URI'),
      chain: z.string().optional().describe('Chain name or ID (default: base)'),
    },
    async ({ uri, chain }) => {
      const client = getClient(chain);
      const tx = client.buildRegisterTransaction(uri);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ ...tx, chainId: getChainId(chain) }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'erc8004_rate',
    'Build a transaction to give feedback/rating to an agent',
    {
      agentId: z.string().describe('Agent ID'),
      value: z.number().describe('Rating value'),
      tag1: z.string().optional().describe('Primary tag'),
      tag2: z.string().optional().describe('Secondary tag'),
      chain: z.string().optional().describe('Chain name or ID (default: base)'),
    },
    async ({ agentId, value, tag1, tag2, chain }) => {
      const client = getClient(chain);
      const tx = client.buildGiveFeedbackTransaction(agentId, value, 0, tag1 || '', tag2 || '');
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ ...tx, chainId: getChainId(chain) }, null, 2),
        }],
      };
    },
  );

  server.tool(
    'erc8004_validation_status',
    'Check the status of a validation request',
    {
      hash: z.string().describe('Validation request hash'),
      chain: z.string().optional().describe('Chain name or ID (default: base)'),
    },
    async ({ hash, chain }) => {
      const client = getClient(chain);
      const status = await client.getValidationStatus(hash as `0x${string}`);
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            validatorAddress: status.validatorAddress,
            agentId: status.agentId.toString(),
            response: status.response,
            tag: status.tag,
            lastUpdate: status.lastUpdate.toString(),
          }, null, 2),
        }],
      };
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

import { createPublicClient, http, type PublicClient, type Address, type Chain } from 'viem';
import { base, mainnet, sepolia, polygon, arbitrum, optimism, celo } from 'viem/chains';
import { CONTRACTS } from '../config/contracts';
import { identityRegistryAbi, reputationRegistryAbi, validationRegistryAbi } from '../config/abis';

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  8453: base,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  42220: celo,
};

export class ERC8004Client {
  private client: PublicClient;

  constructor(rpcUrl: string, chainId: number = 8453) {
    const chain = CHAIN_MAP[chainId] || base;
    this.client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClient;
  }

  // Identity Registry

  async getAgentURI(agentId: bigint): Promise<string> {
    return await this.client.readContract({
      address: CONTRACTS.identityRegistry,
      abi: identityRegistryAbi,
      functionName: 'tokenURI',
      args: [agentId],
    });
  }

  async getAgentOwner(agentId: bigint): Promise<Address> {
    return await this.client.readContract({
      address: CONTRACTS.identityRegistry,
      abi: identityRegistryAbi,
      functionName: 'ownerOf',
      args: [agentId],
    });
  }

  async getAgentWallet(agentId: bigint): Promise<Address> {
    return await this.client.readContract({
      address: CONTRACTS.identityRegistry,
      abi: identityRegistryAbi,
      functionName: 'getAgentWallet',
      args: [agentId],
    });
  }

  async getMetadata(agentId: bigint, key: string): Promise<string> {
    const result = await this.client.readContract({
      address: CONTRACTS.identityRegistry,
      abi: identityRegistryAbi,
      functionName: 'getMetadata',
      args: [agentId, key],
    });
    return result as string;
  }

  async getTotalAgents(): Promise<bigint> {
    return await this.client.readContract({
      address: CONTRACTS.identityRegistry,
      abi: identityRegistryAbi,
      functionName: 'totalSupply',
    });
  }

  // Reputation Registry

  async getReputationSummary(
    agentId: bigint,
    clientAddresses: Address[],
    tag1: string = '',
    tag2: string = '',
  ): Promise<{ count: bigint; summaryValue: bigint; summaryValueDecimals: number }> {
    const [count, summaryValue, summaryValueDecimals] = await this.client.readContract({
      address: CONTRACTS.reputationRegistry,
      abi: reputationRegistryAbi,
      functionName: 'getSummary',
      args: [agentId, clientAddresses, tag1, tag2],
    });
    return { count, summaryValue, summaryValueDecimals };
  }

  async getClients(agentId: bigint): Promise<Address[]> {
    const result = await this.client.readContract({
      address: CONTRACTS.reputationRegistry,
      abi: reputationRegistryAbi,
      functionName: 'getClients',
      args: [agentId],
    });
    return [...result];
  }

  async getLastFeedbackIndex(agentId: bigint, clientAddress: Address): Promise<bigint> {
    return await this.client.readContract({
      address: CONTRACTS.reputationRegistry,
      abi: reputationRegistryAbi,
      functionName: 'getLastIndex',
      args: [agentId, clientAddress],
    });
  }

  async readFeedback(
    agentId: bigint,
    clientAddress: Address,
    index: bigint,
  ): Promise<{ value: bigint; valueDecimals: number; tag1: string; tag2: string; isRevoked: boolean }> {
    const [value, valueDecimals, tag1, tag2, isRevoked] = await this.client.readContract({
      address: CONTRACTS.reputationRegistry,
      abi: reputationRegistryAbi,
      functionName: 'readFeedback',
      args: [agentId, clientAddress, index],
    });
    return { value, valueDecimals, tag1, tag2, isRevoked };
  }

  // Validation Registry

  async getValidationStatus(requestHash: `0x${string}`): Promise<{
    validatorAddress: Address;
    agentId: bigint;
    response: number;
    responseHash: string;
    tag: string;
    lastUpdate: bigint;
  }> {
    const [validatorAddress, agentId, response, responseHash, tag, lastUpdate] =
      await this.client.readContract({
        address: CONTRACTS.validationRegistry,
        abi: validationRegistryAbi,
        functionName: 'getValidationStatus',
        args: [requestHash],
      });
    return { validatorAddress, agentId, response, responseHash: responseHash as string, tag, lastUpdate };
  }

  async getAgentValidations(agentId: bigint): Promise<string[]> {
    const result = await this.client.readContract({
      address: CONTRACTS.validationRegistry,
      abi: validationRegistryAbi,
      functionName: 'getAgentValidations',
      args: [agentId],
    });
    return [...result] as string[];
  }

  async getValidationSummary(
    agentId: bigint,
    validatorAddresses: Address[],
    tag: string = '',
  ): Promise<{ count: bigint; avgResponse: number }> {
    const [count, avgResponse] = await this.client.readContract({
      address: CONTRACTS.validationRegistry,
      abi: validationRegistryAbi,
      functionName: 'getSummary',
      args: [agentId, validatorAddresses, tag],
    });
    return { count, avgResponse };
  }

  // Build transaction calldata (does not execute)

  buildRegisterTransaction(agentURI?: string) {
    return {
      to: CONTRACTS.identityRegistry,
      data: agentURI ? `register("${agentURI}")` : 'register()',
      description: agentURI
        ? `Register new agent with URI: ${agentURI}`
        : 'Register new agent (no URI)',
    };
  }

  buildSetURITransaction(agentId: string, newURI: string) {
    return {
      to: CONTRACTS.identityRegistry,
      data: `setAgentURI(${agentId}, "${newURI}")`,
      description: `Update agent ${agentId} URI to ${newURI}`,
    };
  }

  buildGiveFeedbackTransaction(
    agentId: string,
    value: number,
    valueDecimals: number = 0,
    tag1: string = '',
    tag2: string = '',
    endpoint: string = '',
    feedbackURI: string = '',
  ) {
    return {
      to: CONTRACTS.reputationRegistry,
      data: `giveFeedback(${agentId}, ${value}, ${valueDecimals}, "${tag1}", "${tag2}", "${endpoint}", "${feedbackURI}", 0x0)`,
      description: `Give feedback to agent ${agentId}: value=${value}, tags=[${tag1}, ${tag2}]`,
    };
  }

  buildValidationRequestTransaction(
    validatorAddress: string,
    agentId: string,
    requestURI: string,
    requestHash: string,
  ) {
    return {
      to: CONTRACTS.validationRegistry,
      data: `validationRequest(${validatorAddress}, ${agentId}, "${requestURI}", ${requestHash})`,
      description: `Request validation for agent ${agentId} from ${validatorAddress}`,
    };
  }
}

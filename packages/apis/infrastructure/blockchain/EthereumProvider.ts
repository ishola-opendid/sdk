// Ethereum Provider Infrastructure
import { ethers } from 'ethers';
import type { OpenDIDContract, ENSRegistry, ENSResolver } from '../contracts/OpenDIDContract.js';

export interface EthereumConfig {
  rpcUrl: string;
  privateKey?: string;
  openDIDContractAddress: string;
  ensRegistryAddress: string;
}

export class EthereumProvider {
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private openDIDContract: ethers.Contract;
  private ensRegistry: ethers.Contract;

  constructor(config: EthereumConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // OpenDID Contract ABI (simplified - you'll need the full ABI)
    const openDIDABI = [
      "function registerDID(string calldata ensName) external",
      "function generateClaimMessage(string calldata ensName, string calldata cid, string calldata claimType) external view returns (bytes32)",
      "function generateRegistrationMessage(string calldata ensName) external view returns (bytes32)",
      "function incrementNonce(address user) external",
      "function getDID(string calldata ensName) external view returns (string)",
      "function hasDID(string calldata ensName) public view returns (bool)",
      "function getNamehash(string calldata name) external pure returns (bytes32)",
      "function getNonce(address user) external view returns (uint256)",
      "event DIDClaimed(bytes32 indexed node, string indexed ensName, string didRecord, address indexed claimer)",
      "event ClaimMessageGenerated(bytes32 indexed node, string indexed ensName, bytes32 indexed messageHash, address claimer)"
    ];

    // ENS Registry ABI (simplified)
    const ensRegistryABI = [
      "function resolver(bytes32 node) external view returns (address)",
      "function owner(bytes32 node) external view returns (address)"
    ];

    this.openDIDContract = new ethers.Contract(
      config.openDIDContractAddress,
      openDIDABI,
      this.signer || this.provider
    );

    this.ensRegistry = new ethers.Contract(
      config.ensRegistryAddress,
      ensRegistryABI,
      this.provider
    );
  }

  // Get the current signer address
  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }
    return await this.signer.getAddress();
  }

  // Get the OpenDID contract instance
  getOpenDIDContract(): ethers.Contract {
    return this.openDIDContract;
  }

  // Get the ENS Registry contract instance
  getENSRegistry(): ethers.Contract {
    return this.ensRegistry;
  }

  // Sign a message hash
  async signMessage(messageHash: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }
    return await this.signer.signMessage(ethers.getBytes(messageHash));
  }

  // Get ENS name owner
  async getENSOwner(ensName: string): Promise<string> {
    const namehash = ethers.namehash(ensName);
    try {
      const owner = await (this.ensRegistry as any).owner(namehash);
      return owner || '';
    } catch (error) {
      throw new Error(`Failed to get ENS owner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get ENS resolver
  async getENSResolver(ensName: string): Promise<string> {
    const namehash = ethers.namehash(ensName);
    try {
      const resolver = await (this.ensRegistry as any).resolver(namehash);
      return resolver || '';
    } catch (error) {
      throw new Error(`Failed to get ENS resolver: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if address owns ENS name
  async ownsENSName(ensName: string, address: string): Promise<boolean> {
    const owner = await this.getENSOwner(ensName);
    return owner.toLowerCase() === address.toLowerCase();
  }

  // Get network information
  async getNetwork(): Promise<ethers.Network> {
    return await this.provider.getNetwork();
  }

  // Get current block number
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  // Get gas price
  async getGasPrice(): Promise<bigint> {
    return await this.provider.getFeeData().then(fee => fee.gasPrice || 0n);
  }
}

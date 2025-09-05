// Filecoin Provider Infrastructure
import { ethers } from 'ethers';
import type { DIDClaimsRegistryContract } from '../contracts/DIDClaimsRegistryContract.js';

export interface FilecoinConfig {
  rpcUrl: string;
  privateKey?: string;
  didClaimsRegistryAddress: string;
}

export class FilecoinProvider {
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private didClaimsRegistry: ethers.Contract;

  constructor(config: FilecoinConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    // DIDClaimsRegistry Contract ABI (simplified - you'll need the full ABI)
    const didClaimsRegistryABI = [
      // Claim Type Management
      "function createClaimType(string calldata claimType, string calldata description) external",
      "function isClaimTypeExists(string calldata claimType) external view returns (bool)",
      "function getClaimType(string calldata claimType) external view returns (tuple(string claimType, address issuer, string description, bool exists, uint256 createdAt))",
      
      // DID Registration
      "function registerDID(string calldata did, address expectedEthOwner, bytes calldata sig) external",
      
      // Claim Management
      "function appendClaim(string calldata did, string calldata cid, string calldata claimType, bytes calldata sig) external",
      
      // General Claim Queries
      "function getLatestCID(string calldata did) external view returns (string)",
      "function getClaimsCount(string calldata did) external view returns (uint256)",
      "function getClaim(string calldata did, uint256 index) external view returns (string)",
      "function getAllClaims(string calldata did) external view returns (string[])",
      "function getClaimsRange(string calldata did, uint256 start, uint256 end) external view returns (string[])",
      
      // Claim Type Specific Queries
      "function getLatestCIDByType(string calldata did, string calldata claimType) external view returns (string)",
      "function getClaimsCountByType(string calldata did, string calldata claimType) external view returns (uint256)",
      "function getClaimByType(string calldata did, string calldata claimType, uint256 index) external view returns (string)",
      "function getAllClaimsByType(string calldata did, string calldata claimType) external view returns (string[])",
      "function getClaimsRangeByType(string calldata did, string calldata claimType, uint256 start, uint256 end) external view returns (string[])",
      "function hasClaimsOfType(string calldata did, string calldata claimType) external view returns (bool)",
      
      // Utility Methods
      "function isDIDRegistered(string calldata did) external view returns (bool)",
      "function getCurrentNonce(string calldata did) external view returns (uint256)",
      "function didHash(string calldata did) public pure returns (bytes32)",
      
      // Events
      "event DIDRegistered(bytes32 indexed didHash, string did, address indexed ethOwner)",
      "event ClaimAppended(bytes32 indexed didHash, string did, uint256 index, string cid, string claimType, address indexed submitter)",
      "event ClaimTypeCreated(string indexed claimType, address indexed issuer, string description)"
    ];

    this.didClaimsRegistry = new ethers.Contract(
      config.didClaimsRegistryAddress,
      didClaimsRegistryABI,
      this.signer || this.provider
    );
  }

  // Get the current signer address
  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }
    return await this.signer.getAddress();
  }

  // Get the DIDClaimsRegistry contract instance
  getDIDClaimsRegistry(): ethers.Contract {
    return this.didClaimsRegistry;
  }

  // Sign a message hash
  async signMessage(messageHash: string): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer configured');
    }
    return await this.signer.signMessage(ethers.getBytes(messageHash));
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

  // Wait for transaction confirmation
  async waitForTransaction(txHash: string, confirmations: number = 1): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.waitForTransaction(txHash, confirmations);
  }
}

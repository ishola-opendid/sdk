// Claims Service for managing claims on Filecoin
import { FilecoinProvider } from '../infrastructure/blockchain/FilecoinProvider.js';
import type { Claim, ClaimType } from '../domain/types.js';

export class ClaimsService {
  private filecoinProvider: FilecoinProvider;

  constructor(filecoinProvider: FilecoinProvider) {
    this.filecoinProvider = filecoinProvider;
  }

  /**
   * Create a new claim type
   * @param claimType The unique identifier for the claim type
   * @param description Human-readable description
   * @returns Transaction hash
   */
  async createClaimType(claimType: string, description: string): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    const tx = await contract.createClaimType(claimType, description);
    return tx.hash;
  }

  /**
   * Check if a claim type exists
   * @param claimType The claim type identifier
   * @returns True if exists
   */
  async isClaimTypeExists(claimType: string): Promise<boolean> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.isClaimTypeExists(claimType);
  }

  /**
   * Get claim type information
   * @param claimType The claim type identifier
   * @returns Claim type information
   */
  async getClaimType(claimType: string): Promise<ClaimType> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    const result = await contract.getClaimType(claimType);
    
    return {
      claimType: result.claimType,
      issuer: result.issuer,
      description: result.description,
      exists: result.exists,
      createdAt: Number(result.createdAt)
    };
  }

  /**
   * Register a DID on Filecoin
   * @param did The DID (e.g., "did:opendid:vitalik.eth")
   * @param expectedEthOwner The expected Ethereum owner
   * @param signature The signature
   * @returns Transaction hash
   */
  async registerDID(
    did: string,
    expectedEthOwner: string,
    signature: string
  ): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    const tx = await contract.registerDID(did, expectedEthOwner, signature);
    return tx.hash;
  }

  /**
   * Append a claim with claim type
   * @param did The DID
   * @param cid The IPFS CID
   * @param claimType The claim type
   * @param signature The signature
   * @returns Transaction hash
   */
  async appendClaim(
    did: string,
    cid: string,
    claimType: string,
    signature: string
  ): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    const tx = await contract.appendClaim(did, cid, claimType, signature);
    return tx.hash;
  }

  /**
   * Check if a DID is registered
   * @param did The DID
   * @returns True if registered
   */
  async isDIDRegistered(did: string): Promise<boolean> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.isDIDRegistered(did);
  }

  /**
   * Get current nonce for a DID
   * @param did The DID
   * @returns Current nonce
   */
  async getCurrentNonce(did: string): Promise<number> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getCurrentNonce(did);
  }

  // General Claim Queries

  /**
   * Get the latest CID for a DID
   * @param did The DID
   * @returns Latest CID
   */
  async getLatestCID(did: string): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getLatestCID(did);
  }

  /**
   * Get total number of claims for a DID
   * @param did The DID
   * @returns Number of claims
   */
  async getClaimsCount(did: string): Promise<number> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getClaimsCount(did);
  }

  /**
   * Get specific claim by index
   * @param did The DID
   * @param index The claim index
   * @returns Claim CID
   */
  async getClaim(did: string, index: number): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getClaim(did, index);
  }

  /**
   * Get all claims for a DID
   * @param did The DID
   * @returns Array of claim CIDs
   */
  async getAllClaims(did: string): Promise<string[]> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getAllClaims(did);
  }

  /**
   * Get claims in a specific range
   * @param did The DID
   * @param start Start index
   * @param end End index
   * @returns Array of claim CIDs
   */
  async getClaimsRange(did: string, start: number, end: number): Promise<string[]> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getClaimsRange(did, start, end);
  }

  // Claim Type Specific Queries

  /**
   * Get the latest CID for a specific claim type
   * @param did The DID
   * @param claimType The claim type
   * @returns Latest CID for the claim type
   */
  async getLatestCIDByType(did: string, claimType: string): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getLatestCIDByType(did, claimType);
  }

  /**
   * Get total number of claims for a specific claim type
   * @param did The DID
   * @param claimType The claim type
   * @returns Number of claims for the type
   */
  async getClaimsCountByType(did: string, claimType: string): Promise<number> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getClaimsCountByType(did, claimType);
  }

  /**
   * Get specific claim by index for a specific claim type
   * @param did The DID
   * @param claimType The claim type
   * @param index The claim index
   * @returns Claim CID
   */
  async getClaimByType(did: string, claimType: string, index: number): Promise<string> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getClaimByType(did, claimType, index);
  }

  /**
   * Get all claims for a specific claim type
   * @param did The DID
   * @param claimType The claim type
   * @returns Array of claim CIDs for the type
   */
  async getAllClaimsByType(did: string, claimType: string): Promise<string[]> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getAllClaimsByType(did, claimType);
  }

  /**
   * Get claims in a specific range for a specific claim type
   * @param did The DID
   * @param claimType The claim type
   * @param start Start index
   * @param end End index
   * @returns Array of claim CIDs
   */
  async getClaimsRangeByType(
    did: string,
    claimType: string,
    start: number,
    end: number
  ): Promise<string[]> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.getClaimsRangeByType(did, claimType, start, end);
  }

  /**
   * Check if a DID has any claims of a specific type
   * @param did The DID
   * @param claimType The claim type
   * @returns True if has claims of the type
   */
  async hasClaimsOfType(did: string, claimType: string): Promise<boolean> {
    const contract = this.filecoinProvider.getDIDClaimsRegistry();
    return await contract.hasClaimsOfType(did, claimType);
  }

  /**
   * Sign a message hash
   * @param messageHash The message hash to sign
   * @returns Signature
   */
  async signMessage(messageHash: string): Promise<string> {
    return await this.filecoinProvider.signMessage(messageHash);
  }
}

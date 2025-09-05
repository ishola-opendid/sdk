// Use case for verifying and retrieving claims
import { ENSService } from '../../service/ENSService.js';
import { ClaimsService } from '../../service/ClaimsService.js';
import { IPFSService } from '../../service/IPFSService.js';
import type { Claim, ClaimType } from '../../domain/types.js';

export class VerifyClaimUseCase {
  private ensService: ENSService;
  private claimsService: ClaimsService;
  private ipfsService: IPFSService;

  constructor(
    ensService: ENSService,
    claimsService: ClaimsService,
    ipfsService: IPFSService
  ) {
    this.ensService = ensService;
    this.claimsService = claimsService;
    this.ipfsService = ipfsService;
  }

  /**
   * Verify a specific claim by retrieving it from IPFS and validating it
   * @param did The DID
   * @param claimType The claim type
   * @param index The claim index
   * @returns Verified claim data
   */
  async verifyClaim(
    did: string,
    claimType: string,
    index: number
  ): Promise<Claim> {
    // Get the CID for the specific claim
    const cid = await this.claimsService.getClaimByType(did, claimType, index);
    
    if (!cid) {
      throw new Error('Claim not found');
    }

    // Retrieve and parse the claim data from IPFS
    const claimData = await this.ipfsService.retrieveJSON<Claim>(cid);
    
    // Validate the claim structure
    this.validateClaimStructure(claimData);
    
    // Validate claim integrity
    await this.validateClaimIntegrity(claimData, did, claimType);
    
    return claimData;
  }

  /**
   * Get all claims of a specific type for a DID
   * @param did The DID
   * @param claimType The claim type
   * @returns Array of verified claims
   */
  async getAllClaimsByType(did: string, claimType: string): Promise<Claim[]> {
    // Get all CIDs for the claim type
    const cids = await this.claimsService.getAllClaimsByType(did, claimType);
    
    if (cids.length === 0) {
      return [];
    }

    // Retrieve and verify all claims
    const claims = await Promise.allSettled(
      cids.map(cid => this.retrieveAndVerifyClaim(cid, did, claimType))
    );

    return claims
      .filter((result): result is PromiseFulfilledResult<Claim> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Get the latest claim of a specific type for a DID
   * @param did The DID
   * @param claimType The claim type
   * @returns Latest verified claim
   */
  async getLatestClaimByType(did: string, claimType: string): Promise<Claim | null> {
    // Get the latest CID
    const cid = await this.claimsService.getLatestCIDByType(did, claimType);
    
    if (!cid) {
      return null;
    }

    // Retrieve and verify the claim
    return await this.retrieveAndVerifyClaim(cid, did, claimType);
  }

  /**
   * Check if a DID has claims of a specific type
   * @param did The DID
   * @param claimType The claim type
   * @returns True if has claims of the type
   */
  async hasClaimsOfType(did: string, claimType: string): Promise<boolean> {
    return await this.claimsService.hasClaimsOfType(did, claimType);
  }

  /**
   * Get claim type information
   * @param claimType The claim type identifier
   * @returns Claim type information
   */
  async getClaimTypeInfo(claimType: string): Promise<ClaimType> {
    return await this.claimsService.getClaimType(claimType);
  }

  /**
   * Get all available claim types
   * @param did The DID to check claims for
   * @returns Array of claim types with counts
   */
  async getAvailableClaimTypes(did: string): Promise<Array<{
    claimType: string;
    count: number;
    latestCID: string;
  }>> {
    // This would require additional contract methods to get all claim types
    // For now, we'll return an empty array
    // In a real implementation, you might want to maintain a registry of claim types
    return [];
  }

  /**
   * Verify claim integrity by checking blockchain data
   * @param claim The claim to verify
   * @param expectedDID The expected DID
   * @param expectedClaimType The expected claim type
   */
  private async validateClaimIntegrity(
    claim: Claim,
    expectedDID: string,
    expectedClaimType: string
  ): Promise<void> {
    // Validate DID matches
    if (claim.did !== expectedDID) {
      throw new Error(`Claim DID mismatch. Expected: ${expectedDID}, Got: ${claim.did}`);
    }

    // Validate claim type matches
    if (claim.claimType !== expectedClaimType) {
      throw new Error(`Claim type mismatch. Expected: ${expectedClaimType}, Got: ${claim.claimType}`);
    }

    // Validate issued date is not in the future
    if (claim.issuedAt > new Date()) {
      throw new Error('Claim issued date is in the future');
    }

    // Validate expiration date if present
    if (claim.expirationDate && claim.expirationDate < new Date()) {
      throw new Error('Claim has expired');
    }

    // Additional validations could include:
    // - Signature verification
    // - Issuer authority validation
    // - Zero-knowledge proof validation
  }

  /**
   * Validate claim structure
   * @param claim The claim to validate
   */
  private validateClaimStructure(claim: any): void {
    if (!claim || typeof claim !== 'object') {
      throw new Error('Invalid claim: not an object');
    }

    const requiredFields = ['claimId', 'did', 'claimType', 'cid', 'issuer', 'subject', 'issuedAt', 'data'];
    for (const field of requiredFields) {
      if (!(field in claim)) {
        throw new Error(`Invalid claim: missing required field '${field}'`);
      }
    }

    // Validate DID format
    if (!claim.did.startsWith('did:opendid:')) {
      throw new Error('Invalid claim: DID must start with "did:opendid:"');
    }

    // Validate issued date
    if (!(claim.issuedAt instanceof Date) && typeof claim.issuedAt !== 'string') {
      throw new Error('Invalid claim: issuedAt must be a Date or string');
    }
  }

  /**
   * Retrieve and verify a claim from IPFS
   * @param cid The IPFS CID
   * @param expectedDID The expected DID
   * @param expectedClaimType The expected claim type
   * @returns Verified claim
   */
  private async retrieveAndVerifyClaim(
    cid: string,
    expectedDID: string,
    expectedClaimType: string
  ): Promise<Claim> {
    try {
      const claimData = await this.ipfsService.retrieveJSON<Claim>(cid);
      this.validateClaimStructure(claimData);
      await this.validateClaimIntegrity(claimData, expectedDID, expectedClaimType);
      return claimData;
    } catch (error) {
      throw new Error(`Failed to retrieve and verify claim ${cid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

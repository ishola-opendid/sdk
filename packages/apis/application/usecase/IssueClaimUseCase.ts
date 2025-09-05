// Use case for issuing claims with claim types
import { ENSService } from '../../service/ENSService.js';
import { ClaimsService } from '../../service/ClaimsService.js';
import { IPFSService } from '../../service/IPFSService.js';
import type { Claim, ClaimType } from '../../domain/types.js';

export class IssueClaimUseCase {
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
   * Create a new claim type
   * @param claimType The unique identifier for the claim type
   * @param description Human-readable description
   * @returns Transaction hash
   */
  async createClaimType(claimType: string, description: string): Promise<string> {
    // Validate claim type format
    if (!this.isValidClaimType(claimType)) {
      throw new Error('Invalid claim type format. Use lowercase letters, numbers, and hyphens only.');
    }

    // Check if claim type already exists
    const exists = await this.claimsService.isClaimTypeExists(claimType);
    if (exists) {
      throw new Error('Claim type already exists');
    }

    // Create the claim type
    const txHash = await this.claimsService.createClaimType(claimType, description);
    
    return txHash;
  }

  /**
   * Issue a claim with a specific claim type
   * @param ensName The ENS name of the subject
   * @param claimType The type of claim
   * @param claimData The claim data to be stored
   * @returns Object with IPFS CID and transaction hash
   */
  async issueClaim(
    ensName: string,
    claimType: string,
    claimData: Record<string, any>
  ): Promise<{
    cid: string;
    txHash: string;
    did: string;
  }> {
    // Validate inputs
    if (!this.isValidENSName(ensName)) {
      throw new Error('Invalid ENS name format');
    }

    if (!this.isValidClaimType(claimType)) {
      throw new Error('Invalid claim type format');
    }

    // Check if claim type exists
    const claimTypeExists = await this.claimsService.isClaimTypeExists(claimType);
    if (!claimTypeExists) {
      throw new Error('Claim type does not exist');
    }

    // Check if caller owns the ENS name
    const ownsName = await this.ensService.ownsENSName(ensName);
    if (!ownsName) {
      throw new Error('You do not own this ENS name');
    }

    // Check if DID exists
    const hasDID = await this.ensService.hasDID(ensName);
    if (!hasDID) {
      throw new Error('DID not registered for this ENS name');
    }

    const did = `did:opendid:${ensName}`;

    // Check if DID is registered on Filecoin
    const isRegistered = await this.claimsService.isDIDRegistered(did);
    if (!isRegistered) {
      throw new Error('DID not registered on Filecoin');
    }

    // Create the claim document
    const claimDocument = this.createClaimDocument(did, claimType, claimData);

    // Upload claim data to IPFS
    const cid = await this.ipfsService.upload(JSON.stringify(claimDocument));

    // Generate claim message
    const messageHash = await this.ensService.generateClaimMessage(ensName, cid, claimType);

    // Sign the message
    const signature = await this.ensService.signMessage(messageHash);

    // Submit claim to Filecoin
    const txHash = await this.claimsService.appendClaim(did, cid, claimType, signature);

    return {
      cid,
      txHash,
      did
    };
  }

  /**
   * Issue multiple claims of the same type
   * @param ensNames Array of ENS names
   * @param claimType The type of claim
   * @param claimData The claim data to be stored
   * @returns Array of results
   */
  async issueBulkClaims(
    ensNames: string[],
    claimType: string,
    claimData: Record<string, any>
  ): Promise<Array<{
    ensName: string;
    cid: string;
    txHash: string;
    did: string;
  }>> {
    const results = await Promise.allSettled(
      ensNames.map(ensName => 
        this.issueClaim(ensName, claimType, claimData)
          .then(result => ({ ensName, ...result }))
      )
    );

    return results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Create a claim document
   * @param did The DID
   * @param claimType The claim type
   * @param claimData The claim data
   * @returns Claim document
   */
  private createClaimDocument(
    did: string,
    claimType: string,
    claimData: Record<string, any>
  ): Claim {
    return {
      claimId: this.generateClaimId(),
      did,
      claimType,
      cid: '', // Will be set after IPFS upload
      issuer: '', // Will be set from the signer
      subject: '', // Will be set from the DID owner
      issuedAt: new Date(),
      data: claimData
    };
  }

  /**
   * Generate a unique claim ID
   * @returns Unique claim ID
   */
  private generateClaimId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `claim_${timestamp}_${random}`;
  }

  /**
   * Validate ENS name format
   * @param ensName The ENS name
   * @returns True if valid
   */
  private isValidENSName(ensName: string): boolean {
    const ensRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.eth$/;
    return ensRegex.test(ensName);
  }

  /**
   * Validate claim type format
   * @param claimType The claim type
   * @returns True if valid
   */
  private isValidClaimType(claimType: string): boolean {
    // Allow lowercase letters, numbers, and hyphens
    const claimTypeRegex = /^[a-z0-9-]+$/;
    return claimTypeRegex.test(claimType) && claimType.length > 0;
  }
}

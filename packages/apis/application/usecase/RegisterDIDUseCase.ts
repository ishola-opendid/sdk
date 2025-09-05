// Use case for registering a DID for an ENS name
import { ENSService } from '../../service/ENSService.js';
import { ClaimsService } from '../../service/ClaimsService.js';
import { IPFSService } from '../../service/IPFSService.js';
import type { Claim, ClaimType } from '../../domain/types.js';

export class RegisterDIDUseCase {
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
   * Register a DID for an ENS name on Ethereum
   * @param ensName The ENS name (e.g., "vitalik.eth")
   * @returns Transaction hash
   */
  async execute(ensName: string): Promise<string> {
    // Validate ENS name format
    if (!this.isValidENSName(ensName)) {
      throw new Error('Invalid ENS name format');
    }

    // Check if caller owns the ENS name
    const ownsName = await this.ensService.ownsENSName(ensName);
    if (!ownsName) {
      throw new Error('You do not own this ENS name');
    }

    // Check if DID already exists
    const hasDID = await this.ensService.hasDID(ensName);
    if (hasDID) {
      throw new Error('DID already exists for this ENS name');
    }

    // Register the DID
    const txHash = await this.ensService.registerDID(ensName);
    
    return txHash;
  }

  /**
   * Register a DID on Filecoin network
   * @param ensName The ENS name
   * @returns Transaction hash
   */
  async registerOnFilecoin(ensName: string): Promise<string> {
    const did = `did:opendid:${ensName}`;
    
    // Check if DID is already registered on Filecoin
    const isRegistered = await this.claimsService.isDIDRegistered(did);
    if (isRegistered) {
      throw new Error('DID already registered on Filecoin');
    }

    // Generate registration message
    const messageHash = await this.ensService.generateRegistrationMessage(ensName);
    
    // Sign the message
    const signature = await this.ensService.signMessage(messageHash);
    
    // Get the expected Ethereum owner
    const ethOwner = await this.ensService.getAddress();
    
    // Register on Filecoin
    const txHash = await this.claimsService.registerDID(did, ethOwner, signature);
    
    return txHash;
  }

  /**
   * Complete DID registration (both Ethereum and Filecoin)
   * @param ensName The ENS name
   * @returns Object with both transaction hashes
   */
  async completeRegistration(ensName: string): Promise<{
    ethereumTxHash: string;
    filecoinTxHash: string;
  }> {
    // Register on Ethereum first
    const ethereumTxHash = await this.execute(ensName);
    
    // Wait a bit for Ethereum transaction to be mined
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Register on Filecoin
    const filecoinTxHash = await this.registerOnFilecoin(ensName);
    
    return {
      ethereumTxHash,
      filecoinTxHash
    };
  }

  /**
   * Validate ENS name format
   * @param ensName The ENS name
   * @returns True if valid
   */
  private isValidENSName(ensName: string): boolean {
    // Basic ENS name validation
    const ensRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.eth$/;
    return ensRegex.test(ensName);
  }
}

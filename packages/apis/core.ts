// OpenDID SDK Core API
import { EthereumProvider } from './infrastructure/blockchain/EthereumProvider.js';
import { FilecoinProvider } from './infrastructure/blockchain/FilecoinProvider.js';
import { ENSService } from './service/ENSService.js';
import { ClaimsService } from './service/ClaimsService.js';
import { IPFSService } from './service/IPFSService.js';
import { RegisterDIDUseCase } from './application/usecase/RegisterDIDUseCase.js';
import { IssueClaimUseCase } from './application/usecase/IssueClaimUseCase.js';
import { VerifyClaimUseCase } from './application/usecase/VerifyClaimUseCase.js';
import type { Claim, ClaimType, ENSName } from './domain/types.js';

export interface OpenDIDConfig {
  // Ethereum configuration
  ethereum: {
    rpcUrl: string;
    privateKey?: string;
    openDIDContractAddress: string;
    ensRegistryAddress: string;
  };
  
  // Filecoin configuration
  filecoin: {
    rpcUrl: string;
    privateKey?: string;
    didClaimsRegistryAddress: string;
  };
  
  // IPFS configuration
  ipfs: {
    endpoint: string;
    apiKey?: string;
  };
}

export class OpenDID {
  private ethereumProvider: EthereumProvider;
  private filecoinProvider: FilecoinProvider;
  private ensService: ENSService;
  private claimsService: ClaimsService;
  private ipfsService: IPFSService;
  private registerDIDUseCase: RegisterDIDUseCase;
  private issueClaimUseCase: IssueClaimUseCase;
  private verifyClaimUseCase: VerifyClaimUseCase;

  constructor(config: OpenDIDConfig) {
    // Initialize providers
    this.ethereumProvider = new EthereumProvider(config.ethereum);
    this.filecoinProvider = new FilecoinProvider(config.filecoin);
    this.ipfsService = new IPFSService(config.ipfs);

    // Initialize services
    this.ensService = new ENSService(this.ethereumProvider);
    this.claimsService = new ClaimsService(this.filecoinProvider);

    // Initialize use cases
    this.registerDIDUseCase = new RegisterDIDUseCase(
      this.ensService,
      this.claimsService,
      this.ipfsService
    );
    this.issueClaimUseCase = new IssueClaimUseCase(
      this.ensService,
      this.claimsService,
      this.ipfsService
    );
    this.verifyClaimUseCase = new VerifyClaimUseCase(
      this.ensService,
      this.claimsService,
      this.ipfsService
    );
  }

  // ===== DID Registration Methods =====

  /**
   * Register a DID for an ENS name on Ethereum
   * @param ensName The ENS name (e.g., "vitalik.eth")
   * @returns Transaction hash
   */
  async registerDID(ensName: string): Promise<string> {
    return await this.registerDIDUseCase.execute(ensName);
  }

  /**
   * Register a DID on Filecoin network
   * @param ensName The ENS name
   * @returns Transaction hash
   */
  async registerDIDOnFilecoin(ensName: string): Promise<string> {
    return await this.registerDIDUseCase.registerOnFilecoin(ensName);
  }

  /**
   * Complete DID registration (both Ethereum and Filecoin)
   * @param ensName The ENS name
   * @returns Object with both transaction hashes
   */
  async completeDIDRegistration(ensName: string): Promise<{
    ethereumTxHash: string;
    filecoinTxHash: string;
  }> {
    return await this.registerDIDUseCase.completeRegistration(ensName);
  }

  /**
   * Check if an ENS name has a DID record
   * @param ensName The ENS name
   * @returns True if DID exists
   */
  async hasDID(ensName: string): Promise<boolean> {
    return await this.ensService.hasDID(ensName);
  }

  /**
   * Get ENS name information
   * @param ensName The ENS name
   * @returns ENS name information
   */
  async getENSNameInfo(ensName: string): Promise<ENSName> {
    return await this.ensService.getENSNameInfo(ensName);
  }

  // ===== Claim Type Management =====

  /**
   * Create a new claim type
   * @param claimType The unique identifier for the claim type
   * @param description Human-readable description
   * @returns Transaction hash
   */
  async createClaimType(claimType: string, description: string): Promise<string> {
    return await this.issueClaimUseCase.createClaimType(claimType, description);
  }

  /**
   * Get claim type information
   * @param claimType The claim type identifier
   * @returns Claim type information
   */
  async getClaimType(claimType: string): Promise<ClaimType> {
    return await this.claimsService.getClaimType(claimType);
  }

  /**
   * Check if a claim type exists
   * @param claimType The claim type identifier
   * @returns True if exists
   */
  async isClaimTypeExists(claimType: string): Promise<boolean> {
    return await this.claimsService.isClaimTypeExists(claimType);
  }

  // ===== Claim Issuance =====

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
    return await this.issueClaimUseCase.issueClaim(ensName, claimType, claimData);
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
    return await this.issueClaimUseCase.issueBulkClaims(ensNames, claimType, claimData);
  }

  // ===== Claim Verification =====

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
    return await this.verifyClaimUseCase.verifyClaim(did, claimType, index);
  }

  /**
   * Get all claims of a specific type for a DID
   * @param did The DID
   * @param claimType The claim type
   * @returns Array of verified claims
   */
  async getAllClaimsByType(did: string, claimType: string): Promise<Claim[]> {
    return await this.verifyClaimUseCase.getAllClaimsByType(did, claimType);
  }

  /**
   * Get the latest claim of a specific type for a DID
   * @param did The DID
   * @param claimType The claim type
   * @returns Latest verified claim
   */
  async getLatestClaimByType(did: string, claimType: string): Promise<Claim | null> {
    return await this.verifyClaimUseCase.getLatestClaimByType(did, claimType);
  }

  /**
   * Check if a DID has claims of a specific type
   * @param did The DID
   * @param claimType The claim type
   * @returns True if has claims of the type
   */
  async hasClaimsOfType(did: string, claimType: string): Promise<boolean> {
    return await this.verifyClaimUseCase.hasClaimsOfType(did, claimType);
  }

  // ===== Utility Methods =====

  /**
   * Get the current Ethereum address
   * @returns Ethereum address
   */
  async getAddress(): Promise<string> {
    return await this.ethereumProvider.getAddress();
  }

  /**
   * Get network information for Ethereum
   * @returns Network information
   */
  async getEthereumNetwork(): Promise<any> {
    return await this.ethereumProvider.getNetwork();
  }

  /**
   * Get network information for Filecoin
   * @returns Network information
   */
  async getFilecoinNetwork(): Promise<any> {
    return await this.filecoinProvider.getNetwork();
  }

  /**
   * Check if IPFS is accessible
   * @returns True if accessible
   */
  async isIPFSAccessible(): Promise<boolean> {
    return await this.ipfsService.isAccessible();
  }

  /**
   * Upload data to IPFS
   * @param data The data to upload
   * @param filename Optional filename
   * @returns IPFS hash (CID)
   */
  async uploadToIPFS(data: string | Blob | File, filename?: string): Promise<string> {
    return await this.ipfsService.upload(data, filename);
  }

  /**
   * Retrieve data from IPFS
   * @param cid The IPFS hash (CID)
   * @returns The data as string
   */
  async retrieveFromIPFS(cid: string): Promise<string> {
    return await this.ipfsService.retrieve(cid);
  }

  /**
   * Retrieve JSON data from IPFS
   * @param cid The IPFS hash (CID)
   * @returns The data as parsed JSON
   */
  async retrieveJSONFromIPFS<T = any>(cid: string): Promise<T> {
    return await this.ipfsService.retrieveJSON<T>(cid);
  }

  /**
   * Get all claims for a DID (general)
   * @param did The DID
   * @returns Array of claim CIDs
   */
  async getAllClaims(did: string): Promise<string[]> {
    return await this.claimsService.getAllClaims(did);
  }

  /**
   * Get the latest CID for a DID (general)
   * @param did The DID
   * @returns Latest CID
   */
  async getLatestCID(did: string): Promise<string> {
    return await this.claimsService.getLatestCID(did);
  }

  /**
   * Get total number of claims for a DID (general)
   * @param did The DID
   * @returns Number of claims
   */
  async getClaimsCount(did: string): Promise<number> {
    return await this.claimsService.getClaimsCount(did);
  }

  /**
   * Check if a DID is registered on Filecoin
   * @param did The DID
   * @returns True if registered
   */
  async isDIDRegistered(did: string): Promise<boolean> {
    return await this.claimsService.isDIDRegistered(did);
  }

  /**
   * Get current nonce for a DID
   * @param did The DID
   * @returns Current nonce
   */
  async getCurrentNonce(did: string): Promise<number> {
    return await this.claimsService.getCurrentNonce(did);
  }
}

export default OpenDID;

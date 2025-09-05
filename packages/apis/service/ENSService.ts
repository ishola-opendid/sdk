// ENS Service for managing ENS names and DID registration
import { EthereumProvider } from '../infrastructure/blockchain/EthereumProvider.js';
import type { ENSName } from '../domain/types.js';

export class ENSService {
  private ethereumProvider: EthereumProvider;

  constructor(ethereumProvider: EthereumProvider) {
    this.ethereumProvider = ethereumProvider;
  }

  /**
   * Register a DID for an ENS name
   * @param ensName The ENS name (e.g., "vitalik.eth")
   * @returns Transaction hash
   */
  async registerDID(ensName: string): Promise<string> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    const tx = await openDIDContract.registerDID(ensName);
    return tx.hash;
  }

  /**
   * Check if an ENS name has a DID record
   * @param ensName The ENS name
   * @returns True if DID exists
   */
  async hasDID(ensName: string): Promise<boolean> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    return await openDIDContract.hasDID(ensName);
  }

  /**
   * Get DID record for an ENS name
   * @param ensName The ENS name
   * @returns DID record or empty string
   */
  async getDID(ensName: string): Promise<string> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    return await openDIDContract.getDID(ensName);
  }

  /**
   * Get ENS name information
   * @param ensName The ENS name
   * @returns ENS name information
   */
  async getENSNameInfo(ensName: string): Promise<ENSName> {
    const owner = await this.ethereumProvider.getENSOwner(ensName);
    const resolver = await this.ethereumProvider.getENSResolver(ensName);
    const hasDID = await this.hasDID(ensName);
    
    return {
      name: ensName,
      node: await this.getNamehash(ensName),
      owner,
      resolver,
      hasDID
    };
  }

  /**
   * Get the namehash of an ENS name
   * @param name The ENS name
   * @returns The namehash
   */
  async getNamehash(name: string): Promise<string> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    return await openDIDContract.getNamehash(name);
  }

  /**
   * Check if the current signer owns an ENS name
   * @param ensName The ENS name
   * @returns True if owned by current signer
   */
  async ownsENSName(ensName: string): Promise<boolean> {
    const signerAddress = await this.ethereumProvider.getAddress();
    return await this.ethereumProvider.ownsENSName(ensName, signerAddress);
  }

  /**
   * Generate a claim message for adding a claim to Filecoin
   * @param ensName The ENS name
   * @param cid The IPFS CID
   * @param claimType The claim type
   * @returns Message hash to be signed
   */
  async generateClaimMessage(
    ensName: string,
    cid: string,
    claimType: string
  ): Promise<string> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    return await openDIDContract.generateClaimMessage(ensName, cid, claimType);
  }

  /**
   * Generate a registration message for registering DID on Filecoin
   * @param ensName The ENS name
   * @returns Message hash to be signed
   */
  async generateRegistrationMessage(ensName: string): Promise<string> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    return await openDIDContract.generateRegistrationMessage(ensName);
  }

  /**
   * Get nonce for a user
   * @param user The user address
   * @returns Current nonce
   */
  async getNonce(user: string): Promise<number> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    return await openDIDContract.getNonce(user);
  }

  /**
   * Increment nonce after successful operation
   * @param user The user address
   * @returns Transaction hash
   */
  async incrementNonce(user: string): Promise<string> {
    const openDIDContract = this.ethereumProvider.getOpenDIDContract();
    const tx = await openDIDContract.incrementNonce(user);
    return tx.hash;
  }

  /**
   * Sign a message hash
   * @param messageHash The message hash to sign
   * @returns Signature
   */
  async signMessage(messageHash: string): Promise<string> {
    return await this.ethereumProvider.signMessage(messageHash);
  }
}

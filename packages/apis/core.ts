import * as did from "./did.js";
import { encryptDidDoc } from "./encrypt.js";
import { decryptDidDoc } from "./decrypt.js";
import {
  makeRecipientKeypair,
  importRecipientPublicKey,
  importRecipientPrivateKey,
} from "./keys.js";
import type { JWK } from "jose";
interface IPFSResponse {
  Hash: string;
  Name: string;
  Size: string;
}

interface ChainClaimData {
  cid: string;
  timestamp: number;
  issuerId: string;
  subjectId: string;
}

class CoreAPI {
  private recipientKeyPair: { pubJwk: JWK; privJwk: JWK } | null = null;
  private ipfsEndpoint: string;
  private contractAddress: string;
  private web3Provider: any; // Replace with actual Web3/ethers provider type

  constructor(
    config: {
      ipfsEndpoint?: string;
      contractAddress?: string;
      web3Provider?: any;
    } = {}
  ) {
    this.ipfsEndpoint = config.ipfsEndpoint || "http://localhost:5001";
    this.contractAddress = config.contractAddress || "";
    this.web3Provider = config.web3Provider;
  }

  // Initialize encryption keys (should be called once during setup)
  async initialize() {
    if (!this.recipientKeyPair) {
      this.recipientKeyPair = await makeRecipientKeypair();
    }
  }

  // Core API methods
  async issueClaim(did: did.DIDDocument): Promise<string> {
    await this.ensureInitialized();

    // Implementation for issuing a claim
    // Encrypt the claim data
    const encrypted = await this.encryptClaim(did);

    // Store claim data on IPFS and return CID
    const cid = await this.ipfsUpload(encrypted);

    // Interact with smart contract to store claim CID
    await this.storeOnChain(did.issuerId, did.subjectId, cid);

    return cid;
  }

  async verifyClaim(
    issuerId: string,
    claimId: string
  ): Promise<did.DIDDocument> {
    await this.ensureInitialized();

    // Implementation for verifying a claim
    // Get encrypted claim from blockchain
    const chainData = await this.getClaimFromChain(issuerId, claimId);

    // Retrieve encrypted data from IPFS
    const encrypted = await this.ipfsRetrieve(chainData.cid);

    // Decrypt and validate the claim
    const didDoc = await this.decryptClaim(encrypted);

    // Additional validation
    this.validateClaimIntegrity(didDoc, issuerId, chainData);

    return didDoc;
  }

  async bulkIssueClaims(dids: did.DIDDocument[]): Promise<string[]> {
    // Implementation for bulk issuing claims
    const cids = await Promise.all(
      dids.map(async (d) => await this.issueClaim(d))
    );
    return cids;
  }

  async bulkVerifyClaims(
    issuerId: string,
    claimIds: string[]
  ): Promise<did.DIDDocument[]> {
    // Implementation for bulk verifying claims
    const dids = await Promise.all(
      claimIds.map((id) => this.verifyClaim(issuerId, id))
    );
    return dids;
  }

  // Private helper methods
  private async ensureInitialized(): Promise<void> {
    if (!this.recipientKeyPair) {
      await this.initialize();
    }
  }

  private async encryptClaim(didDoc: did.DIDDocument): Promise<string> {
    if (!this.recipientKeyPair) {
      throw new Error("CoreAPI not initialized. Call initialize() first.");
    }

    try {
      const encrypted = await encryptDidDoc(
        didDoc,
        this.recipientKeyPair.pubJwk
      );
      return encrypted;
    } catch (error) {
      throw new Error(
        `Failed to encrypt claim: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  private async decryptClaim(encrypted: string): Promise<did.DIDDocument> {
    if (!this.recipientKeyPair) {
      throw new Error("CoreAPI not initialized. Call initialize() first.");
    }

    try {
      // Decrypt the claim
      const decryptedData = await decryptDidDoc(
        encrypted,
        this.recipientKeyPair.privJwk
      );

      // Validate the structure of the decrypted data to match DIDDocument
      this.validateDIDDocumentStructure(decryptedData);

      return decryptedData as did.DIDDocument;
    } catch (error) {
      throw new Error(
        `Failed to decrypt claim: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async ipfsUpload(encrypted: string): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([encrypted], { type: "application/json" });
      formData.append("file", blob);

      const response = await fetch(`${this.ipfsEndpoint}/api/v0/add`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result: IPFSResponse = await response.json();
      return result.Hash;
    } catch (error) {
      throw new Error(
        `IPFS upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async ipfsRetrieve(cid: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.ipfsEndpoint}/api/v0/cat?arg=${cid}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`IPFS retrieval failed: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      throw new Error(
        `IPFS retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async storeOnChain(
    issuerId: string,
    subjectId: string,
    cid: string
  ): Promise<void> {
    if (!this.web3Provider || !this.contractAddress) {
      throw new Error("Web3 provider and contract address must be configured");
    }

    try {
      // This is a simplified example - replace with actual smart contract interaction
      // Using a generic contract call pattern
      const contract = new this.web3Provider.eth.Contract(
        // ABI would be defined elsewhere
        [],
        this.contractAddress
      );

      const timestamp = Math.floor(Date.now() / 1000);

      // Example contract method call - adjust according to your smart contract
      await contract.methods
        .storeClaim(issuerId, subjectId, cid, timestamp)
        .send({
          from: await this.web3Provider.eth
            .getAccounts()
            .then((accounts: string[]) => accounts[0]),
        });
    } catch (error) {
      throw new Error(
        `Failed to store claim on chain: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async getClaimFromChain(
    issuerId: string,
    claimId: string
  ): Promise<ChainClaimData> {
    if (!this.web3Provider || !this.contractAddress) {
      throw new Error("Web3 provider and contract address must be configured");
    }

    try {
      // This is a simplified example - replace with actual smart contract interaction
      const contract = new this.web3Provider.eth.Contract(
        // ABI would be defined elsewhere
        [],
        this.contractAddress
      );

      const result = await contract.methods.getClaim(issuerId, claimId).call();

      return {
        cid: result.cid,
        timestamp: parseInt(result.timestamp),
        issuerId: result.issuerId,
        subjectId: result.subjectId,
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve claim from chain: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Validation helper methods
  private validateDIDDocumentStructure(data: any): void {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid DID document: not an object");
    }

    // Check required fields for a DID document
    const requiredFields = ["@context", "id", "issuerId", "subjectId"];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(
          `Invalid DID document: missing required field '${field}'`
        );
      }
    }

    // Validate DID format (simplified)
    if (!data.id.startsWith("did:")) {
      throw new Error("Invalid DID document: id must start with 'did:'");
    }
  }

  private validateClaimIntegrity(
    didDoc: did.DIDDocument,
    expectedIssuerId: string,
    chainData: ChainClaimData
  ): void {
    // Validate the issuerId matches
    if (didDoc.issuerId !== expectedIssuerId) {
      throw new Error(
        `Claim integrity violation: issuer ID mismatch. Expected: ${expectedIssuerId}, Got: ${didDoc.issuerId}`
      );
    }

    // Validate the subjectId matches chain data
    if (didDoc.subjectId !== chainData.subjectId) {
      throw new Error(
        `Claim integrity violation: subject ID mismatch. Expected: ${chainData.subjectId}, Got: ${didDoc.subjectId}`
      );
    }

    // Additional validation could include:
    // - Signature verification
    // - Zero-knowledge proof validation
    // - Timestamp validation
    // - Issuer authority validation

    console.log("Claim integrity validated successfully");
  }

  // Utility methods for key management
  async exportPublicKey(): Promise<JWK | null> {
    return this.recipientKeyPair?.pubJwk || null;
  }

  async setKeyPair(pubJwk: JWK, privJwk: JWK): Promise<void> {
    // Validate the key pair before setting
    try {
      await importRecipientPublicKey(pubJwk);
      await importRecipientPrivateKey(privJwk);
      this.recipientKeyPair = { pubJwk, privJwk };
    } catch (error) {
      throw new Error(
        `Invalid key pair: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

export default CoreAPI;

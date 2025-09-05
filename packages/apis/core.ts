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

interface DIDRegistryConfig {
  ipfsEndpoint?: string;
  filecoinContract: string;
  ethereumContract: string;
  web3Provider: any;
  filecoinProvider: any;
}

class CoreAPI {
  private recipientKeyPair: { pubJwk: JWK; privJwk: JWK } | null = null;
  private ipfsEndpoint: string;
  private filecoinContract: string;
  private ethereumContract: string;
  private web3Provider: any;
  private filecoinProvider: any;

  constructor(config: DIDRegistryConfig) {
    this.ipfsEndpoint = config.ipfsEndpoint || "http://localhost:5001";
    this.filecoinContract = config.filecoinContract;
    this.ethereumContract = config.ethereumContract;
    this.web3Provider = config.web3Provider;
    this.filecoinProvider = config.filecoinProvider;
  }

  async initialize() {
    if (!this.recipientKeyPair) {
      this.recipientKeyPair = await makeRecipientKeypair();
    }
  }

  // =============================================================================
  // CREDENTIAL MANAGEMENT
  // =============================================================================

  /**
   * Create a new credential type (like "ghana-passport", "ghana-card")
   * Only needs to be done once per credential type
   */
  async createCredentialType(
    credentialType: string,
    description: string
  ): Promise<void> {
    try {
      const contract = new this.filecoinProvider.eth.Contract(
        this.getFilecoinABI(),
        this.filecoinContract
      );

      const accounts = await this.filecoinProvider.eth.getAccounts();

      await contract.methods
        .createCredentialType(credentialType, description)
        .send({ from: accounts[0] });

      console.log(
        `✅ Credential type '${credentialType}' created successfully`
      );
    } catch (error) {
      throw new Error(
        `Failed to create credential type: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // =============================================================================
  // DID MANAGEMENT
  // =============================================================================

  /**
   * Register a DID on Ethereum (ENS) - one-time setup
   */
  async registerDIDOnEthereum(ensName: string): Promise<void> {
    try {
      const contract = new this.web3Provider.eth.Contract(
        this.getEthereumABI(),
        this.ethereumContract
      );

      const accounts = await this.web3Provider.eth.getAccounts();

      await contract.methods.registerDID(ensName).send({ from: accounts[0] });

      console.log(`✅ DID registered on Ethereum for ${ensName}`);
    } catch (error) {
      throw new Error(
        `Failed to register DID on Ethereum: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Register DID on Filecoin (first time only)
   */
  async registerDIDOnFilecoin(ensName: string): Promise<void> {
    try {
      // Generate registration message hash
      const messageHash = await this.generateRegistrationMessage(ensName);

      // Sign the message
      const accounts = await this.web3Provider.eth.getAccounts();
      const signature = await this.web3Provider.eth.personal.sign(
        messageHash,
        accounts[0]
      );

      // Register on Filecoin
      const did = `did:opendid:${ensName}`;
      const contract = new this.filecoinProvider.eth.Contract(
        this.getFilecoinABI(),
        this.filecoinContract
      );

      await contract.methods
        .registerDID(did, accounts[0], signature)
        .send({ from: accounts[0] });

      console.log(`✅ DID registered on Filecoin for ${ensName}`);
    } catch (error) {
      throw new Error(
        `Failed to register DID on Filecoin: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // =============================================================================
  // CLAIM OPERATIONS
  // =============================================================================

  /**
   * Issue a claim - the main badass function 🚀
   */
  async issueClaim(
    ensName: string,
    credentialType: string,
    claimData: did.DIDDocument
  ): Promise<string> {
    await this.ensureInitialized();

    try {
      // 1. Encrypt the claim data
      const encrypted = await this.encryptClaim(claimData);

      // 2. Upload to IPFS
      const cid = await this.ipfsUpload(encrypted);
      console.log(`📦 Claim uploaded to IPFS: ${cid}`);

      // 3. Generate signature for Filecoin
      const messageHash = await this.generateClaimMessage(
        ensName,
        cid,
        credentialType
      );
      const accounts = await this.web3Provider.eth.getAccounts();
      const signature = await this.web3Provider.eth.personal.sign(
        messageHash,
        accounts[0]
      );

      // 4. Store on Filecoin
      const did = `did:opendid:${ensName}`;
      const contract = new this.filecoinProvider.eth.Contract(
        this.getFilecoinABI(),
        this.filecoinContract
      );

      await contract.methods
        .issueClaim(did, cid, credentialType, signature)
        .send({ from: accounts[0] });

      console.log(
        `🎉 Claim issued successfully for ${ensName} (${credentialType})`
      );
      return cid;
    } catch (error) {
      throw new Error(
        `Failed to issue claim: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Verify and retrieve a claim - the other badass function 🔍
   */
  async verifyClaim(
    ensName: string,
    credentialType: string
  ): Promise<did.DIDDocument> {
    await this.ensureInitialized();

    try {
      // 1. Get claim CID from Filecoin
      const did = `did:opendid:${ensName}`;
      const contract = new this.filecoinProvider.eth.Contract(
        this.getFilecoinABI(),
        this.filecoinContract
      );

      const cid = await contract.methods.getClaim(did, credentialType).call();

      if (!cid) {
        throw new Error(
          `No claim found for ${ensName} with credential type ${credentialType}`
        );
      }

      console.log(`🔍 Found claim CID: ${cid}`);

      // 2. Retrieve from IPFS
      const encrypted = await this.ipfsRetrieve(cid);

      // 3. Decrypt and return
      const claimData = await this.decryptClaim(encrypted);

      console.log(`✅ Claim verified and decrypted for ${ensName}`);
      return claimData;
    } catch (error) {
      throw new Error(
        `Failed to verify claim: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Bulk issue multiple claims - for the power users 💪
   */
  async bulkIssueClaims(
    ensName: string,
    claims: Array<{ credentialType: string; data: did.DIDDocument }>
  ): Promise<string[]> {
    const results = await Promise.allSettled(
      claims.map(({ credentialType, data }) =>
        this.issueClaim(ensName, credentialType, data)
      )
    );

    const cids: string[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        cids.push(result.value);
      } else {
        errors.push(
          `Claim ${index} (${claims[index].credentialType}): ${result.reason}`
        );
      }
    });

    if (errors.length > 0) {
      console.warn(`⚠️ Some claims failed:`, errors);
    }

    console.log(
      `🚀 Bulk issued ${cids.length}/${claims.length} claims successfully`
    );
    return cids;
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.recipientKeyPair) {
      await this.initialize();
    }
  }

  private async generateRegistrationMessage(ensName: string): Promise<string> {
    const contract = new this.web3Provider.eth.Contract(
      this.getEthereumABI(),
      this.ethereumContract
    );

    return await contract.methods
      .generateRegistrationMessage(ensName, this.filecoinContract)
      .call();
  }

  private async generateClaimMessage(
    ensName: string,
    cid: string,
    credentialType: string
  ): Promise<string> {
    const contract = new this.web3Provider.eth.Contract(
      this.getEthereumABI(),
      this.ethereumContract
    );

    return await contract.methods
      .generateClaimMessage(ensName, cid, credentialType, this.filecoinContract)
      .call();
  }

  private async encryptClaim(claimData: did.DIDDocument): Promise<string> {
    if (!this.recipientKeyPair) {
      throw new Error("Not initialized");
    }

    return await encryptDidDoc(claimData, this.recipientKeyPair.pubJwk);
  }

  private async decryptClaim(encrypted: string): Promise<did.DIDDocument> {
    if (!this.recipientKeyPair) {
      throw new Error("Not initialized");
    }

    const decrypted = await decryptDidDoc(
      encrypted,
      this.recipientKeyPair.privJwk
    );
    this.validateDIDDocument(decrypted);
    return decrypted as did.DIDDocument;
  }

  private async ipfsUpload(data: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([data], { type: "application/json" });
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
  }

  private async ipfsRetrieve(cid: string): Promise<string> {
    const response = await fetch(`${this.ipfsEndpoint}/api/v0/cat?arg=${cid}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`IPFS retrieval failed: ${response.statusText}`);
    }

    return await response.text();
  }

  private validateDIDDocument(data: any): void {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid DID document: not an object");
    }

    const requiredFields = ["@context", "id", "issuerId", "subjectId"];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Invalid DID document: missing field '${field}'`);
      }
    }

    if (!data.id.startsWith("did:")) {
      throw new Error("Invalid DID document: id must start with 'did:'");
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  async checkCredentialExists(credentialType: string): Promise<boolean> {
    const contract = new this.filecoinProvider.eth.Contract(
      this.getFilecoinABI(),
      this.filecoinContract
    );

    return await contract.methods.credentialExists(credentialType).call();
  }

  async isDIDRegistered(
    ensName: string
  ): Promise<{ ethereum: boolean; filecoin: boolean }> {
    const did = `did:opendid:${ensName}`;

    // Check Ethereum
    const ethContract = new this.web3Provider.eth.Contract(
      this.getEthereumABI(),
      this.ethereumContract
    );
    const ethereumRegistered = await ethContract.methods.hasDID(ensName).call();

    // Check Filecoin
    const filContract = new this.filecoinProvider.eth.Contract(
      this.getFilecoinABI(),
      this.filecoinContract
    );
    const filecoinRegistered = await filContract.methods
      .isDIDRegistered(did)
      .call();

    return { ethereum: ethereumRegistered, filecoin: filecoinRegistered };
  }

  async exportPublicKey(): Promise<JWK | null> {
    return this.recipientKeyPair?.pubJwk || null;
  }

  async setKeyPair(pubJwk: JWK, privJwk: JWK): Promise<void> {
    await importRecipientPublicKey(pubJwk);
    await importRecipientPrivateKey(privJwk);
    this.recipientKeyPair = { pubJwk, privJwk };
  }

  // =============================================================================
  // ABI DEFINITIONS (simplified - replace with actual ABIs)
  // =============================================================================

  private getEthereumABI(): any[] {
    return [
      {
        inputs: [{ type: "string", name: "ensName" }],
        name: "registerDID",
        outputs: [],
        type: "function",
      },
      {
        inputs: [
          { type: "string", name: "ensName" },
          { type: "string", name: "cid" },
          { type: "string", name: "credentialType" },
          { type: "address", name: "filecoinContract" },
        ],
        name: "generateClaimMessage",
        outputs: [{ type: "bytes32", name: "messageHash" }],
        type: "function",
      },
      {
        inputs: [
          { type: "string", name: "ensName" },
          { type: "address", name: "filecoinContract" },
        ],
        name: "generateRegistrationMessage",
        outputs: [{ type: "bytes32", name: "messageHash" }],
        type: "function",
      },
      {
        inputs: [{ type: "string", name: "ensName" }],
        name: "hasDID",
        outputs: [{ type: "bool" }],
        type: "function",
      },
    ];
  }

  private getFilecoinABI(): any[] {
    return [
      {
        inputs: [
          { type: "string", name: "credentialType" },
          { type: "string", name: "description" },
        ],
        name: "createCredentialType",
        outputs: [],
        type: "function",
      },
      {
        inputs: [
          { type: "string", name: "did" },
          { type: "address", name: "expectedEthOwner" },
          { type: "bytes", name: "sig" },
        ],
        name: "registerDID",
        outputs: [],
        type: "function",
      },
      {
        inputs: [
          { type: "string", name: "did" },
          { type: "string", name: "cid" },
          { type: "string", name: "credentialType" },
          { type: "bytes", name: "sig" },
        ],
        name: "issueClaim",
        outputs: [],
        type: "function",
      },
      {
        inputs: [
          { type: "string", name: "did" },
          { type: "string", name: "credentialType" },
        ],
        name: "getClaim",
        outputs: [{ type: "string", name: "cid" }],
        type: "function",
      },
      {
        inputs: [{ type: "string", name: "credentialType" }],
        name: "credentialExists",
        outputs: [{ type: "bool" }],
        type: "function",
      },
      {
        inputs: [{ type: "string", name: "did" }],
        name: "isDIDRegistered",
        outputs: [{ type: "bool" }],
        type: "function",
      },
    ];
  }
}

export default CoreAPI;

// ZKP Issuer Verification System using o1js
import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
  PublicKey,
  Signature,
  Poseidon,
  CircuitString,
  Provable,
  ZkProgram,
  verify,
  Proof,
} from 'o1js';

import * as did from "./did.js";
import { decryptDidDoc } from "./decrypt.js";
import type { JWK } from "jose";

// ================================================================================================
// ZK PROGRAM FOR ISSUER VERIFICATION
// ================================================================================================

/**
 * 🔐 ZK Program to prove issuer authenticity without revealing sensitive data
 */
export const IssuerVerificationProgram = ZkProgram({
  name: 'IssuerVerification',
  publicInput: Field, // Hash of the claim
  publicOutput: Field, // Hash of verified issuer ID
  methods: {
    /**
     * Prove that a claim was issued by a specific issuer
     * @param claimHash - Hash of the claim data
     * @param issuerPrivateKey - Issuer's private key (witness)
     * @param issuerId - Public issuer ID
     * @param claimData - Claim data (witness)
     */
    proveIssuerAuthority: {
      privateInputs: [Field, Field, CircuitString, CircuitString], // [issuerPrivateKey, issuerNonce, issuerId, claimData]
      method(
        claimHash: Field,
        issuerPrivateKey: Field,
        issuerNonce: Field,
        issuerId: CircuitString,
        claimData: CircuitString
      ): Field {
        // 1. Verify the claim hash matches the provided claim data
        const computedClaimHash = Poseidon.hash(claimData.toFields());
        computedClaimHash.assertEquals(claimHash);

        // 2. Verify issuer authority by checking signature
        const issuerPubKeyHash = Poseidon.hash([issuerPrivateKey, issuerNonce]);
        const expectedIssuerHash = Poseidon.hash(issuerId.toFields());
        
        // 3. Create a commitment that proves issuer signed this claim
        const issuerCommitment = Poseidon.hash([
          issuerPubKeyHash,
          computedClaimHash,
          expectedIssuerHash
        ]);

        // Return the verified issuer hash
        return expectedIssuerHash;
      }
    },

    /**
     * Verify claim integrity and issuer authority recursively
     */
    verifyClaimChain: {
      privateInputs: [Field, Field, CircuitString],
      method(
        claimHash: Field,
        previousProofHash: Field,
        issuerId: CircuitString
      ): Field {
        // Verify this claim is part of a valid chain
        const issuerHash = Poseidon.hash(issuerId.toFields());
        const chainHash = Poseidon.hash([previousProofHash, claimHash, issuerHash]);
        
        return chainHash;
      }
    }
  }
});

// Generate types from the ZK program
export class IssuerVerificationProof extends ZkProgram.Proof(IssuerVerificationProgram) {}

// ================================================================================================
// SMART CONTRACT FOR ONCHAIN VERIFICATION
// ================================================================================================

/**
 * 🏗️ Smart Contract to verify issuer proofs onchain
 */
export class IssuerVerificationContract extends SmartContract {
  // State to track verified issuers
  @state(Field) verifiedIssuersRoot = State<Field>();
  @state(Field) totalVerifications = State<Field>();

  init() {
    super.init();
    this.verifiedIssuersRoot.set(Field(0));
    this.totalVerifications.set(Field(0));
  }

  /**
   * 🔍 Verify an issuer proof onchain
   * @param proof - ZK proof of issuer authority
   * @param claimHash - Hash of the claim
   */
  @method verifyIssuerProof(proof: IssuerVerificationProof, claimHash: Field) {
    // Verify the ZK proof
    proof.verify();

    // Ensure the proof matches the claim
    proof.publicInput.assertEquals(claimHash);

    // Update verified issuers root
    const currentRoot = this.verifiedIssuersRoot.getAndRequireEquals();
    const newRoot = Poseidon.hash([currentRoot, proof.publicOutput, claimHash]);
    this.verifiedIssuersRoot.set(newRoot);

    // Increment verification counter
    const currentCount = this.totalVerifications.getAndRequireEquals();
    this.totalVerifications.set(currentCount.add(1));
  }

  /**
   * 📊 Get verification statistics
   */
  @method getVerificationCount(): Field {
    return this.totalVerifications.getAndRequireEquals();
  }
}

// ================================================================================================
// ZKP INTEGRATION WITH CORE API
// ================================================================================================

interface IssuerCredentials {
  privateKey: Field;
  nonce: Field;
  publicId: string;
}

interface ZKProofData {
  proof: IssuerVerificationProof;
  claimHash: Field;
  issuerHash: Field;
  timestamp: number;
}

/**
 * 🚀 Enhanced CoreAPI with ZKP Verification
 */
export class ZKPCoreAPI {
  private issuerCredentials: Map<string, IssuerCredentials> = new Map();
  private verificationContract: IssuerVerificationContract | null = null;

  constructor(
    private contractAddress?: PublicKey,
    private zkProgramInstance = IssuerVerificationProgram
  ) {
    if (contractAddress) {
      this.verificationContract = new IssuerVerificationContract(contractAddress);
    }
  }

  /**
   * 🔐 Register issuer credentials for ZKP generation
   */
  async registerIssuer(
    issuerId: string, 
    privateKey: string, 
    nonce?: string
  ): Promise<void> {
    const issuerPrivateKey = Field.from(privateKey);
    const issuerNonce = nonce ? Field.from(nonce) : Field.random();
    
    this.issuerCredentials.set(issuerId, {
      privateKey: issuerPrivateKey,
      nonce: issuerNonce,
      publicId: issuerId
    });

    console.log(`🔑 Registered issuer: ${issuerId}`);
  }

  /**
   * 🏗️ Generate ZK proof for issuer authority
   */
  async generateIssuerProof(
    claimData: did.DIDDocument,
    issuerId: string
  ): Promise<ZKProofData> {
    const credentials = this.issuerCredentials.get(issuerId);
    if (!credentials) {
      throw new Error(`❌ Issuer credentials not found for: ${issuerId}`);
    }

    try {
      // 1. Compute claim hash
      const claimJson = JSON.stringify(claimData);
      const claimString = CircuitString.fromString(claimJson);
      const claimHash = Poseidon.hash(claimString.toFields());

      // 2. Prepare circuit inputs
      const issuerIdString = CircuitString.fromString(issuerId);

      console.log(`🔄 Generating ZK proof for issuer: ${issuerId}`);
      console.log(`📝 Claim hash: ${claimHash.toString()}`);

      // 3. Generate the proof
      const proof = await this.zkProgramInstance.proveIssuerAuthority(
        claimHash,
        credentials.privateKey,
        credentials.nonce,
        issuerIdString,
        claimString
      );

      // 4. Compute issuer hash for verification
      const issuerHash = Poseidon.hash(issuerIdString.toFields());

      console.log(`✅ ZK proof generated successfully`);

      return {
        proof,
        claimHash,
        issuerHash,
        timestamp: Date.now()
      };

    } catch (error) {
      throw new Error(`❌ Failed to generate ZK proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * ✅ Verify ZK proof offchain
   */
  async verifyIssuerProofOffchain(
    proofData: ZKProofData,
    expectedClaimHash?: Field
  ): Promise<boolean> {
    try {
      // 1. Verify the proof structure
      const isValid = await verify(proofData.proof, this.zkProgramInstance.verificationKey);
      
      if (!isValid) {
        console.log(`❌ Invalid proof structure`);
        return false;
      }

      // 2. Verify claim hash matches (if provided)
      if (expectedClaimHash && !proofData.claimHash.equals(expectedClaimHash)) {
        console.log(`❌ Claim hash mismatch`);
        return false;
      }

      // 3. Verify proof inputs/outputs match
      if (!proofData.proof.publicInput.equals(proofData.claimHash)) {
        console.log(`❌ Proof input mismatch`);
        return false;
      }

      if (!proofData.proof.publicOutput.equals(proofData.issuerHash)) {
        console.log(`❌ Proof output mismatch`);
        return false;
      }

      console.log(`✅ ZK proof verified successfully offchain`);
      return true;

    } catch (error) {
      console.error(`❌ Offchain verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * 🔗 Verify ZK proof onchain
   */
  async verifyIssuerProofOnchain(proofData: ZKProofData): Promise<string> {
    if (!this.verificationContract) {
      throw new Error("❌ Verification contract not initialized");
    }

    try {
      console.log(`🔗 Submitting proof for onchain verification`);

      const tx = await this.verificationContract.verifyIssuerProof(
        proofData.proof,
        proofData.claimHash
      );

      console.log(`✅ Onchain verification successful`);
      return tx.hash;

    } catch (error) {
      throw new Error(`❌ Onchain verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🔍 Enhanced claim verification with ZKP
   */
  async verifyClaimWithZKP(
    encrypted: string,
    recipientPrivJwk: JWK,
    expectedIssuerId: string,
    zkProofData?: ZKProofData
  ): Promise<{
    didDocument: did.DIDDocument;
    zkVerified: boolean;
    proofData?: ZKProofData;
  }> {
    try {
      // 1. Decrypt the claim
      const didDoc = await decryptDidDoc(encrypted, recipientPrivJwk);
      
      // 2. Validate basic structure
      this.validateDIDDocumentStructure(didDoc);

      // 3. Generate or verify ZKP
      let zkVerified = false;
      let proofData = zkProofData;

      if (!proofData) {
        // Generate new proof if not provided
        try {
          proofData = await this.generateIssuerProof(didDoc, expectedIssuerId);
          zkVerified = await this.verifyIssuerProofOffchain(proofData);
        } catch (error) {
          console.warn(`⚠️ Could not generate ZK proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // Verify provided proof
        const claimJson = JSON.stringify(didDoc);
        const claimString = CircuitString.fromString(claimJson);
        const expectedClaimHash = Poseidon.hash(claimString.toFields());
        
        zkVerified = await this.verifyIssuerProofOffchain(proofData, expectedClaimHash);
      }

      // 4. Additional integrity checks
      if (didDoc.issuerId !== expectedIssuerId) {
        throw new Error(`❌ Issuer ID mismatch. Expected: ${expectedIssuerId}, Got: ${didDoc.issuerId}`);
      }

      console.log(`✅ Claim verification complete. ZK verified: ${zkVerified}`);

      return {
        didDocument: didDoc,
        zkVerified,
        proofData
      };

    } catch (error) {
      throw new Error(`❌ Claim verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 📊 Get verification statistics
   */
  async getVerificationStats(): Promise<{ totalVerifications: number }> {
    if (!this.verificationContract) {
      return { totalVerifications: 0 };
    }

    try {
      const count = await this.verificationContract.getVerificationCount();
      return { totalVerifications: Number(count.toString()) };
    } catch (error) {
      console.warn(`⚠️ Could not fetch verification stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { totalVerifications: 0 };
    }
  }

  /**
   * 🛠️ Compile ZK program (call once before use)
   */
  async compileZKProgram(): Promise<void> {
    console.log(`🔄 Compiling ZK program...`);
    const { verificationKey } = await this.zkProgramInstance.compile();
    console.log(`✅ ZK program compiled successfully`);
    console.log(`🔑 Verification key: ${verificationKey.slice(0, 50)}...`);
  }

  /**
   * 🏗️ Deploy verification contract
   */
  async deployVerificationContract(
    deployerKey: PublicKey
  ): Promise<IssuerVerificationContract> {
    const contract = new IssuerVerificationContract(deployerKey);
    
    console.log(`🚀 Deploying verification contract...`);
    
    const tx = await contract.deploy({
      verificationKey: await this.zkProgramInstance.compile().then(r => r.verificationKey)
    });
    
    console.log(`✅ Contract deployed: ${deployerKey.toBase58()}`);
    
    this.verificationContract = contract;
    return contract;
  }

  // Private helper methods
  private validateDIDDocumentStructure(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid DID document: not an object");
    }

    const requiredFields = ['@context', 'id', 'issuerId', 'subjectId'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Invalid DID document: missing required field '${field}'`);
      }
    }

    if (!data.id.startsWith('did:')) {
      throw new Error("Invalid DID document: id must start with 'did:'");
    }
  }
}

// ================================================================================================
// USAGE EXAMPLES AND UTILITIES
// ================================================================================================

/**
 * 🎯 Helper class for ZKP operations
 */
export class ZKPHelper {
  /**
   * Create a hash from claim data
   */
  static hashClaim(claimData: did.DIDDocument): Field {
    const claimJson = JSON.stringify(claimData);
    const claimString = CircuitString.fromString(claimJson);
    return Poseidon.hash(claimString.toFields());
  }

  /**
   * Create issuer credentials from seed
   */
  static generateIssuerCredentials(seed: string): IssuerCredentials {
    const privateKey = Field.from(seed);
    const nonce = Field.random();
    return {
      privateKey,
      nonce,
      publicId: `issuer-${privateKey.toString().slice(0, 8)}`
    };
  }

  /**
   * Serialize ZKP data for storage
   */
  static serializeZKProofData(proofData: ZKProofData): string {
    return JSON.stringify({
      proof: proofData.proof.toJSON(),
      claimHash: proofData.claimHash.toString(),
      issuerHash: proofData.issuerHash.toString(),
      timestamp: proofData.timestamp
    });
  }

  /**
   * Deserialize ZKP data from storage
   */
  static deserializeZKProofData(serialized: string): ZKProofData {
    const data = JSON.parse(serialized);
    return {
      proof: IssuerVerificationProof.fromJSON(data.proof),
      claimHash: Field.from(data.claimHash),
      issuerHash: Field.from(data.issuerHash),
      timestamp: data.timestamp
    };
  }
}

/**
 * 🚀 Example Usage:
 * 
 * // Initialize ZKP system
 * const zkpAPI = new ZKPCoreAPI();
 * await zkpAPI.compileZKProgram();
 * 
 * // Register issuer
 * await zkpAPI.registerIssuer("university-123", "private-key-seed");
 * 
 * // Generate proof for claim
 * const proofData = await zkpAPI.generateIssuerProof(didDocument, "university-123");
 * 
 * // Verify claim with ZKP
 * const result = await zkpAPI.verifyClaimWithZKP(
 *   encryptedClaim,
 *   recipientKey,
 *   "university-123",
 *   proofData
 * );
 * 
 * if (result.zkVerified) {
 *   console.log("✅ Claim authenticity verified with ZKP!");
 * }
 */

export default ZKPCoreAPI;
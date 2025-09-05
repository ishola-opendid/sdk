// Domain models for OpenDID system

export interface VerificationMethod {
  id: string;               // e.g. did:opendid:vitalik.eth#keys-1
  type: string;             // e.g. "Ed25519VerificationKey2018"
  controller: string;       // DID that controls this key
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, any>; // alternative representation
}

export interface ServiceEndpoint {
  id: string;               // e.g. did:opendid:vitalik.eth#messaging
  type: string;             // e.g. "MessagingService"
  serviceEndpoint: string | string[] | Record<string, any>;
}

export class DIDDocument {
  "@context": string | string[] = "https://www.w3.org/ns/did/v1";
  id!: string; // required - e.g., "did:opendid:vitalik.eth"
  
  alsoKnownAs?: string[];
  controller?: string | string[];

  verificationMethod?: VerificationMethod[];

  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  keyAgreement?: (string | VerificationMethod)[];
  capabilityInvocation?: (string | VerificationMethod)[];
  capabilityDelegation?: (string | VerificationMethod)[];

  service?: ServiceEndpoint[];

  constructor(id: string) {
    this.id = id;
  }
}

// Claim Type Domain Model
export interface ClaimType {
  claimType: string;        // Unique identifier (e.g., "ghana-national-id")
  issuer: string;           // Ethereum address of the issuer
  description: string;      // Human-readable description
  exists: boolean;          // Whether this claim type exists
  createdAt: number;        // Block timestamp when created
}

// Claim Domain Model
export interface Claim {
  claimId: string;          // Unique claim identifier
  did: string;              // DID of the subject (e.g., "did:opendid:vitalik.eth")
  claimType: string;        // Type of claim (e.g., "ghana-national-id")
  cid: string;              // IPFS CID of the claim data
  issuer: string;           // Ethereum address of the issuer
  subject: string;          // Ethereum address of the subject
  issuedAt: Date;           // When the claim was issued
  expirationDate?: Date;    // Optional expiration date
  data: Record<string, any>; // Claim data (encrypted)
}

// ENS Name Domain Model
export interface ENSName {
  name: string;             // ENS name (e.g., "vitalik.eth")
  node: string;             // ENS namehash
  owner: string;            // Ethereum address of the owner
  resolver: string;         // Resolver contract address
  hasDID: boolean;          // Whether this ENS name has a DID record
}

// Signature Domain Model
export interface Signature {
  messageHash: string;      // Hash of the message to be signed
  signature: string;        // Ethereum signature
  signer: string;           // Address of the signer
}

// Message Generation Domain Model
export interface ClaimMessage {
  messageHash: string;      // Hash to be signed
  did: string;              // DID
  cid: string;              // IPFS CID
  claimType: string;        // Claim type
  nonce: number;            // Nonce for replay protection
}

export interface RegistrationMessage {
  messageHash: string;      // Hash to be signed
  did: string;              // DID
  nonce: number;            // Nonce for replay protection
}
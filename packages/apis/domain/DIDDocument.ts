// did-document.ts
export interface VerificationMethod {
  id: string; // e.g. did:example:123#keys-1
  type: string; // e.g. "Ed25519VerificationKey2018"
  controller: string; // DID that controls this key
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, any>; // alternative representation
}

export interface ServiceEndpoint {
  id: string; // e.g. did:example:123#messaging
  type: string; // e.g. "MessagingService"
  serviceEndpoint: string | string[] | Record<string, any>;
}

export class DIDDocument {
  "@context": string | string[] = "https://www.w3.org/ns/did/v1";
  id!: string; // required

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

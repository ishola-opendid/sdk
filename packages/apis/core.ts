import * as did from "./did.js";
class CoreAPI {
  // Core API methods would be defined here
  issueClaim(did: did.DIDDocument) {
    // Implementation for issuing a claim
    // Encrypt the claim data
    // Store claim data on IPFS and return CID
    // Interact with smart contract to store claim on CID
  }
  verifyClaim(issuerId: string, claimId: string) {
    // Implementation for verifying a claim
  }
  bulkIssueClaims(dids: did.DIDDocument[]) {
    // Implementation for bulk issuing claims
  }
  bulkVerifyClaims(issuerId: string, claimIds: string[]) {
    // Implementation for bulk verifying claims
  }
}
// sdk takes user data, encrypts it, smart contract would store it on the blockchain,
// store it on ipfs, and return cid

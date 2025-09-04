import * as did from "./did.js";
class CoreAPI {
  // Core API methods would be defined here
  async issueClaim(did: did.DIDDocument) {
    // Implementation for issuing a claim
    // Encrypt the claim data
    // Store claim data on IPFS and return CID
    // Interact with smart contract to store claim on CID
    const encrypted = await this.encryptClaim(did); // local crypto
    const cid = await this.ipfsUpload(encrypted); // store to IPFS
    this.storeOnChain(did.issuerId, did.subjectId, cid); // store to smart contract
    return cid;
  }
  verifyClaim(issuerId: string, claimId: string) {
    // Implementation for verifying a claim
    const encrypted = this.getClaimFromChain(issuerId, claimId); // get from smart contract
    const did = this.decryptClaim(encrypted); // local crypto
    return did;
  }
  bulkIssueClaims(dids: did.DIDDocument[]) {
    // Implementation for bulk issuing claims
    const cids = dids.map(async (d) => await this.issueClaim(d));
    return cids;
  }
  bulkVerifyClaims(issuerId: string, claimIds: string[]) {
    // Implementation for bulk verifying claims
    const dids = claimIds.map((id) => this.verifyClaim(issuerId, id));
    return dids;
  }

  private async encryptClaim(did: did.DIDDocument): Promise<string> {
    throw new Error("Function not implemented.");
  }

  private async ipfsUpload(encrypted: string): Promise<string> {
    throw new Error("Function not implemented.");
  }
  private storeOnChain(issuerId: string, subjectId: string, cid: string) {
    throw new Error("Function not implemented.");
  }
  private getClaimFromChain(issuerId: string, claimId: string): string {
    throw new Error("Function not implemented.");
  }
  private decryptClaim(encrypted: string): did.DIDDocument {
    throw new Error("Function not implemented.");
    // must validate the structure of the decrypted data to match DIDDocument
    // must validate the issuerId and subjectId match
    // must validate with zkps
  }
}

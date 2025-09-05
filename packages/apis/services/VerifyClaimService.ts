import { ClaimDocument } from "../domain/did.js";
import { KeyPair } from "../domain/types.js";
import { EncryptionService } from "../infra/EncryptionService.js";
import { FilecoinService } from "../infra/FilecoinService.js";
import { IpfsService } from "../infra/IpfsService.js";

export class VerifyClaimService {
  constructor(
    private readonly filecoinService: FilecoinService,
    private readonly ipfsService: IpfsService
  ) {}

  async execute(
    ensName: string,
    credentialType: string,
    keyPair: KeyPair
  ): Promise<ClaimDocument> {
    // 1. Get claim CID from Filecoin
    const did = `did:opendid:${ensName}`;
    const cid = await this.filecoinService.getClaim(did, credentialType);

    if (!cid) {
      throw new Error(
        `No claim found for ${ensName} with credential type ${credentialType}`
      );
    }
    console.log(`🔍 Found claim CID: ${cid}`);

    // 2. Retrieve from IPFS
    const encrypted = await this.ipfsService.retrieve(cid);

    // 3. Decrypt and return
    const claimData = await EncryptionService.decrypt(encrypted, keyPair.privJwk);

    console.log(`✅ Claim verified and decrypted for ${ensName}`);
    return claimData;
  }
}
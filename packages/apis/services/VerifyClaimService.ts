import { type ClaimDocument } from "../domain/did.js";
import { type KeyPair } from "../domain/types.js";
import { EncryptionService } from "../infra/EncryptionService.js";
import { FilecoinService } from "../infra/FilecoinService.js";
import { FilecoinStorage } from "../infra/FilecoinStorageService.js";

export class VerifyClaimService {
  constructor(
    private readonly filecoinService: FilecoinService,
    private readonly filecoinStorage: FilecoinStorage
  ) {}

  async execute(
    ensName: string,
    credentialType: string,
    keyPair: KeyPair
  ): Promise<ClaimDocument> {
    // 1. Get claim identifier (commp) from Filecoin contract
    const did = `did:opendid:${ensName}`;
    const commp = await this.filecoinService.getClaim(did, credentialType);

    if (!commp) {
      throw new Error(
        `No claim found for ${ensName} with credential type ${credentialType}`
      );
    }
    console.log(`🔍 Found claim identifier: ${commp}`);

    // 2. Retrieve from Filecoin Storage
    const encrypted = await this.filecoinStorage.retrieve(commp);

    // 3. Decrypt and return
    const claimData = await EncryptionService.decrypt(
      encrypted,
      keyPair.privJwk
    );

    console.log(`✅ Claim verified and decrypted for ${ensName}`);
    return claimData;
  }
}

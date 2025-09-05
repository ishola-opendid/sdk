import { type ClaimDocument } from "../domain/did.js";
import { type KeyPair } from "../domain/types.js";
import { EncryptionService } from "../infra/EncryptionService.js";
import { EthereumService } from "../infra/EthereumService.js";
import { FilecoinService } from "../infra/FilecoinService.js";
import { FilecoinStorage } from "../infra/FilecoinStorageService.js";

export class IssueClaimService {
  constructor(
    private readonly ethereumService: EthereumService,
    private readonly filecoinService: FilecoinService,
    private readonly filecoinStorage: FilecoinStorage
  ) {}

  async execute(
    ensName: string,
    credentialType: string,
    claimData: ClaimDocument,
    keyPair: KeyPair
  ): Promise<string> {
    // 1. Encrypt the claim data
    const encrypted = await EncryptionService.encrypt(
      claimData,
      keyPair.pubJwk
    );

    // 2. Upload to Filecoin Storage
    const { commp } = await this.filecoinStorage.store(encrypted);
    console.log(`📦 Claim stored on Filecoin: ${commp}`);

    // 3. Generate signature for Filecoin contract
    const messageHash = await this.ethereumService.generateClaimMessage(
      ensName,
      commp, // Use the PieceCID (commp)
      credentialType,
      this.filecoinService.filecoinContractAddress
    );
    const accounts = await this.ethereumService.getAccounts();
    const signature = await this.ethereumService.signMessage(
      messageHash,
      accounts[0] as string
    );

    // 4. Store record on Filecoin contract
    const did = `did:opendid:${ensName}`;
    await this.filecoinService.issueClaim(
      did,
      commp, // Use the PieceCID (commp)
      credentialType,
      signature,
      accounts[0] as string
    );

    console.log(
      `🎉 Claim record stored successfully for ${ensName} (${credentialType})`
    );
    return commp;
  }
}

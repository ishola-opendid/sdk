import { ClaimDocument } from "../domain/did.js";
import { KeyPair } from "../domain/types.js";
import { EncryptionService } from "../infra/EncryptionService.js";
import { EthereumService } from "../infra/EthereumService.js";
import { FilecoinService } from "../infra/FilecoinService.js";
import { IpfsService } from "../infra/IpfsService.js";

export class IssueClaimService {
  constructor(
    private readonly ethereumService: EthereumService,
    private readonly filecoinService: FilecoinService,
    private readonly ipfsService: IpfsService
  ) {}

  async execute(
    ensName: string,
    credentialType: string,
    claimData: ClaimDocument,
    keyPair: KeyPair
  ): Promise<string> {
    // 1. Encrypt the claim data
    const encrypted = await EncryptionService.encrypt(claimData, keyPair.pubJwk);

    // 2. Upload to IPFS
    const cid = await this.ipfsService.upload(encrypted);
    console.log(`📦 Claim uploaded to IPFS: ${cid}`);

    // 3. Generate signature for Filecoin
    const messageHash = await this.ethereumService.generateClaimMessage(
      ensName,
      cid,
      credentialType,
      this.filecoinService.filecoinContractAddress
    );
    const accounts = await this.ethereumService.getAccounts();
    const signature = await this.ethereumService.signMessage(
      messageHash,
      accounts[0]
    );

    // 4. Store on Filecoin
    const did = `did:opendid:${ensName}`;
    await this.filecoinService.issueClaim(
      did,
      cid,
      credentialType,
      signature,
      accounts[0]
    );

    console.log(
      `🎉 Claim issued successfully for ${ensName} (${credentialType})`
    );
    return cid;
  }
}
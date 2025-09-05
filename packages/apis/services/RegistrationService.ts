import { EthereumService } from "../infra/EthereumService.js";
import { FilecoinService } from "../infra/FilecoinService.js";

export class RegistrationService {
  constructor(
    private readonly ethereumService: EthereumService,
    private readonly filecoinService: FilecoinService
  ) {}

  async registerOnEthereum(ensName: string): Promise<void> {
    const accounts = await this.ethereumService.getAccounts();
    await this.ethereumService.registerDID(ensName, accounts[0]);
    console.log(`✅ DID registered on Ethereum for ${ensName}`);
  }

  async registerOnFilecoin(ensName: string): Promise<void> {
    // Generate registration message hash
    const messageHash = await this.ethereumService.generateRegistrationMessage(
      ensName,
      this.filecoinService.filecoinContractAddress
    );

    // Sign the message
    const accounts = await this.ethereumService.getAccounts();
    const signature = await this.ethereumService.signMessage(
      messageHash,
      accounts[0]
    );

    // Register on Filecoin
    const did = `did:opendid:${ensName}`;
    const filAccounts = await this.filecoinService.getAccounts();
    await this.filecoinService.registerDID(did, accounts[0], signature, filAccounts[0]);

    console.log(`✅ DID registered on Filecoin for ${ensName}`);
  }

  async isDIDRegistered(ensName: string): Promise<{ ethereum: boolean; filecoin: boolean }> {
    const did = `did:opendid:${ensName}`;
    const ethereumRegistered = await this.ethereumService.hasDID(ensName);
    const filecoinRegistered = await this.filecoinService.isDIDRegistered(did);
    return { ethereum: ethereumRegistered, filecoin: filecoinRegistered };
  }
}
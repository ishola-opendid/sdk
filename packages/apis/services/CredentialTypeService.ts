import { FilecoinService } from "../infra/FilecoinService.js";

export class CredentialTypeService {
  constructor(private readonly filecoinService: FilecoinService) {}

  async create(credentialType: string, description: string): Promise<void> {
    const accounts = await this.filecoinService.getAccounts();
    await this.filecoinService.createCredentialType(
      credentialType,
      description,
      accounts[0] as string
    );
    console.log(`✅ Credential type '${credentialType}' created successfully`);
  }

  async exists(credentialType: string): Promise<boolean> {
    return this.filecoinService.credentialExists(credentialType);
  }
}

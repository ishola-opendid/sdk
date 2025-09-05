import { getFilecoinABI } from "./abi.js";

export class FilecoinService {
  private contract: any;
  private filecoinProvider: any;
  public readonly filecoinContractAddress: string;

  constructor(filecoinProvider: any, filecoinContractAddress: string) {
    this.filecoinProvider = filecoinProvider;
    this.filecoinContractAddress = filecoinContractAddress;
    this.contract = new this.filecoinProvider.eth.Contract(
      getFilecoinABI(),
      this.filecoinContractAddress
    );
  }

  async createCredentialType(credentialType: string, description: string, fromAddress: string): Promise<void> {
    await this.contract.methods
      .createCredentialType(credentialType, description)
      .send({ from: fromAddress });
  }
  
  async registerDID(did: string, expectedEthOwner: string, sig: string, fromAddress: string): Promise<void> {
      await this.contract.methods
        .registerDID(did, expectedEthOwner, sig)
        .send({ from: fromAddress });
  }
  
  async issueClaim(did: string, cid: string, credentialType: string, sig: string, fromAddress: string): Promise<void> {
      await this.contract.methods
        .issueClaim(did, cid, credentialType, sig)
        .send({ from: fromAddress });
  }
  
  async getClaim(did: string, credentialType: string): Promise<string> {
      return await this.contract.methods.getClaim(did, credentialType).call();
  }
  
  async credentialExists(credentialType: string): Promise<boolean> {
      return await this.contract.methods.credentialExists(credentialType).call();
  }
  
  async isDIDRegistered(did: string): Promise<boolean> {
      return await this.contract.methods.isDIDRegistered(did).call();
  }
  
  async getAccounts(): Promise<string[]> {
    return await this.filecoinProvider.eth.getAccounts();
  }
}

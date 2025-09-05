import { getEthereumABI } from "./abi.js";

export class EthereumService {
  private contract: any;
  private web3Provider: any;
  public readonly ethereumContractAddress: string;

  constructor(web3Provider: any, ethereumContractAddress: string) {
    this.web3Provider = web3Provider;
    this.ethereumContractAddress = ethereumContractAddress;
    this.contract = new this.web3Provider.eth.Contract(
      getEthereumABI(),
      this.ethereumContractAddress
    );
  }

  async registerDID(ensName: string, fromAddress: string): Promise<void> {
    await this.contract.methods.registerDID(ensName).send({ from: fromAddress });
  }

  async generateRegistrationMessage(ensName: string, filecoinContract: string): Promise<string> {
    return await this.contract.methods
      .generateRegistrationMessage(ensName, filecoinContract)
      .call();
  }

  async generateClaimMessage(ensName: string, cid: string, credentialType: string, filecoinContract: string): Promise<string> {
    return await this.contract.methods
      .generateClaimMessage(ensName, cid, credentialType, filecoinContract)
      .call();
  }

  async hasDID(ensName: string): Promise<boolean> {
    return await this.contract.methods.hasDID(ensName).call();
  }
  
  async getAccounts(): Promise<string[]> {
    return await this.web3Provider.eth.getAccounts();
  }

  async signMessage(message: string, address: string): Promise<string> {
    return await this.web3Provider.eth.personal.sign(message, address);
  }
}

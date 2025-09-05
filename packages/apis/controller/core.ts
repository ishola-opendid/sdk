import {
  type DIDRegistryConfig,
  type KeyPair,
  type FilecoinConfig,
} from "../domain/types.js";
import { type ClaimDocument } from "../domain/did.js";
import { EthereumService } from "../infra/EthereumService.js";
import { FilecoinService } from "../infra/FilecoinService.js";
import { FilecoinStorage } from "../infra/FilecoinStorageService.js";
import { KeyService } from "../infra/KeyService.js";
import { IssueClaimService } from "../services/IssueClaimService.js";
import { VerifyClaimService } from "../services/VerifyClaimService.js";
import { RegistrationService } from "../services/RegistrationService.js";
import { CredentialTypeService } from "../services/CredentialTypeService.js";
import { type JWK } from "jose";

export default class CoreAPI {
  private keyPair: KeyPair | null = null;

  private ethereumService: EthereumService;
  private filecoinService: FilecoinService;
  private filecoinStorage: FilecoinStorage;

  private issueClaimService: IssueClaimService;
  private verifyClaimService: VerifyClaimService;
  private registrationService: RegistrationService;
  private credentialTypeService: CredentialTypeService;

  constructor(didConfig: DIDRegistryConfig, fsConfig: FilecoinConfig) {
    this.ethereumService = new EthereumService(
      didConfig.web3Provider,
      didConfig.ethereumContract
    );
    this.filecoinService = new FilecoinService(
      didConfig.filecoinProvider,
      didConfig.filecoinContract
    );
    this.filecoinStorage = new FilecoinStorage(fsConfig);

    this.issueClaimService = new IssueClaimService(
      this.ethereumService,
      this.filecoinService,
      this.filecoinStorage
    );
    this.verifyClaimService = new VerifyClaimService(
      this.filecoinService,
      this.filecoinStorage
    );
    this.registrationService = new RegistrationService(
      this.ethereumService,
      this.filecoinService
    );
    this.credentialTypeService = new CredentialTypeService(
      this.filecoinService
    );
  }

  async initialize() {
    if (!this.keyPair) {
      this.keyPair = await KeyService.makeRecipientKeypair();
    }
    await this.filecoinStorage.initialize();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.keyPair) {
      await this.initialize();
    }
  }

  async createCredentialType(
    credentialType: string,
    description: string
  ): Promise<void> {
    return this.credentialTypeService.create(credentialType, description);
  }

  async registerDIDOnEthereum(ensName: string): Promise<void> {
    return this.registrationService.registerOnEthereum(ensName);
  }

  async registerDIDOnFilecoin(ensName: string): Promise<void> {
    return this.registrationService.registerOnFilecoin(ensName);
  }

  async issueClaim(
    ensName: string,
    credentialType: string,
    claimData: ClaimDocument
  ): Promise<string> {
    await this.ensureInitialized();
    return this.issueClaimService.execute(
      ensName,
      credentialType,
      claimData,
      this.keyPair!
    );
  }

  async bulkIssueClaims(
    ensName: string,
    claims: Array<{ credentialType: string; data: ClaimDocument }>
  ): Promise<string[]> {
    await this.ensureInitialized();
    const results = await Promise.allSettled(
      claims.map(({ credentialType, data }) =>
        this.issueClaim(ensName, credentialType, data)
      )
    );

    const cids: string[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        cids.push(result.value);
      } else {
        errors.push(
          `Claim ${index} (${claims[index]!.credentialType}): ${result.reason}`
        );
      }
    });

    if (errors.length > 0) {
      console.warn(`⚠️ Some claims failed:`, errors);
    }

    console.log(
      `🚀 Bulk issued ${cids.length}/${claims.length} claims successfully`
    );
    return cids;
  }

  async verifyClaim(
    ensName: string,
    credentialType: string
  ): Promise<ClaimDocument> {
    await this.ensureInitialized();
    return this.verifyClaimService.execute(
      ensName,
      credentialType,
      this.keyPair!
    );
  }

  async checkCredentialExists(credentialType: string): Promise<boolean> {
    return this.credentialTypeService.exists(credentialType);
  }

  async isDIDRegistered(
    ensName: string
  ): Promise<{ ethereum: boolean; filecoin: boolean }> {
    return this.registrationService.isDIDRegistered(ensName);
  }

  async exportPublicKey(): Promise<JWK | null> {
    return this.keyPair?.pubJwk || null;
  }

  async setKeyPair(pubJwk: JWK, privJwk: JWK): Promise<void> {
    await KeyService.importRecipientPublicKey(pubJwk);
    await KeyService.importRecipientPrivateKey(privJwk);
    this.keyPair = { pubJwk, privJwk };
  }
}

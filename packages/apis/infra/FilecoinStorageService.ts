import { Synapse, RPC_URLS, TOKENS } from "@filoz/synapse-sdk";
import { ethers } from "ethers";

import { type FilecoinConfig } from "../domain/types.js";

export interface StorageResult {
  commp: string; // PieceCID
  size: number; // storage size
}

/**
 * Minimal Filecoin storage for encrypted DID documents
 */
export class FilecoinStorage {
  private synapse: Synapse | null = null;
  private storageService: any = null;
  private config: FilecoinConfig;

  constructor(config: FilecoinConfig) {
    this.config = {
      network: "calibration",
      ...config,
    };
  }

  async initialize(): Promise<void> {
    const rpcURL =
      this.config.network === "mainnet"
        ? RPC_URLS.mainnet.websocket
        : RPC_URLS.calibration.websocket;

    this.synapse = await Synapse.create({
      privateKey: this.config.privateKey,
      rpcURL,
    });

    // Deposit funds and approve service if needed
    if (this.config.initialDeposit) {
      const amount = ethers.parseUnits(this.config.initialDeposit, 18);
      const balance = await this.synapse.payments.balance(TOKENS.USDFC);

      if (balance < amount) {
        await this.synapse.payments.deposit(amount, TOKENS.USDFC);
      }

      // Approve warm storage service
      const { CONTRACT_ADDRESSES } = await import("@filoz/synapse-sdk");
      const network = this.synapse.getNetwork() as "mainnet" | "calibration";
      const warmStorageAddress = CONTRACT_ADDRESSES.WARM_STORAGE[network]!;

      await this.synapse.payments.approveService(
        warmStorageAddress,
        ethers.parseUnits("10", 18), // rate allowance
        ethers.parseUnits("1000", 18), // lockup allowance
        30 * 24 * 60 * 60 // maxLockupPeriod (30 days)
      );
    }

    // Create storage service
    this.storageService = await this.synapse.createStorage();
  }

  /**
   * Store encrypted data on Filecoin
   */
  async store(encryptedData: string): Promise<StorageResult> {
    if (!this.storageService) throw new Error("Not initialized");

    const dataBytes = new TextEncoder().encode(encryptedData);
    const result = await this.storageService.upload(dataBytes);

    return {
      commp: result.commp,
      size: result.size,
    };
  }

  /**
   * Retrieve encrypted data from Filecoin
   */
  async retrieve(commp: string): Promise<string> {
    if (!this.storageService) throw new Error("Not initialized");

    const data = await this.storageService.download(commp);
    return new TextDecoder().decode(data);
  }

  /**
   * Get current USDFC balance
   */
  async getBalance(): Promise<string> {
    if (!this.synapse) throw new Error("Not initialized");

    const balance = await this.synapse.payments.balance(TOKENS.USDFC);
    return ethers.formatUnits(balance, 18);
  }
}

// Factory function
export async function createFilecoinStorage(
  config: FilecoinConfig
): Promise<FilecoinStorage> {
  const storage = new FilecoinStorage(config);
  await storage.initialize();
  return storage;
}

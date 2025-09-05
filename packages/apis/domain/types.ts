import type { JWK } from "jose";

export interface IPFSResponse {
  Hash: string;
  Name: string;
  Size: string;
}

export interface DIDRegistryConfig {
  filecoinContract: string;
  ethereumContract: string;
  web3Provider: any;
  filecoinProvider: any;
}

export interface KeyPair {
  pubJwk: JWK;
  privJwk: JWK;
}

export interface FilecoinConfig {
  privateKey: string;
  network?: 'mainnet' | 'calibration';
  initialDeposit?: string; // USDFC amount like "100"
}
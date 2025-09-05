import type { JWK } from "jose";

export interface IPFSResponse {
  Hash: string;
  Name: string;
  Size: string;
}

export interface DIDRegistryConfig {
  ipfsEndpoint?: string;
  filecoinContract: string;
  ethereumContract: string;
  web3Provider: any;
  filecoinProvider: any;
}

export interface KeyPair {
  pubJwk: JWK;
  privJwk: JWK;
}

// OpenDID SDK - Main Export File

// Core API
export { default as OpenDID, type OpenDIDConfig } from "./controller/core.js";

// Domain Models
export type {
  DIDDocument,
  VerificationMethod,
  ServiceEndpoint,
  ClaimType,
  Claim,
  ENSName,
  Signature,
  ClaimMessage,
  RegistrationMessage,
} from "./domain/types.js";

// Services
export { ENSService } from "./service/ENSService.js";
export { ClaimsService } from "./service/ClaimsService.js";
export { IPFSService } from "./service/IPFSService.js";

// Use Cases
export { RegisterDIDUseCase } from "./application/usecase/RegisterDIDUseCase.js";
export { IssueClaimUseCase } from "./application/usecase/IssueClaimUseCase.js";
export { VerifyClaimUseCase } from "./application/usecase/VerifyClaimUseCase.js";

// Infrastructure
export { EthereumProvider } from "./infrastructure/blockchain/EthereumProvider.js";
export { FilecoinProvider } from "./infrastructure/blockchain/FilecoinProvider.js";

// Contract Interfaces
export type {
  OpenDIDContract,
  ENSRegistry,
  ENSResolver,
} from "./infrastructure/contracts/OpenDIDContract.js";

export type { DIDClaimsRegistryContract } from "./infrastructure/contracts/DIDClaimsRegistryContract.js";

// Legacy exports for backward compatibility
export { default as CoreAPI } from "./controller/core.js";

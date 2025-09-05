# OpenDID SDK

A comprehensive TypeScript SDK for the OpenDID decentralized identity system based on ENS with enhanced claim types functionality.

## Features

- 🏷️ **Claim Types**: Create and manage unique claim types (e.g., "ghana-card", "ghana-passport")
- 🔍 **Quick Lookups**: Fast retrieval of claims by type for any user
- 📊 **Organized Storage**: Claims are stored both globally and by type for efficient querying
- 🔒 **Security**: Only claim type creators can issue claims of that type
- 🔄 **Backward Compatibility**: All existing functionality remains intact
- 🌐 **Multi-Chain**: Supports both Ethereum (ENS) and Filecoin networks
- 📁 **IPFS Integration**: Seamless file storage and retrieval

## Installation

```bash
npm install @opendid/sdk
```

## Quick Start

```typescript
import { OpenDID } from '@opendid/sdk';

// Initialize the SDK
const opendid = new OpenDID({
  ethereum: {
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    privateKey: 'YOUR_PRIVATE_KEY',
    openDIDContractAddress: '0x...',
    ensRegistryAddress: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
  },
  filecoin: {
    rpcUrl: 'https://api.node.glif.io/rpc/v1',
    privateKey: 'YOUR_PRIVATE_KEY',
    didClaimsRegistryAddress: '0x...'
  },
  ipfs: {
    endpoint: 'https://ipfs.infura.io:5001',
    apiKey: 'YOUR_IPFS_API_KEY'
  }
});

// Register a DID for an ENS name
const txHash = await opendid.registerDID('vitalik.eth');

// Create a claim type
await opendid.createClaimType('ghana-national-id', 'Ghana National Identification Card');

// Issue a claim
const result = await opendid.issueClaim(
  'vitalik.eth',
  'ghana-national-id',
  {
    name: 'John Doe',
    idNumber: 'GHA-123456789',
    issueDate: '2023-01-01',
    expiryDate: '2033-01-01'
  }
);

// Verify claims
const claims = await opendid.getAllClaimsByType('did:opendid:vitalik.eth', 'ghana-national-id');
```

## API Reference

### Core Methods

#### DID Registration

```typescript
// Register DID on Ethereum
await opendid.registerDID(ensName: string): Promise<string>

// Register DID on Filecoin
await opendid.registerDIDOnFilecoin(ensName: string): Promise<string>

// Complete registration (both networks)
await opendid.completeDIDRegistration(ensName: string): Promise<{
  ethereumTxHash: string;
  filecoinTxHash: string;
}>

// Check if ENS name has DID
await opendid.hasDID(ensName: string): Promise<boolean>

// Get ENS name information
await opendid.getENSNameInfo(ensName: string): Promise<ENSName>
```

#### Claim Type Management

```typescript
// Create a new claim type
await opendid.createClaimType(claimType: string, description: string): Promise<string>

// Get claim type information
await opendid.getClaimType(claimType: string): Promise<ClaimType>

// Check if claim type exists
await opendid.isClaimTypeExists(claimType: string): Promise<boolean>
```

#### Claim Issuance

```typescript
// Issue a single claim
await opendid.issueClaim(
  ensName: string,
  claimType: string,
  claimData: Record<string, any>
): Promise<{
  cid: string;
  txHash: string;
  did: string;
}>

// Issue multiple claims
await opendid.issueBulkClaims(
  ensNames: string[],
  claimType: string,
  claimData: Record<string, any>
): Promise<Array<{
  ensName: string;
  cid: string;
  txHash: string;
  did: string;
}>>
```

#### Claim Verification

```typescript
// Verify a specific claim
await opendid.verifyClaim(
  did: string,
  claimType: string,
  index: number
): Promise<Claim>

// Get all claims of a type
await opendid.getAllClaimsByType(did: string, claimType: string): Promise<Claim[]>

// Get latest claim of a type
await opendid.getLatestClaimByType(did: string, claimType: string): Promise<Claim | null>

// Check if DID has claims of a type
await opendid.hasClaimsOfType(did: string, claimType: string): Promise<boolean>
```

#### Utility Methods

```typescript
// Get current address
await opendid.getAddress(): Promise<string>

// Check IPFS accessibility
await opendid.isIPFSAccessible(): Promise<boolean>

// Upload to IPFS
await opendid.uploadToIPFS(data: string | Blob | File, filename?: string): Promise<string>

// Retrieve from IPFS
await opendid.retrieveFromIPFS(cid: string): Promise<string>

// Get all claims (general)
await opendid.getAllClaims(did: string): Promise<string[]>

// Check if DID is registered
await opendid.isDIDRegistered(did: string): Promise<boolean>
```

## Domain Models

### ClaimType

```typescript
interface ClaimType {
  claimType: string;        // Unique identifier (e.g., "ghana-national-id")
  issuer: string;           // Ethereum address of the issuer
  description: string;      // Human-readable description
  exists: boolean;          // Whether this claim type exists
  createdAt: number;        // Block timestamp when created
}
```

### Claim

```typescript
interface Claim {
  claimId: string;          // Unique claim identifier
  did: string;              // DID of the subject (e.g., "did:opendid:vitalik.eth")
  claimType: string;        // Type of claim (e.g., "ghana-national-id")
  cid: string;              // IPFS CID of the claim data
  issuer: string;           // Ethereum address of the issuer
  subject: string;          // Ethereum address of the subject
  issuedAt: Date;           // When the claim was issued
  expirationDate?: Date;    // Optional expiration date
  data: Record<string, any>; // Claim data (encrypted)
}
```

### ENSName

```typescript
interface ENSName {
  name: string;             // ENS name (e.g., "vitalik.eth")
  node: string;             // ENS namehash
  owner: string;            // Ethereum address of the owner
  resolver: string;         // Resolver contract address
  hasDID: boolean;          // Whether this ENS name has a DID record
}
```

## Examples

### Government ID System

```typescript
// Ghana Government creates claim types
await opendid.createClaimType('ghana-national-id', 'Ghana National ID Card');
await opendid.createClaimType('ghana-passport', 'Ghana International Passport');
await opendid.createClaimType('ghana-drivers-license', 'Ghana Driver\'s License');

// Issue a national ID claim
await opendid.issueClaim('citizen.eth', 'ghana-national-id', {
  fullName: 'John Doe',
  idNumber: 'GHA-123456789',
  dateOfBirth: '1990-01-01',
  issueDate: '2023-01-01',
  expiryDate: '2033-01-01',
  photo: 'ipfs://QmXxXxXxXxXxXxXxXx'
});

// Verify the claim
const nationalIdClaims = await opendid.getAllClaimsByType(
  'did:opendid:citizen.eth',
  'ghana-national-id'
);
```

### Educational Credentials

```typescript
// University creates claim types
await opendid.createClaimType('university-degree', 'University Degree Certificate');
await opendid.createClaimType('professional-certificate', 'Professional Certification');

// Issue a degree claim
await opendid.issueClaim('student.eth', 'university-degree', {
  degree: 'Bachelor of Science in Computer Science',
  university: 'University of Ghana',
  graduationYear: 2023,
  gpa: 3.8,
  transcript: 'ipfs://QmYyYyYyYyYyYyYyYy'
});
```

### Financial Credentials

```typescript
// Bank creates claim types
await opendid.createClaimType('bank-account-verification', 'Bank Account Verification');
await opendid.createClaimType('credit-score', 'Credit Score Report');

// Issue account verification
await opendid.issueClaim('customer.eth', 'bank-account-verification', {
  bankName: 'Ghana Commercial Bank',
  accountNumber: '1234567890',
  accountType: 'Savings',
  verifiedDate: '2023-01-01',
  balance: 5000.00
});
```

## Architecture

The SDK follows Domain-Driven Design (DDD) principles with clear separation of concerns:

- **Domain Layer**: Core business models and entities
- **Application Layer**: Use cases and business logic
- **Service Layer**: External service integrations
- **Infrastructure Layer**: Blockchain and IPFS providers

## Error Handling

The SDK provides comprehensive error handling with descriptive error messages:

```typescript
try {
  await opendid.issueClaim('invalid.eth', 'ghana-card', {});
} catch (error) {
  console.error('Error:', error.message);
  // Possible errors:
  // - "Invalid ENS name format"
  // - "You do not own this ENS name"
  // - "DID not registered for this ENS name"
  // - "Claim type does not exist"
}
```

## Security Considerations

1. **Private Key Management**: Never expose private keys in client-side code
2. **Signature Verification**: All claims are cryptographically signed
3. **Replay Protection**: Nonces prevent replay attacks
4. **Access Control**: Only claim type creators can issue claims of that type

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: [https://docs.opendid.org](https://docs.opendid.org)
- Issues: [https://github.com/your-org/opendid/issues](https://github.com/your-org/opendid/issues)
- Discord: [https://discord.gg/opendid](https://discord.gg/opendid)

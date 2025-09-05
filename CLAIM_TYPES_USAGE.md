# OpenDID Claim Types System

## Overview

The enhanced OpenDID system now supports **claim types** that allow for organized and quick lookup of specific types of claims for users. This enables issuers to create unique claim types (like "ghana-card", "ghana-passport") and users to easily retrieve claims by type.

## Architecture

- **OpenDID Contract** (Ethereum Mainnet): Handles ENS integration and message generation
- **DIDClaimsRegistry Contract** (Filecoin Network): Manages claim types and stores claims with type categorization

## Key Features

### 1. Claim Type Management
- **Unique Claim Types**: Each claim type has a unique identifier (e.g., "ghana-card", "ghana-passport")
- **Issuer Control**: Only the creator of a claim type can issue claims of that type
- **Descriptions**: Human-readable descriptions for each claim type

### 2. Enhanced Claim Storage
- **Type-based Organization**: Claims are stored both globally and by type
- **Quick Lookups**: Fast retrieval of claims by type for any DID
- **Latest Claim Tracking**: Track the most recent claim for each type

### 3. Backward Compatibility
- All existing functionality remains intact
- New functions are additive, not replacing existing ones

## Usage Examples

### Step 1: Create Claim Types (Issuer)

```solidity
// Ghana Government creates claim types
DIDClaimsRegistry registry = DIDClaimsRegistry(filecoinContractAddress);

// Create Ghana National ID claim type
registry.createClaimType(
    "ghana-national-id",
    "Ghana National Identification Card"
);

// Create Ghana Passport claim type
registry.createClaimType(
    "ghana-passport", 
    "Ghana International Passport"
);
```

### Step 2: Register DID (User)

```solidity
// User registers their DID on Filecoin
string memory did = "did:opendid:vitalik.eth";
address userAddress = 0x...; // User's Ethereum address
bytes memory signature = ...; // Signature from OpenDID contract

registry.registerDID(did, userAddress, signature);
```

### Step 3: Generate Claim Message (User)

```solidity
// User generates message for adding a Ghana National ID claim
OpenDID openDID = OpenDID(openDIDAddress);

bytes32 messageHash = openDID.generateClaimMessage(
    "vitalik.eth",           // ENS name
    "QmXxXxXxXxXxXxXxXx",   // IPFS CID of claim data
    "ghana-national-id"      // Claim type
);

// User signs this message and submits to Filecoin contract
```

### Step 4: Submit Claim (User)

```solidity
// User submits the signed claim to Filecoin
registry.appendClaim(
    "did:opendid:vitalik.eth",
    "QmXxXxXxXxXxXxXxXx",   // IPFS CID
    "ghana-national-id",     // Claim type
    signature                // Signed message
);
```

### Step 5: Query Claims by Type

```solidity
// Get all Ghana National ID claims for a user
string[] memory ghanaIdClaims = registry.getAllClaimsByType(
    "did:opendid:vitalik.eth",
    "ghana-national-id"
);

// Get latest Ghana Passport claim
string memory latestPassport = registry.getLatestCIDByType(
    "did:opendid:vitalik.eth", 
    "ghana-passport"
);

// Check if user has any Ghana National ID claims
bool hasGhanaId = registry.hasClaimsOfType(
    "did:opendid:vitalik.eth",
    "ghana-national-id"
);

// Get count of Ghana Passport claims
uint256 passportCount = registry.getClaimsCountByType(
    "did:opendid:vitalik.eth",
    "ghana-passport"
);
```

## New Functions Added

### DIDClaimsRegistry Contract

#### Claim Type Management
- `createClaimType(string claimType, string description)` - Create a new claim type
- `isClaimTypeExists(string claimType)` - Check if claim type exists
- `getClaimType(string claimType)` - Get claim type information

#### Enhanced Claim Functions
- `appendClaim(string did, string cid, string claimType, bytes sig)` - Add claim with type
- `getLatestCIDByType(string did, string claimType)` - Get latest claim of specific type
- `getClaimsCountByType(string did, string claimType)` - Count claims of specific type
- `getClaimByType(string did, string claimType, uint256 index)` - Get specific claim by type and index
- `getAllClaimsByType(string did, string claimType)` - Get all claims of specific type
- `getClaimsRangeByType(string did, string claimType, uint256 start, uint256 end)` - Get claims in range
- `hasClaimsOfType(string did, string claimType)` - Check if user has claims of specific type

### OpenDID Contract

#### Enhanced Message Generation
- `generateClaimMessage(string ensName, string cid, string claimType)` - Generate message with claim type

## Data Structures

### ClaimType Struct
```solidity
struct ClaimType {
    string claimType;    // Unique identifier (e.g., "ghana-card")
    address issuer;      // Address that created this claim type
    string description;  // Human-readable description
    bool exists;         // Whether this claim type exists
    uint256 createdAt;   // Block timestamp when created
}
```

## Storage Mappings

```solidity
// Claim type management
mapping(string => ClaimType) public claimTypes;

// Type-specific claim storage
mapping(bytes32 => mapping(string => string[])) private claimsByType;
mapping(bytes32 => mapping(string => string)) public latestCIDByType;
mapping(bytes32 => mapping(string => uint256)) public claimTypeCounts;
```

## Events

```solidity
event ClaimTypeCreated(
    string indexed claimType,
    address indexed issuer,
    string description
);

event ClaimAppended(
    bytes32 indexed didHash,
    string did,
    uint256 index,
    string cid,
    string claimType,        // NEW: Added claim type
    address indexed submitter
);
```

## Security Considerations

1. **Claim Type Uniqueness**: Each claim type can only be created once
2. **Issuer Control**: Only the creator of a claim type can issue claims of that type
3. **Signature Verification**: All claims must be signed by the DID owner
4. **Nonce Protection**: Replay attacks prevented with per-DID nonces

## Migration Path

For existing users:
1. Existing claims remain accessible through original functions
2. New claims can optionally include claim types
3. Gradual migration to claim types as needed

## Example Claim Types

```solidity
// Government IDs
"ghana-national-id"
"ghana-passport"
"ghana-drivers-license"

// Educational Credentials
"university-degree"
"professional-certificate"
"training-completion"

// Financial Credentials
"bank-account-verification"
"credit-score"
"income-certificate"

// Health Credentials
"vaccination-record"
"medical-certificate"
"health-insurance"
```

This system provides a robust foundation for organized, type-based claim management while maintaining backward compatibility and security.

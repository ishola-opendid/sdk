// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DIDClaimsRegistry {
    error Unauthorized();
    error EmptyCID();
    error EmptyDID();
    error DIDNotRegistered();
    error DIDAlreadyRegistered();
    error EmptyClaimType();
    error ClaimTypeNotExists();
    error ClaimTypeAlreadyExists();
    error NotClaimTypeIssuer();

    event DIDRegistered(
        bytes32 indexed didHash,
        string did,
        address indexed ethOwner
    );
    event ClaimAppended(
        bytes32 indexed didHash,
        string did,
        uint256 index,
        string cid,
        string claimType,
        address indexed submitter
    );
    event ClaimTypeCreated(
        string indexed claimType,
        address indexed issuer,
        string description
    );

    // DID => Ethereum owner address (recovered from signature)
    mapping(bytes32 => address) public ethOwnerOf;

    // DID => registration status
    mapping(bytes32 => bool) public isRegistered;

    // DID => array of CIDs
    mapping(bytes32 => string[]) private claims;

    // Per-DID nonces to prevent replay attacks
    mapping(bytes32 => uint256) public nonces;

    // Latest CID for each DID (for quick access)
    mapping(bytes32 => string) public latestCID;

    // Claim type management
    struct ClaimType {
        string claimType;
        address issuer;
        string description;
        bool exists;
        uint256 createdAt;
    }

    // Claim type => ClaimType struct
    mapping(string => ClaimType) public claimTypes;

    // DID => claim type => array of CIDs for that claim type
    mapping(bytes32 => mapping(string => string[])) private claimsByType;

    // DID => claim type => latest CID for that claim type
    mapping(bytes32 => mapping(string => string)) public latestCIDByType;

    // DID => claim type => count of claims for that type
    mapping(bytes32 => mapping(string => uint256)) public claimTypeCounts;

    /// @dev Helper: compute DID hash
    function didHash(string calldata did) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(did));
    }

    /// @dev Helper: compute claim type hash
    function claimTypeHash(string calldata claimType) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(claimType));
    }

    /// @notice Create a new claim type (only issuers can create claim types)
    /// @param claimType The unique identifier for the claim type (e.g., "ghana-card", "ghana-passport")
    /// @param description Human-readable description of the claim type
    function createClaimType(
        string calldata claimType,
        string calldata description
    ) external {
        if (bytes(claimType).length == 0) revert EmptyClaimType();
        
        if (claimTypes[claimType].exists) revert ClaimTypeAlreadyExists();

        claimTypes[claimType] = ClaimType({
            claimType: claimType,
            issuer: msg.sender,
            description: description,
            exists: true,
            createdAt: block.timestamp
        });

        emit ClaimTypeCreated(claimType, msg.sender, description);
    }

    /// @notice Check if a claim type exists
    function isClaimTypeExists(string calldata claimType) external view returns (bool) {
        return claimTypes[claimType].exists;
    }

    /// @notice Get claim type information
    function getClaimType(string calldata claimType) external view returns (ClaimType memory) {
        if (!claimTypes[claimType].exists) revert ClaimTypeNotExists();
        return claimTypes[claimType];
    }

    /// @notice Register a DID mapping to an Ethereum owner
    /// Signature format: keccak256(abi.encodePacked("Register", did, address(this), nonce))
    function registerDID(
        string calldata did,
        address expectedEthOwner,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();

        bytes32 d = didHash(did);

        if (isRegistered[d]) revert DIDAlreadyRegistered();

        // Recover signer from signature
        bytes32 message = keccak256(
            abi.encodePacked("Register", did, address(this), nonces[d])
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != expectedEthOwner) revert Unauthorized();

        // Register the DID
        ethOwnerOf[d] = expectedEthOwner;
        isRegistered[d] = true;
        nonces[d] += 1; // bump nonce to prevent replay

        emit DIDRegistered(d, did, expectedEthOwner);
    }

    /// @notice Append a claim (CID) with claim type. Requires signature by ethOwner
    /// Signature format: keccak256(abi.encodePacked("Append", did, cid, claimType, address(this), nonce))
    function appendClaim(
        string calldata did,
        string calldata cid,
        string calldata claimType,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();
        if (bytes(cid).length == 0) revert EmptyCID();
        if (bytes(claimType).length == 0) revert EmptyClaimType();

        bytes32 d = didHash(did);
        address owner = ethOwnerOf[d];
        if (owner == address(0) || !isRegistered[d]) revert DIDNotRegistered();

        // Check if claim type exists
        if (!claimTypes[claimType].exists) revert ClaimTypeNotExists();

        // Verify signature
        bytes32 message = keccak256(
            abi.encodePacked("Append", did, cid, claimType, address(this), nonces[d])
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != owner) revert Unauthorized();

        // Append claim to general claims array
        claims[d].push(cid);
        uint256 idx = claims[d].length - 1;
        latestCID[d] = cid;

        // Append claim to claim type specific array
        claimsByType[d][claimType].push(cid);
        latestCIDByType[d][claimType] = cid;
        claimTypeCounts[d][claimType] += 1;

        nonces[d] += 1;

        emit ClaimAppended(d, did, idx, cid, claimType, msg.sender);
    }

    /// @notice Get the latest CID for a DID (most recently added claim)
    function getLatestCID(
        string calldata did
    ) external view returns (string memory) {
        return latestCID[didHash(did)];
    }

    /// @notice Get total number of claims for a DID
    function getClaimsCount(
        string calldata did
    ) external view returns (uint256) {
        return claims[didHash(did)].length;
    }

    /// @notice Get specific claim by index
    function getClaim(
        string calldata did,
        uint256 index
    ) external view returns (string memory) {
        return claims[didHash(did)][index];
    }

    /// @notice Get all claims for a DID
    function getAllClaims(
        string calldata did
    ) external view returns (string[] memory) {
        return claims[didHash(did)];
    }

    /// @notice Get claims in a specific range
    function getClaimsRange(
        string calldata did,
        uint256 start,
        uint256 end
    ) external view returns (string[] memory) {
        string[] storage allClaims = claims[didHash(did)];
        require(start <= end && end < allClaims.length, "Invalid range");

        string[] memory result = new string[](end - start + 1);
        for (uint256 i = start; i <= end; i++) {
            result[i - start] = allClaims[i];
        }
        return result;
    }

    /// @notice Check if a DID is registered
    function isDIDRegistered(string calldata did) external view returns (bool) {
        return isRegistered[didHash(did)];
    }

    /// @notice Get current nonce for a DID
    function getCurrentNonce(
        string calldata did
    ) external view returns (uint256) {
        return nonces[didHash(did)];
    }

    // ---------- Claim Type Lookup Functions ----------

    /// @notice Get the latest CID for a specific claim type of a DID
    function getLatestCIDByType(
        string calldata did,
        string calldata claimType
    ) external view returns (string memory) {
        return latestCIDByType[didHash(did)][claimType];
    }

    /// @notice Get total number of claims for a specific claim type of a DID
    function getClaimsCountByType(
        string calldata did,
        string calldata claimType
    ) external view returns (uint256) {
        return claimTypeCounts[didHash(did)][claimType];
    }

    /// @notice Get specific claim by index for a specific claim type
    function getClaimByType(
        string calldata did,
        string calldata claimType,
        uint256 index
    ) external view returns (string memory) {
        return claimsByType[didHash(did)][claimType][index];
    }

    /// @notice Get all claims for a specific claim type of a DID
    function getAllClaimsByType(
        string calldata did,
        string calldata claimType
    ) external view returns (string[] memory) {
        return claimsByType[didHash(did)][claimType];
    }

    /// @notice Get claims in a specific range for a specific claim type
    function getClaimsRangeByType(
        string calldata did,
        string calldata claimType,
        uint256 start,
        uint256 end
    ) external view returns (string[] memory) {
        string[] storage typeClaims = claimsByType[didHash(did)][claimType];
        require(start <= end && end < typeClaims.length, "Invalid range");

        string[] memory result = new string[](end - start + 1);
        for (uint256 i = start; i <= end; i++) {
            result[i - start] = typeClaims[i];
        }
        return result;
    }

    /// @notice Check if a DID has any claims of a specific type
    function hasClaimsOfType(
        string calldata did,
        string calldata claimType
    ) external view returns (bool) {
        return claimTypeCounts[didHash(did)][claimType] > 0;
    }

    // ---------- Signature verification helpers ----------

    /// @dev Recover signer from Ethereum signed message
    function recoverEthSignedMessage(
        bytes32 hash,
        bytes memory sig
    ) internal pure returns (address) {
        // Ethereum Signed Message prefix
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(ethHash, v, r, s);
    }

    /// @dev Split signature into v, r, s components
    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65, "invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return (v, r, s);
    }
}

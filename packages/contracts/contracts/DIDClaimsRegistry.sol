// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DIDClaimsRegistry {
    error Unauthorized();
    error EmptyCID();
    error EmptyDID();
    error DIDNotRegistered();
    error DIDAlreadyRegistered();

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
        address indexed submitter
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

    /// @dev Helper: compute DID hash
    function didHash(string calldata did) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(did));
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

    /// @notice Append a claim (CID). Requires signature by ethOwner
    /// Signature format: keccak256(abi.encodePacked("Append", did, cid, address(this), nonce))
    function appendClaim(
        string calldata did,
        string calldata cid,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();
        if (bytes(cid).length == 0) revert EmptyCID();

        bytes32 d = didHash(did);
        address owner = ethOwnerOf[d];
        if (owner == address(0) || !isRegistered[d]) revert DIDNotRegistered();

        // Verify signature
        bytes32 message = keccak256(
            abi.encodePacked("Append", did, address(this), nonces[d])
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != owner) revert Unauthorized();

        // Append claim
        claims[d].push(cid);
        uint256 idx = claims[d].length - 1;
        latestCID[d] = cid;
        nonces[d] += 1;

        emit ClaimAppended(d, did, idx, cid, msg.sender);
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

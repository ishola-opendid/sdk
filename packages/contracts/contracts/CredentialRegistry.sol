// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CredentialRegistry {
    error Unauthorized();
    error EmptyCID();
    error EmptyDID();
    error DIDNotRegistered();
    error DIDAlreadyRegistered();
    error EmptyCredentialType();
    error CredentialTypeNotExists();
    error CredentialTypeAlreadyExists();

    event DIDRegistered(
        bytes32 indexed didHash,
        string did,
        address indexed ethOwner
    );
    event ClaimIssued(
        bytes32 indexed didHash,
        string did,
        string cid,
        string credentialType,
        address indexed submitter
    );
    event CredentialTypeCreated(
        string indexed credentialType,
        address indexed issuer,
        string description
    );

    // Core state
    mapping(bytes32 => address) public ethOwnerOf; // DID => owner
    mapping(bytes32 => bool) public isRegistered; // DID => registered status
    mapping(bytes32 => uint256) public nonces; // DID => nonce for replay protection

    // Credential types
    struct Credential {
        address issuer;
        string description;
        bool exists;
    }
    mapping(string => Credential) public credentials;

    // Claims: DID => credential => latest CID
    mapping(bytes32 => mapping(string => string)) public latestClaim;

    /// @dev Helper: compute DID hash
    function didHash(string calldata did) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(did));
    }

    /// @notice Create a new credential
    function createCredential(
        string calldata credentialName,
        string calldata description
    ) external {
        if (bytes(credentialName).length == 0) revert EmptyCredentialType();
        if (credentials[credentialName].exists)
            revert CredentialTypeAlreadyExists();

        credentials[credentialName] = Credential({
            issuer: msg.sender,
            description: description,
            exists: true
        });

        emit CredentialTypeCreated(credentialName, msg.sender, description);
    }

    /// @notice Register a DID mapping to an Ethereum owner
    function registerDID(
        string calldata did,
        address expectedEthOwner,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();

        bytes32 d = didHash(did);
        if (isRegistered[d]) revert DIDAlreadyRegistered();

        // Verify signature: keccak256(abi.encodePacked("Register", did, address(this), nonce))
        bytes32 message = keccak256(
            abi.encodePacked("Register", did, address(this), nonces[d])
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != expectedEthOwner) revert Unauthorized();

        // Register
        ethOwnerOf[d] = expectedEthOwner;
        isRegistered[d] = true;
        nonces[d] += 1;

        emit DIDRegistered(d, did, expectedEthOwner);
    }

    /// @notice Issue a claim for a DID
    function issueClaim(
        string calldata did,
        string calldata cid,
        string calldata credentialType,
        bytes calldata sig
    ) external {
        if (bytes(did).length == 0) revert EmptyDID();
        if (bytes(cid).length == 0) revert EmptyCID();
        if (bytes(credentialType).length == 0) revert EmptyCredentialType();

        bytes32 d = didHash(did);
        address owner = ethOwnerOf[d];
        if (owner == address(0) || !isRegistered[d]) revert DIDNotRegistered();
        if (!credentials[credentialType].exists)
            revert CredentialTypeNotExists();

        // Verify signature: keccak256(abi.encodePacked("IssueClaim", did, cid, credentialType, address(this), nonce))
        bytes32 message = keccak256(
            abi.encodePacked(
                "IssueClaim",
                did,
                cid,
                credentialType,
                address(this),
                nonces[d]
            )
        );
        address signer = recoverEthSignedMessage(message, sig);
        if (signer != owner) revert Unauthorized();

        // Store the claim (overwrites previous claim of same type)
        latestClaim[d][credentialType] = cid;
        nonces[d] += 1;

        emit ClaimIssued(d, did, cid, credentialType, msg.sender);
    }

    /// @notice Get claim for a DID and credential type
    function getClaim(
        string calldata did,
        string calldata credentialType
    ) external view returns (string memory) {
        return latestClaim[didHash(did)][credentialType];
    }

    /// @notice Check if credential type exists
    function credentialExists(
        string calldata credentialType
    ) external view returns (bool) {
        return credentials[credentialType].exists;
    }

    /// @notice Check if DID is registered
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

    function recoverEthSignedMessage(
        bytes32 hash,
        bytes memory sig
    ) internal pure returns (address) {
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(sig);
        return ecrecover(ethHash, v, r, s);
    }

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

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IENS {
    function resolver(bytes32 node) external view returns (address);

    function owner(bytes32 node) external view returns (address);
}

interface IENSResolver {
    function setText(
        bytes32 node,
        string calldata key,
        string calldata value
    ) external;

    function text(
        bytes32 node,
        string calldata key
    ) external view returns (string memory);

    function supportsInterface(bytes4 interfaceID) external pure returns (bool);
}

/**
 * @title OpenDID
 * @dev contract to attach DID claims to ENS names
 * @author Ishola
 */
contract OpenDID {
    // ENS registry on mainnet
    IENS public constant ENS_REGISTRY =
        IENS(0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e);

    // OpenDID text record key
    string public constant OPENDID_KEY = "opendid:registry";

    // Address of the Filecoin claims registry contract
    address public immutable FILECOIN_CONTRACT;

    // Domain for signature verification
    uint256 public constant CHAIN_ID = 1; // Ethereum mainnet

    constructor(address _filecoinContract) {
        require(
            _filecoinContract != address(0),
            "Invalid Filecoin contract address"
        );
        FILECOIN_CONTRACT = _filecoinContract;
    }

    // Events
    event DIDClaimed(
        bytes32 indexed node,
        string indexed ensName,
        string didRecord,
        address indexed claimer
    );

    event ClaimMessageGenerated(
        bytes32 indexed node,
        string indexed ensName,
        bytes32 indexed messageHash,
        address claimer
    );

    // Errors
    error NotENSOwner(bytes32 node, address caller);
    error ResolverNotFound(bytes32 node);
    error EmptyENSName();
    error DIDAlreadyExists(bytes32 node);
    error DIDNotRegistered(bytes32 node);

    // Nonces for replay protection
    mapping(address => uint256) public nonces;

    /**
     * @dev Register a DID for an ENS name
     * @param ensName The ENS name
     */
    function registerDID(string calldata ensName) external {
        if (bytes(ensName).length == 0) revert EmptyENSName();

        bytes32 node = _namehash(ensName);

        // Verify caller owns the ENS name
        if (ENS_REGISTRY.owner(node) != msg.sender) {
            revert NotENSOwner(node, msg.sender);
        }

        // Get the resolver
        address resolverAddr = ENS_REGISTRY.resolver(node);
        if (resolverAddr == address(0)) revert ResolverNotFound(node);

        IENSResolver resolver = IENSResolver(resolverAddr);

        // Check if DID already exists
        string memory existingDID = resolver.text(node, OPENDID_KEY);
        if (bytes(existingDID).length > 0) {
            revert DIDAlreadyExists(node);
        }

        // Construct the record: "did:opendid:ensName"
        string memory didRecord = string(
            abi.encodePacked("did:opendid:", ensName)
        );

        // Set the text record
        resolver.setText(node, OPENDID_KEY, didRecord);
        emit DIDClaimed(node, ensName, didRecord, msg.sender);
    }

    /**
     * @dev Generate a signed message for adding a claim to Filecoin
     * @param ensName The ENS name
     * @param cid The CID of the claim data on IPFS/Filecoin
     * @return messageHash The hash that needs to be signed
     */
    function generateClaimMessage(
        string calldata ensName,
        string calldata cid
    ) external view returns (bytes32 messageHash) {
        if (bytes(ensName).length == 0) revert EmptyENSName();

        bytes32 node = _namehash(ensName);

        // Verify caller owns the ENS name
        if (ENS_REGISTRY.owner(node) != msg.sender) {
            revert NotENSOwner(node, msg.sender);
        }

        // Check if DID exists
        if (!hasDID(ensName)) {
            revert DIDNotRegistered(node);
        }

        // Construct the DID
        string memory did = string(abi.encodePacked("did:opendid:", ensName));

        // Create message hash for Filecoin contract signature
        // This should match the format expected by DIDClaimsRegistry
        messageHash = keccak256(
            abi.encodePacked(
                "Append",
                did,
                cid,
                FILECOIN_CONTRACT,
                nonces[msg.sender]
            )
        );
        return messageHash;
    }

    /**
     * @dev Generate a signed message for registering DID on Filecoin (first time)
     * @param ensName The ENS name
     * @return messageHash The hash that needs to be signed
     */
    function generateRegistrationMessage(
        string calldata ensName
    ) external view returns (bytes32 messageHash) {
        if (bytes(ensName).length == 0) revert EmptyENSName();

        bytes32 node = _namehash(ensName);

        // Verify caller owns the ENS name
        if (ENS_REGISTRY.owner(node) != msg.sender) {
            revert NotENSOwner(node, msg.sender);
        }

        // Check if DID exists
        if (!hasDID(ensName)) {
            revert DIDNotRegistered(node);
        }

        // Construct the DID
        string memory did = string(abi.encodePacked("did:opendid:", ensName));

        // Create message hash for Filecoin contract signature
        messageHash = keccak256(
            abi.encodePacked(
                "Register",
                did,
                FILECOIN_CONTRACT,
                nonces[msg.sender]
            )
        );

        return messageHash;
    }

    /**
     * @dev Increment nonce after successful operation (called by SDK after Filecoin transaction)
     * @param user The user whose nonce to increment
     */
    function incrementNonce(address user) external {
        // or implement a more sophisticated nonce management system
        nonces[user]++;
    }

    /**
     * @dev Get DID record for an ENS name
     * @param ensName The ENS name
     * @return The DID record or empty string if not set
     */
    function getDID(
        string calldata ensName
    ) external view returns (string memory) {
        if (bytes(ensName).length == 0) return "";

        bytes32 node = _namehash(ensName);
        address resolverAddr = ENS_REGISTRY.resolver(node);

        if (resolverAddr == address(0)) return "";

        IENSResolver resolver = IENSResolver(resolverAddr);
        return resolver.text(node, OPENDID_KEY);
    }

    /**
     * @dev Check if an ENS name has a DID record
     * @param ensName The ENS name
     * @return True if DID exists, false otherwise
     */
    function hasDID(string calldata ensName) public view returns (bool) {
        if (bytes(ensName).length == 0) return false;

        bytes32 node = _namehash(ensName);
        address resolverAddr = ENS_REGISTRY.resolver(node);

        if (resolverAddr == address(0)) return false;

        IENSResolver resolver = IENSResolver(resolverAddr);
        string memory didRecord = resolver.text(node, OPENDID_KEY);

        return bytes(didRecord).length > 0;
    }

    /**
     * @dev Get the namehash of an ENS name
     * @param name The ENS name
     * @return The namehash as bytes32
     */
    function getNamehash(string calldata name) external pure returns (bytes32) {
        return _namehash(name);
    }

    /**
     * @dev Get nonce for a user
     * @param user The user address
     * @return Current nonce
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }

    /**
     * @dev Internal function to compute ENS namehash
     * @param name The ENS name (e.g., "vitalik.eth")
     * @return The namehash
     */
    function _namehash(string memory name) internal pure returns (bytes32) {
        bytes32 node = 0x0000000000000000000000000000000000000000000000000000000000000000;

        if (bytes(name).length == 0) {
            return node;
        }

        // Split by dots and hash each label
        bytes memory nameBytes = bytes(name);
        uint256 len = nameBytes.length;

        // Start from the end and work backwards
        bytes32[] memory labels = new bytes32[](10); // Max 10 levels deep
        uint256 labelCount = 0;
        uint256 start = len;

        // Parse labels from right to left
        for (uint256 i = len; i > 0; i--) {
            if (nameBytes[i - 1] == 0x2e || i == 1) {
                // 0x2e is '.'
                uint256 labelStart = (nameBytes[i - 1] == 0x2e) ? i : 0;
                uint256 labelLen = start - labelStart;

                if (labelLen > 0) {
                    bytes memory label = new bytes(labelLen);
                    for (uint256 j = 0; j < labelLen; j++) {
                        label[j] = nameBytes[labelStart + j];
                    }
                    labels[labelCount] = keccak256(label);
                    labelCount++;
                }
                start = labelStart;
            }
        }

        // Compute namehash from left to right
        for (uint256 i = labelCount; i > 0; i--) {
            node = keccak256(abi.encodePacked(node, labels[i - 1]));
        }

        return node;
    }
}

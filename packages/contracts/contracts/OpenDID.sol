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
    string public constant OPENDID_KEY = "opendid";

    // Events
    event DIDClaimed(
        bytes32 indexed node,
        string indexed ensName,
        string didRecord,
        address indexed claimer
    );
    event DIDUpdated(
        bytes32 indexed node,
        string indexed ensName,
        string oldRecord,
        string newRecord,
        address indexed updater
    );
    event DIDRevoked(
        bytes32 indexed node,
        string indexed ensName,
        address indexed revoker
    );

    // Errors
    error NotENSOwner(bytes32 node, address caller);
    error ResolverNotFound(bytes32 node);
    error InvalidCID(string cid);
    error EmptyENSName();
    error DIDAlreadyExists(bytes32 node);

    /**
     * @dev Claim a DID record for an ENS name
     * @param ensName The ENS name (e.g., "vitalik.eth")
     * @param cid The IPFS CID containing the DID document
     */
    function claimDID(string calldata ensName, string calldata cid) external {
        if (bytes(ensName).length == 0) revert EmptyENSName();
        if (bytes(cid).length == 0) revert InvalidCID(cid);

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

        // Construct the DID record: "did:opendid:<cid>"
        string memory didRecord = string(abi.encodePacked("did:opendid:", cid));

        // Set the text record
        resolver.setText(node, OPENDID_KEY, didRecord);

        emit DIDClaimed(node, ensName, didRecord, msg.sender);
    }

    /**
     * @dev Update an existing DID record
     * @param ensName The ENS name
     * @param newCid The new IPFS CID
     */
    function updateDID(
        string calldata ensName,
        string calldata newCid
    ) external {
        if (bytes(ensName).length == 0) revert EmptyENSName();
        if (bytes(newCid).length == 0) revert InvalidCID(newCid);

        bytes32 node = _namehash(ensName);

        // Verify caller owns the ENS name
        if (ENS_REGISTRY.owner(node) != msg.sender) {
            revert NotENSOwner(node, msg.sender);
        }

        // Get the resolver
        address resolverAddr = ENS_REGISTRY.resolver(node);
        if (resolverAddr == address(0)) revert ResolverNotFound(node);

        IENSResolver resolver = IENSResolver(resolverAddr);

        // Get existing record for event
        string memory oldRecord = resolver.text(node, OPENDID_KEY);

        // Construct new DID record
        string memory newRecord = string(
            abi.encodePacked("did:opendid:", newCid)
        );

        // Update the text record
        resolver.setText(node, OPENDID_KEY, newRecord);

        emit DIDUpdated(node, ensName, oldRecord, newRecord, msg.sender);
    }

    /**
     * @dev Revoke a DID record (set to empty string)
     * @param ensName The ENS name
     */
    function revokeDID(string calldata ensName) external {
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

        // Clear the text record
        resolver.setText(node, OPENDID_KEY, "");

        emit DIDRevoked(node, ensName, msg.sender);
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
    function hasDID(string calldata ensName) external view returns (bool) {
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

    /**
     * @dev Batch operations for efficiency
     * @param ensNames Array of ENS names
     * @param cids Array of CIDs
     */
    function batchClaimDID(
        string[] calldata ensNames,
        string[] calldata cids
    ) external {
        require(ensNames.length == cids.length, "Arrays length mismatch");

        for (uint256 i = 0; i < ensNames.length; i++) {
            // Use try/catch to continue on failures
            try this.claimDID(ensNames[i], cids[i]) {
                // Success - continue
            } catch {
                // Log failure but continue with next item
                continue;
            }
        }
    }

    /**
     * @dev Emergency function to check contract status
     * @return True if contract is operational
     */
    function isOperational() external pure returns (bool) {
        return address(ENS_REGISTRY) != address(0);
    }
}

/**
 * @title OpenDIDFactory
 * @dev Factory contract for deploying OpenDID instances
 */
contract OpenDIDFactory {
    event OpenDIDDeployed(
        address indexed openDIDAddress,
        address indexed deployer
    );

    mapping(address => address[]) public userDeployments;
    address[] public allDeployments;

    function deployOpenDID() external returns (address) {
        OpenDID openDID = new OpenDID();
        address openDIDAddress = address(openDID);

        userDeployments[msg.sender].push(openDIDAddress);
        allDeployments.push(openDIDAddress);

        emit OpenDIDDeployed(openDIDAddress, msg.sender);
        return openDIDAddress;
    }

    function getUserDeployments(
        address user
    ) external view returns (address[] memory) {
        return userDeployments[user];
    }

    function getTotalDeployments() external view returns (uint256) {
        return allDeployments.length;
    }
}

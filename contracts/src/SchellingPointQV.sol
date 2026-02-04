// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract SchellingPointQV {
    // ---------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------

    /// @dev RIP-7212 precompile for secp256r1 (passkey) verification
    address private constant P256 = 0x0000000000000000000000000000000000000100;

    // ---------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------

    address public immutable owner;

    /// @dev identityHash => signer => expiry
    mapping(bytes32 => mapping(address => uint256)) public signers;

    /// @dev identityHash => nonce (replay protection for authorizeSigner)
    mapping(bytes32 => uint256) public nonces;

    struct EventInfo {
        uint256 budget;
        bool active;
    }

    /// @dev eventId => EventInfo
    mapping(uint256 => EventInfo) public events;

    /// @dev eventId => identityHash => topicId => credits
    mapping(uint256 => mapping(bytes32 => mapping(bytes32 => uint256))) public allocations;

    /// @dev eventId => identityHash => total credits spent
    mapping(uint256 => mapping(bytes32 => uint256)) public totalSpent;

    // ---------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------

    event SignerAuthorized(
        bytes32 indexed identityHash,
        address indexed signer,
        uint256 expiry
    );

    event Allocation(
        bytes32 indexed identityHash,
        uint256 indexed eventId,
        bytes32 topicId,
        uint256 credits
    );

    event EventCreated(uint256 indexed eventId, uint256 budget);

    event EventClosed(uint256 indexed eventId);

    // ---------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    // ---------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------

    constructor() {
        owner = msg.sender;
    }

    // ---------------------------------------------------------------
    // Admin functions
    // ---------------------------------------------------------------

    /// @notice Create a new event with a credit budget
    function createEvent(uint256 eventId, uint256 budget) external onlyOwner {
        require(!events[eventId].active && events[eventId].budget == 0, "event exists");
        events[eventId] = EventInfo({ budget: budget, active: true });
        emit EventCreated(eventId, budget);
    }

    /// @notice Close an event so no more allocations can be made
    function closeEvent(uint256 eventId) external onlyOwner {
        require(events[eventId].active, "event not active");
        events[eventId].active = false;
        emit EventClosed(eventId);
    }

    // ---------------------------------------------------------------
    // Passkey authorization (copied from SchellingPointVotes)
    // ---------------------------------------------------------------

    /// @notice Authorize an ephemeral signer via WebAuthn passkey signature
    function authorizeSigner(
        uint256[2] calldata pubKey,
        address signer,
        uint256 expiry,
        bytes calldata authenticatorData,
        string calldata clientDataJSON,
        uint256 r,
        uint256 s
    ) external {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        bytes32 expectedChallengeHash = keccak256(abi.encode(signer, expiry, block.chainid, address(this)));
        require(_verifyChallenge(clientDataJSON, expectedChallengeHash), "invalid challenge");
        bytes32 clientDataHash = sha256(bytes(clientDataJSON));
        bytes32 message = sha256(abi.encodePacked(authenticatorData, clientDataHash));
        require(_verifyP256(message, r, s, pubKey[0], pubKey[1]), "invalid passkey signature");
        require(expiry > block.timestamp, "already expired");
        signers[identityHash][signer] = expiry;
        emit SignerAuthorized(identityHash, signer, expiry);
    }

    // ---------------------------------------------------------------
    // Allocation functions
    // ---------------------------------------------------------------

    /// @notice Allocate credits to a single topic (idempotent)
    function allocate(
        uint256[2] calldata pubKey,
        address signer,
        uint256 eventId,
        bytes32 topicId,
        uint256 credits,
        bytes calldata sig
    ) external {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));

        // Verify signer is authorized and not expired
        require(signers[identityHash][signer] > block.timestamp, "signer not authorized or expired");

        // Verify event is active
        require(events[eventId].active, "event not active");

        // Verify K1 signature from ephemeral signer
        bytes32 msgHash = keccak256(
            abi.encode("allocate", identityHash, eventId, topicId, credits, block.chainid, address(this))
        );
        require(_recoverK1(msgHash, sig) == signer, "invalid signature");

        // Delta update
        uint256 oldCredits = allocations[eventId][identityHash][topicId];
        allocations[eventId][identityHash][topicId] = credits;

        if (credits > oldCredits) {
            totalSpent[eventId][identityHash] += credits - oldCredits;
        } else {
            totalSpent[eventId][identityHash] -= oldCredits - credits;
        }

        // Budget enforcement
        require(totalSpent[eventId][identityHash] <= events[eventId].budget, "over budget");

        emit Allocation(identityHash, eventId, topicId, credits);
    }

    /// @notice Allocate credits to multiple topics in a single transaction (idempotent)
    function batchAllocate(
        uint256[2] calldata pubKey,
        address signer,
        uint256 eventId,
        bytes32[] calldata topicIds,
        uint256[] calldata credits,
        bytes calldata sig
    ) external {
        require(topicIds.length == credits.length, "length mismatch");
        require(topicIds.length > 0, "empty arrays");

        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));

        // Verify signer is authorized and not expired
        require(signers[identityHash][signer] > block.timestamp, "signer not authorized or expired");

        // Verify event is active
        require(events[eventId].active, "event not active");

        // Verify K1 signature from ephemeral signer
        bytes32 msgHash = keccak256(
            abi.encode(
                "batchAllocate",
                identityHash,
                eventId,
                keccak256(abi.encodePacked(topicIds)),
                keccak256(abi.encodePacked(credits)),
                block.chainid,
                address(this)
            )
        );
        require(_recoverK1(msgHash, sig) == signer, "invalid signature");

        // Delta update per topic
        for (uint256 i = 0; i < topicIds.length; i++) {
            uint256 oldCredits = allocations[eventId][identityHash][topicIds[i]];
            allocations[eventId][identityHash][topicIds[i]] = credits[i];

            if (credits[i] > oldCredits) {
                totalSpent[eventId][identityHash] += credits[i] - oldCredits;
            } else {
                totalSpent[eventId][identityHash] -= oldCredits - credits[i];
            }

            emit Allocation(identityHash, eventId, topicIds[i], credits[i]);
        }

        // Budget enforcement after all updates
        require(totalSpent[eventId][identityHash] <= events[eventId].budget, "over budget");
    }

    // ---------------------------------------------------------------
    // View functions
    // ---------------------------------------------------------------

    /// @notice Get allocations for multiple topics at once
    function getAllocations(
        uint256[2] calldata pubKey,
        uint256 eventId,
        bytes32[] calldata topicIds
    ) external view returns (uint256[] memory) {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        uint256[] memory result = new uint256[](topicIds.length);
        for (uint256 i = 0; i < topicIds.length; i++) {
            result[i] = allocations[eventId][identityHash][topicIds[i]];
        }
        return result;
    }

    /// @notice Get remaining budget for an identity in an event
    function getRemainingBudget(
        uint256[2] calldata pubKey,
        uint256 eventId
    ) external view returns (uint256) {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        return events[eventId].budget - totalSpent[eventId][identityHash];
    }

    /// @notice Compute identity hash from public key
    function getIdentityHash(uint256[2] calldata pubKey) external pure returns (bytes32) {
        return keccak256(abi.encode(pubKey[0], pubKey[1]));
    }

    /// @notice Get current nonce for a passkey identity
    function getNonce(uint256[2] calldata pubKey) external view returns (uint256) {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        return nonces[identityHash];
    }

    // ---------------------------------------------------------------
    // Internal helpers (copied from SchellingPointVotes)
    // ---------------------------------------------------------------

    function _verifyChallenge(string calldata clientDataJSON, bytes32 expectedHash) internal pure returns (bool) {
        bytes memory jsonBytes = bytes(clientDataJSON);
        bytes memory expectedB64 = _base64UrlEncode(abi.encodePacked(expectedHash));
        return _contains(jsonBytes, expectedB64);
    }

    function _contains(bytes memory haystack, bytes memory needle) internal pure returns (bool) {
        if (needle.length > haystack.length) return false;
        for (uint256 i = 0; i <= haystack.length - needle.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    function _base64UrlEncode(bytes memory data) internal pure returns (bytes memory) {
        bytes memory TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        uint256 len = data.length;
        if (len == 0) return "";
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        uint256 i = 0;
        uint256 j = 0;
        while (i < len) {
            uint256 a = i < len ? uint8(data[i++]) : 0;
            uint256 b = i < len ? uint8(data[i++]) : 0;
            uint256 c = i < len ? uint8(data[i++]) : 0;
            uint256 triple = (a << 16) | (b << 8) | c;
            result[j++] = TABLE[(triple >> 18) & 0x3F];
            result[j++] = TABLE[(triple >> 12) & 0x3F];
            result[j++] = TABLE[(triple >> 6) & 0x3F];
            result[j++] = TABLE[triple & 0x3F];
        }
        uint256 pad = len % 3;
        if (pad > 0) {
            uint256 trimLen = encodedLen - (3 - pad);
            assembly {
                mstore(result, trimLen)
            }
        }
        return result;
    }

    function _verifyP256(
        bytes32 h, uint256 r, uint256 s, uint256 x, uint256 y
    ) internal view returns (bool) {
        (bool ok, bytes memory res) = P256.staticcall(abi.encode(h, r, s, x, y));
        if (!ok || res.length == 0) return false;
        return abi.decode(res, (bool));
    }

    function _recoverK1(
        bytes32 h, bytes calldata sig
    ) internal pure returns (address) {
        require(sig.length == 65, "invalid signature length");
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        return ecrecover(h, v, r, s);
    }
}

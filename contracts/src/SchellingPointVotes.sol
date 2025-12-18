// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract SchellingPointVotes {
    // RIP-7212 precompile for secp256r1 (passkey) verification
    address constant P256 = 0x0000000000000000000000000000000000000100;

    // identityHash => signer => expiry
    mapping(bytes32 => mapping(address => uint256)) public signers;

    // identityHash => nonce (replay protection)
    mapping(bytes32 => uint256) public nonces;

    event SignerAuthorized(
        bytes32 indexed identityHash,
        address indexed signer,
        uint256 expiry
    );

    event Vote(
        bytes32 indexed identityHash,
        address indexed signer,
        uint256 indexed topicId,
        uint256 amount,
        uint256 nonce
    );

    /// @notice Authorize a k1 signer with WebAuthn passkey signature
    /// @param pubKey The passkey public key [x, y]
    /// @param signer The k1 address to authorize
    /// @param expiry When the authorization expires
    /// @param authenticatorData Raw authenticatorData from WebAuthn
    /// @param clientDataJSON Raw clientDataJSON from WebAuthn (contains challenge)
    /// @param r Signature r value
    /// @param s Signature s value
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

        // Build expected challenge: base64url of keccak256(signer, expiry, chainid, this)
        bytes32 expectedChallengeHash = keccak256(abi.encode(signer, expiry, block.chainid, address(this)));

        // Verify the clientDataJSON contains our challenge
        // The challenge in clientDataJSON is base64url encoded
        require(_verifyChallenge(clientDataJSON, expectedChallengeHash), "invalid challenge");

        // Compute what WebAuthn actually signed: sha256(authenticatorData || sha256(clientDataJSON))
        bytes32 clientDataHash = sha256(bytes(clientDataJSON));
        bytes32 message = sha256(abi.encodePacked(authenticatorData, clientDataHash));

        // Verify the P256 signature
        require(_verifyP256(message, r, s, pubKey[0], pubKey[1]), "invalid passkey signature");
        require(expiry > block.timestamp, "already expired");

        signers[identityHash][signer] = expiry;
        emit SignerAuthorized(identityHash, signer, expiry);
    }

    /// @notice Cast a vote with authorized k1 signer
    function vote(
        uint256[2] calldata pubKey,
        address signer,
        uint256 topicId,
        uint256 amount,
        bytes calldata sig
    ) external {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));

        require(signers[identityHash][signer] > block.timestamp, "signer not authorized");

        uint256 nonce = nonces[identityHash]++;

        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            topicId,
            amount,
            nonce,
            block.chainid,
            address(this)
        ));
        require(_recoverK1(message, sig) == signer, "invalid signer signature");

        emit Vote(identityHash, signer, topicId, amount, nonce);
    }

    /// @notice Get current nonce for an identity
    function getNonce(uint256[2] calldata pubKey) external view returns (uint256) {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        return nonces[identityHash];
    }

    /// @notice Compute identity hash
    function getIdentityHash(uint256[2] calldata pubKey) external pure returns (bytes32) {
        return keccak256(abi.encode(pubKey[0], pubKey[1]));
    }

    /// @notice Verify challenge in clientDataJSON matches expected
    function _verifyChallenge(string calldata clientDataJSON, bytes32 expectedHash) internal pure returns (bool) {
        // clientDataJSON format: {"type":"webauthn.get","challenge":"<base64url>","origin":"..."}
        // We need to find the challenge field and verify it matches our expected hash

        // For simplicity, we'll just check that the clientDataJSON contains the base64url of our hash
        // A more robust implementation would parse the JSON properly

        bytes memory jsonBytes = bytes(clientDataJSON);
        bytes memory expectedB64 = _base64UrlEncode(abi.encodePacked(expectedHash));

        // Search for the challenge in the JSON
        return _contains(jsonBytes, expectedB64);
    }

    /// @notice Check if haystack contains needle
    function _contains(bytes memory haystack, bytes memory needle) internal pure returns (bool) {
        if (needle.length > haystack.length) return false;

        for (uint i = 0; i <= haystack.length - needle.length; i++) {
            bool found = true;
            for (uint j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }

    /// @notice Base64url encode (no padding)
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

        // Remove padding
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
        bytes32 h,
        uint256 r,
        uint256 s,
        uint256 x,
        uint256 y
    ) internal view returns (bool) {
        (bool ok, bytes memory res) = P256.staticcall(
            abi.encode(h, r, s, x, y)
        );
        if (!ok || res.length == 0) return false;
        return abi.decode(res, (bool));
    }

    function _recoverK1(
        bytes32 h,
        bytes calldata sig
    ) internal pure returns (address) {
        require(sig.length == 65, "invalid signature length");
        bytes32 r = bytes32(sig[0:32]);
        bytes32 s = bytes32(sig[32:64]);
        uint8 v = uint8(sig[64]);
        return ecrecover(h, v, r, s);
    }
}

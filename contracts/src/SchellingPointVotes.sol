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

    /// @notice Authorize a k1 signer with passkey signature (r1)
    function authorizeSigner(
        uint256[2] calldata pubKey,  // passkey public key (x, y)
        address signer,
        uint256 expiry,
        bytes calldata sig           // r1 signature from passkey
    ) external {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        bytes32 message = keccak256(abi.encode(
            "authorizeSigner",
            signer,
            expiry,
            block.chainid,
            address(this)
        ));

        require(_verifyR1(message, pubKey, sig), "invalid passkey signature");
        require(expiry > block.timestamp, "already expired");

        signers[identityHash][signer] = expiry;
        emit SignerAuthorized(identityHash, signer, expiry);
    }

    /// @notice Cast a vote with authorized k1 signer
    function vote(
        uint256[2] calldata pubKey,  // passkey public key (for identity)
        address signer,
        uint256 topicId,
        uint256 amount,
        bytes calldata sig           // k1 signature from signer
    ) external {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));

        // Check signer is authorized
        require(signers[identityHash][signer] > block.timestamp, "signer not authorized");

        // Get and increment nonce
        uint256 nonce = nonces[identityHash]++;

        // Verify k1 signature
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

    /// @notice Get current nonce for an identity (for signing)
    function getNonce(uint256[2] calldata pubKey) external view returns (uint256) {
        bytes32 identityHash = keccak256(abi.encode(pubKey[0], pubKey[1]));
        return nonces[identityHash];
    }

    /// @notice Compute identity hash (helper for frontend)
    function getIdentityHash(uint256[2] calldata pubKey) external pure returns (bytes32) {
        return keccak256(abi.encode(pubKey[0], pubKey[1]));
    }

    function _verifyR1(
        bytes32 h,
        uint256[2] calldata pk,
        bytes calldata sig
    ) internal view returns (bool) {
        (bool ok, bytes memory res) = P256.staticcall(
            abi.encode(h, sig, pk[0], pk[1])
        );
        return ok && abi.decode(res, (bool));
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

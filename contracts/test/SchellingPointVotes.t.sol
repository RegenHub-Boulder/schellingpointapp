// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/SchellingPointVotes.sol";

contract SchellingPointVotesTest is Test {
    SchellingPointVotes public votes;

    // Test passkey public key coordinates
    uint256 constant PUB_KEY_X = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    uint256 constant PUB_KEY_Y = 0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321;

    // Test signer (ephemeral wallet)
    uint256 constant SIGNER_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address signer;

    // Derived identity hash
    bytes32 identityHash;

    // Storage slot constants for manual authorization bypass
    // signers mapping: slot = keccak256(abi.encode(signer, keccak256(abi.encode(identityHash, 0))))
    // Actually: signers is at slot 0, nested: keccak256(signer . keccak256(identityHash . slot))
    uint256 constant SIGNERS_SLOT = 0;
    uint256 constant NONCES_SLOT = 1;
    uint256 constant VOTES_SLOT = 2;

    // Test topic IDs
    bytes32 constant TOPIC_1 = keccak256("session-uuid-1");
    bytes32 constant TOPIC_2 = keccak256("session-uuid-2");
    bytes32 constant TOPIC_3 = keccak256("session-uuid-3");

    function setUp() public {
        votes = new SchellingPointVotes();
        signer = vm.addr(SIGNER_PRIVATE_KEY);
        identityHash = keccak256(abi.encode(PUB_KEY_X, PUB_KEY_Y));
    }

    // ============ Helper Functions ============

    /// @notice Authorize signer by directly manipulating storage (bypasses P256)
    function _authorizeSigner(address _signer, uint256 _expiry) internal {
        // Compute storage slot for signers[identityHash][_signer]
        bytes32 innerSlot = keccak256(abi.encode(identityHash, SIGNERS_SLOT));
        bytes32 signerSlot = keccak256(abi.encode(_signer, innerSlot));
        vm.store(address(votes), signerSlot, bytes32(_expiry));
    }

    /// @notice Sign a vote message with the test signer
    function _signVote(
        bytes32 _topicId,
        uint256 _value,
        uint256 _nonce
    ) internal view returns (bytes memory) {
        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            _topicId,
            _value,
            _nonce,
            block.chainid,
            address(votes)
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, message);
        return abi.encodePacked(r, s, v);
    }

    /// @notice Sign a batch vote message with the test signer
    function _signBatchVote(
        bytes32[] memory _topicIds,
        uint256[] memory _values,
        uint256 _nonce
    ) internal view returns (bytes memory) {
        bytes32 message = keccak256(abi.encode(
            "batchVote",
            identityHash,
            keccak256(abi.encodePacked(_topicIds)),
            keccak256(abi.encodePacked(_values)),
            _nonce,
            block.chainid,
            address(votes)
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, message);
        return abi.encodePacked(r, s, v);
    }

    /// @notice Get public key array
    function _pubKey() internal pure returns (uint256[2] memory) {
        return [PUB_KEY_X, PUB_KEY_Y];
    }

    // ============ Vote Tests ============

    function test_vote_storesValue() public {
        // Authorize signer for 1 hour
        _authorizeSigner(signer, block.timestamp + 1 hours);

        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signVote(TOPIC_1, 1, nonce);

        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig);

        // Verify vote was stored
        assertEq(votes.votes(identityHash, TOPIC_1), 1);
    }

    function test_vote_emitsEvent() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signVote(TOPIC_1, 42, nonce);

        vm.expectEmit(true, true, true, true);
        emit SchellingPointVotes.Vote(identityHash, signer, TOPIC_1, 42, nonce);

        votes.vote(_pubKey(), signer, TOPIC_1, 42, sig);
    }

    function test_vote_overwritesPrevious() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // First vote: value = 1
        uint256 nonce1 = votes.getNonce(_pubKey());
        bytes memory sig1 = _signVote(TOPIC_1, 1, nonce1);
        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig1);
        assertEq(votes.votes(identityHash, TOPIC_1), 1);

        // Second vote: value = 50 (overwrites)
        uint256 nonce2 = votes.getNonce(_pubKey());
        bytes memory sig2 = _signVote(TOPIC_1, 50, nonce2);
        votes.vote(_pubKey(), signer, TOPIC_1, 50, sig2);
        assertEq(votes.votes(identityHash, TOPIC_1), 50);

        // Third vote: value = 0 (remove favorite)
        uint256 nonce3 = votes.getNonce(_pubKey());
        bytes memory sig3 = _signVote(TOPIC_1, 0, nonce3);
        votes.vote(_pubKey(), signer, TOPIC_1, 0, sig3);
        assertEq(votes.votes(identityHash, TOPIC_1), 0);
    }

    function test_vote_requiresAuthorizedSigner() public {
        // Don't authorize the signer
        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signVote(TOPIC_1, 1, nonce);

        vm.expectRevert("signer not authorized");
        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig);
    }

    function test_vote_requiresNonExpiredSigner() public {
        // Authorize signer but set expiry in the past
        _authorizeSigner(signer, block.timestamp - 1);

        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signVote(TOPIC_1, 1, nonce);

        vm.expectRevert("signer not authorized");
        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig);
    }

    function test_vote_incrementsNonce() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        assertEq(votes.getNonce(_pubKey()), 0);

        bytes memory sig1 = _signVote(TOPIC_1, 1, 0);
        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig1);
        assertEq(votes.getNonce(_pubKey()), 1);

        bytes memory sig2 = _signVote(TOPIC_2, 1, 1);
        votes.vote(_pubKey(), signer, TOPIC_2, 1, sig2);
        assertEq(votes.getNonce(_pubKey()), 2);
    }

    function test_vote_rejectsReplayedSignature() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signVote(TOPIC_1, 1, nonce);

        // First call succeeds
        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig);

        // Second call with same signature fails (nonce incremented)
        vm.expectRevert("invalid signer signature");
        votes.vote(_pubKey(), signer, TOPIC_1, 1, sig);
    }

    function test_vote_rejectsWrongSigner() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Sign with different private key
        uint256 wrongKey = 0xdead;
        address wrongSigner = vm.addr(wrongKey);

        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            TOPIC_1,
            1,
            0,
            block.chainid,
            address(votes)
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, message);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        vm.expectRevert("invalid signer signature");
        votes.vote(_pubKey(), signer, TOPIC_1, 1, wrongSig);
    }

    // ============ Batch Vote Tests ============

    function test_batchVote_storesAllValues() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](3);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;
        topicIds[2] = TOPIC_3;

        uint256[] memory values = new uint256[](3);
        values[0] = 10;
        values[1] = 20;
        values[2] = 70;

        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signBatchVote(topicIds, values, nonce);

        votes.batchVote(_pubKey(), signer, topicIds, values, sig);

        assertEq(votes.votes(identityHash, TOPIC_1), 10);
        assertEq(votes.votes(identityHash, TOPIC_2), 20);
        assertEq(votes.votes(identityHash, TOPIC_3), 70);
    }

    function test_batchVote_emitsMultipleEvents() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        uint256[] memory values = new uint256[](2);
        values[0] = 1;
        values[1] = 1;

        uint256 nonce = votes.getNonce(_pubKey());
        bytes memory sig = _signBatchVote(topicIds, values, nonce);

        // Both events should be emitted with the same nonce
        vm.expectEmit(true, true, true, true);
        emit SchellingPointVotes.Vote(identityHash, signer, TOPIC_1, 1, nonce);
        vm.expectEmit(true, true, true, true);
        emit SchellingPointVotes.Vote(identityHash, signer, TOPIC_2, 1, nonce);

        votes.batchVote(_pubKey(), signer, topicIds, values, sig);
    }

    function test_batchVote_acceptsZeros() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // First, set some votes
        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        uint256[] memory values1 = new uint256[](2);
        values1[0] = 1;
        values1[1] = 1;

        bytes memory sig1 = _signBatchVote(topicIds, values1, 0);
        votes.batchVote(_pubKey(), signer, topicIds, values1, sig1);

        assertEq(votes.votes(identityHash, TOPIC_1), 1);
        assertEq(votes.votes(identityHash, TOPIC_2), 1);

        // Now remove one and keep the other
        uint256[] memory values2 = new uint256[](2);
        values2[0] = 0; // Remove
        values2[1] = 1; // Keep

        bytes memory sig2 = _signBatchVote(topicIds, values2, 1);
        votes.batchVote(_pubKey(), signer, topicIds, values2, sig2);

        assertEq(votes.votes(identityHash, TOPIC_1), 0);
        assertEq(votes.votes(identityHash, TOPIC_2), 1);
    }

    function test_batchVote_requiresMatchingLengths() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        uint256[] memory values = new uint256[](3); // Mismatched length!
        values[0] = 1;
        values[1] = 1;
        values[2] = 1;

        bytes memory sig = _signBatchVote(topicIds, values, 0);

        vm.expectRevert("arrays length mismatch");
        votes.batchVote(_pubKey(), signer, topicIds, values, sig);
    }

    function test_batchVote_requiresNonEmptyArrays() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](0);
        uint256[] memory values = new uint256[](0);

        // Sign with empty arrays - signature doesn't matter, will fail on require
        bytes memory sig = _signBatchVote(topicIds, values, 0);

        vm.expectRevert("empty arrays");
        votes.batchVote(_pubKey(), signer, topicIds, values, sig);
    }

    function test_batchVote_usesOneNonce() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        assertEq(votes.getNonce(_pubKey()), 0);

        bytes32[] memory topicIds = new bytes32[](3);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;
        topicIds[2] = TOPIC_3;

        uint256[] memory values = new uint256[](3);
        values[0] = 1;
        values[1] = 1;
        values[2] = 1;

        bytes memory sig = _signBatchVote(topicIds, values, 0);
        votes.batchVote(_pubKey(), signer, topicIds, values, sig);

        // Only one nonce increment for 3 votes
        assertEq(votes.getNonce(_pubKey()), 1);
    }

    function test_batchVote_requiresAuthorizedSigner() public {
        // Don't authorize the signer
        bytes32[] memory topicIds = new bytes32[](1);
        topicIds[0] = TOPIC_1;

        uint256[] memory values = new uint256[](1);
        values[0] = 1;

        bytes memory sig = _signBatchVote(topicIds, values, 0);

        vm.expectRevert("signer not authorized");
        votes.batchVote(_pubKey(), signer, topicIds, values, sig);
    }

    // ============ GetVotes Tests ============

    function test_getVotes_returnsStoredValues() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Cast votes
        bytes memory sig1 = _signVote(TOPIC_1, 10, 0);
        votes.vote(_pubKey(), signer, TOPIC_1, 10, sig1);

        bytes memory sig2 = _signVote(TOPIC_2, 20, 1);
        votes.vote(_pubKey(), signer, TOPIC_2, 20, sig2);

        // Query votes
        bytes32[] memory topicIds = new bytes32[](3);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;
        topicIds[2] = TOPIC_3; // Not voted on

        uint256[] memory result = votes.getVotes(_pubKey(), topicIds);

        assertEq(result.length, 3);
        assertEq(result[0], 10);
        assertEq(result[1], 20);
        assertEq(result[2], 0); // Default value
    }

    function test_getVotes_returnsEmptyForNoVotes() public {
        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        uint256[] memory result = votes.getVotes(_pubKey(), topicIds);

        assertEq(result.length, 2);
        assertEq(result[0], 0);
        assertEq(result[1], 0);
    }

    // ============ Identity Hash Tests ============

    function test_getIdentityHash_computesCorrectly() public view {
        bytes32 expected = keccak256(abi.encode(PUB_KEY_X, PUB_KEY_Y));
        bytes32 actual = votes.getIdentityHash(_pubKey());
        assertEq(actual, expected);
    }

    function test_identityHash_differsByPubKey() public view {
        uint256[2] memory pubKey1 = [PUB_KEY_X, PUB_KEY_Y];
        uint256[2] memory pubKey2 = [PUB_KEY_Y, PUB_KEY_X]; // Swapped

        bytes32 hash1 = votes.getIdentityHash(pubKey1);
        bytes32 hash2 = votes.getIdentityHash(pubKey2);

        assertTrue(hash1 != hash2);
    }

    // ============ Signer Authorization Tests ============

    function test_signers_storesExpiry() public {
        uint256 expiry = block.timestamp + 7 days;
        _authorizeSigner(signer, expiry);

        assertEq(votes.signers(identityHash, signer), expiry);
    }

    function test_signers_zeroForUnauthorized() public view {
        address randomSigner = address(0xdead);
        assertEq(votes.signers(identityHash, randomSigner), 0);
    }

    // ============ Edge Cases ============

    function test_vote_largeValue() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        uint256 largeValue = type(uint256).max;
        bytes memory sig = _signVote(TOPIC_1, largeValue, 0);

        votes.vote(_pubKey(), signer, TOPIC_1, largeValue, sig);
        assertEq(votes.votes(identityHash, TOPIC_1), largeValue);
    }

    function test_batchVote_singleItem() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](1);
        topicIds[0] = TOPIC_1;

        uint256[] memory values = new uint256[](1);
        values[0] = 42;

        bytes memory sig = _signBatchVote(topicIds, values, 0);
        votes.batchVote(_pubKey(), signer, topicIds, values, sig);

        assertEq(votes.votes(identityHash, TOPIC_1), 42);
    }

    function test_vote_chainIdInSignature() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Sign with wrong chain ID (manually construct message)
        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            TOPIC_1,
            1,
            0,
            999999, // Wrong chain ID
            address(votes)
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, message);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        vm.expectRevert("invalid signer signature");
        votes.vote(_pubKey(), signer, TOPIC_1, 1, wrongSig);
    }

    function test_vote_contractAddressInSignature() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Sign with wrong contract address (manually construct message)
        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            TOPIC_1,
            1,
            0,
            block.chainid,
            address(0xdead) // Wrong contract address
        ));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, message);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        vm.expectRevert("invalid signer signature");
        votes.vote(_pubKey(), signer, TOPIC_1, 1, wrongSig);
    }
}

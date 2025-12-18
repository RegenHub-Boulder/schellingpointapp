// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/SchellingPointVotes.sol";

contract SchellingPointVotesTest is Test {
    SchellingPointVotes public votes;

    // Test accounts
    address signer1 = address(0x1);
    address signer2 = address(0x2);
    uint256 signer1Key = 0x1234;

    // Test passkey (mock public key)
    uint256[2] internal testPubKey = [
        uint256(0x1111111111111111111111111111111111111111111111111111111111111111),
        uint256(0x2222222222222222222222222222222222222222222222222222222222222222)
    ];

    function setUp() public {
        // Deploy contract on Base Sepolia fork for P256 precompile
        // For local testing without fork, we'll need to mock the precompile
        votes = new SchellingPointVotes();
    }

    function testGetIdentityHash() public view {
        bytes32 hash = votes.getIdentityHash(testPubKey);
        bytes32 expected = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        assertEq(hash, expected);
    }

    function testGetNonce() public view {
        uint256 nonce = votes.getNonce(testPubKey);
        assertEq(nonce, 0);
    }

    function testAuthorizeSigner() public {
        // This test requires the P256 precompile, so it will only work on Base
        // We'll test the state changes assuming signature verification passes

        // Skip test if not on Base (precompile not available)
        if (block.chainid != 84532 && block.chainid != 8453) {
            vm.skip(true);
        }

        uint256 expiry = block.timestamp + 1 days;

        // Mock a valid signature (65 bytes)
        bytes memory sig = new bytes(64);

        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));

        // Expect revert on invalid signature (unless we're on Base with valid sig)
        vm.expectRevert("invalid passkey signature");
        votes.authorizeSigner(testPubKey, signer1, expiry, sig);
    }

    function testVoteWithoutAuthorization() public {
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));

        // Create a signature for vote
        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            uint256(1), // topicId
            uint256(100), // amount
            uint256(0), // nonce
            block.chainid,
            address(votes)
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer1Key, message);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Should revert because signer is not authorized
        vm.expectRevert("signer not authorized");
        votes.vote(testPubKey, vm.addr(signer1Key), 1, 100, sig);
    }

    function testVoteWithManualAuthorization() public {
        // Manually set authorization in storage to bypass P256 signature check
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        uint256 expiry = block.timestamp + 1 days;

        // Use cheatcode to set the signer directly
        bytes32 slot = keccak256(abi.encode(
            vm.addr(signer1Key),
            keccak256(abi.encode(identityHash, uint256(0))) // signers mapping slot
        ));
        vm.store(address(votes), slot, bytes32(expiry));

        // Verify authorization
        assertEq(votes.signers(identityHash, vm.addr(signer1Key)), expiry);

        // Now vote with this authorized signer
        uint256 topicId = 1;
        uint256 amount = 100;
        uint256 nonce = 0;

        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            topicId,
            amount,
            nonce,
            block.chainid,
            address(votes)
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer1Key, message);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Expect Vote event
        vm.expectEmit(true, true, true, true);
        emit SchellingPointVotes.Vote(identityHash, vm.addr(signer1Key), topicId, amount, nonce);

        votes.vote(testPubKey, vm.addr(signer1Key), topicId, amount, sig);

        // Check nonce was incremented
        assertEq(votes.getNonce(testPubKey), 1);
    }

    function testVoteReplayProtection() public {
        // Manually set authorization
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        uint256 expiry = block.timestamp + 1 days;

        bytes32 slot = keccak256(abi.encode(
            vm.addr(signer1Key),
            keccak256(abi.encode(identityHash, uint256(0)))
        ));
        vm.store(address(votes), slot, bytes32(expiry));

        // First vote
        uint256 topicId = 1;
        uint256 amount = 100;
        uint256 nonce = 0;

        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            topicId,
            amount,
            nonce,
            block.chainid,
            address(votes)
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer1Key, message);
        bytes memory sig = abi.encodePacked(r, s, v);

        votes.vote(testPubKey, vm.addr(signer1Key), topicId, amount, sig);

        // Try to replay the same vote with same nonce
        vm.expectRevert("invalid signer signature");
        votes.vote(testPubKey, vm.addr(signer1Key), topicId, amount, sig);
    }

    function testVoteAfterExpiry() public {
        // Manually set authorization with near expiry
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        uint256 expiry = block.timestamp + 100;

        bytes32 slot = keccak256(abi.encode(
            vm.addr(signer1Key),
            keccak256(abi.encode(identityHash, uint256(0)))
        ));
        vm.store(address(votes), slot, bytes32(expiry));

        // Warp time past expiry
        vm.warp(expiry + 1);

        // Try to vote
        uint256 topicId = 1;
        uint256 amount = 100;
        uint256 nonce = 0;

        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            topicId,
            amount,
            nonce,
            block.chainid,
            address(votes)
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer1Key, message);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert("signer not authorized");
        votes.vote(testPubKey, vm.addr(signer1Key), topicId, amount, sig);
    }

    function testVoteWithWrongSigner() public {
        // Manually set authorization for signer1
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        uint256 expiry = block.timestamp + 1 days;

        bytes32 slot = keccak256(abi.encode(
            vm.addr(signer1Key),
            keccak256(abi.encode(identityHash, uint256(0)))
        ));
        vm.store(address(votes), slot, bytes32(expiry));

        // Sign with different key but claim it's from signer1
        uint256 wrongKey = 0x5678;
        uint256 topicId = 1;
        uint256 amount = 100;
        uint256 nonce = 0;

        bytes32 message = keccak256(abi.encode(
            "vote",
            identityHash,
            topicId,
            amount,
            nonce,
            block.chainid,
            address(votes)
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, message);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert("invalid signer signature");
        votes.vote(testPubKey, vm.addr(signer1Key), topicId, amount, sig);
    }

    function testMultipleVotesIncrementNonce() public {
        // Manually set authorization
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        uint256 expiry = block.timestamp + 1 days;

        bytes32 slot = keccak256(abi.encode(
            vm.addr(signer1Key),
            keccak256(abi.encode(identityHash, uint256(0)))
        ));
        vm.store(address(votes), slot, bytes32(expiry));

        // Cast 3 votes
        for (uint256 i = 0; i < 3; i++) {
            bytes32 message = keccak256(abi.encode(
                "vote",
                identityHash,
                uint256(1), // topicId
                uint256(100), // amount
                i, // nonce
                block.chainid,
                address(votes)
            ));

            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signer1Key, message);
            bytes memory sig = abi.encodePacked(r, s, v);

            votes.vote(testPubKey, vm.addr(signer1Key), 1, 100, sig);
        }

        // Check final nonce
        assertEq(votes.getNonce(testPubKey), 3);
    }

    function testInvalidSignatureLength() public {
        // Manually set authorization
        bytes32 identityHash = keccak256(abi.encode(testPubKey[0], testPubKey[1]));
        uint256 expiry = block.timestamp + 1 days;

        bytes32 slot = keccak256(abi.encode(
            vm.addr(signer1Key),
            keccak256(abi.encode(identityHash, uint256(0)))
        ));
        vm.store(address(votes), slot, bytes32(expiry));

        // Create invalid signature (wrong length)
        bytes memory sig = new bytes(64); // Should be 65

        vm.expectRevert("invalid signature length");
        votes.vote(testPubKey, vm.addr(signer1Key), 1, 100, sig);
    }
}

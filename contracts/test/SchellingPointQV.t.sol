// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/SchellingPointQV.sol";

contract SchellingPointQVTest is Test {
    SchellingPointQV public qv;

    // Test passkey public key coordinates
    uint256 constant PUB_KEY_X = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    uint256 constant PUB_KEY_Y = 0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321;

    // Test signer (ephemeral wallet) - Anvil default key #0
    uint256 constant SIGNER_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address signer;

    // Derived identity hash
    bytes32 identityHash;

    // Storage slot for signers mapping (slot 1 because owner is slot 0)
    uint256 constant SIGNERS_SLOT = 1;

    // Event and budget constants
    uint256 constant EVENT_ID = 1;
    uint256 constant BUDGET = 100;

    // Test topic IDs
    bytes32 constant TOPIC_1 = keccak256("session-uuid-1");
    bytes32 constant TOPIC_2 = keccak256("session-uuid-2");
    bytes32 constant TOPIC_3 = keccak256("session-uuid-3");

    function setUp() public {
        qv = new SchellingPointQV();
        signer = vm.addr(SIGNER_PRIVATE_KEY);
        identityHash = keccak256(abi.encode(PUB_KEY_X, PUB_KEY_Y));

        // Create a default event for most tests
        qv.createEvent(EVENT_ID, BUDGET);
    }

    // ============ Helper Functions ============

    /// @notice Authorize signer by directly manipulating storage (bypasses P256)
    function _authorizeSigner(address _signer, uint256 _expiry) internal {
        // signers is at slot 1: mapping(bytes32 => mapping(address => uint256))
        // Inner slot = keccak256(abi.encode(identityHash, 1))
        // Final slot = keccak256(abi.encode(signer, innerSlot))
        bytes32 innerSlot = keccak256(abi.encode(identityHash, SIGNERS_SLOT));
        bytes32 signerSlot = keccak256(abi.encode(_signer, innerSlot));
        vm.store(address(qv), signerSlot, bytes32(_expiry));
    }

    /// @notice Sign an allocate message with the test signer
    function _signAllocate(uint256 eventId, bytes32 topicId, uint256 credits) internal view returns (bytes memory) {
        bytes32 msgHash = keccak256(
            abi.encode("allocate", identityHash, eventId, topicId, credits, block.chainid, address(qv))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, msgHash);
        return abi.encodePacked(r, s, v);
    }

    /// @notice Sign a batchAllocate message with the test signer
    function _signBatchAllocate(
        uint256 eventId,
        bytes32[] memory topicIds,
        uint256[] memory credits
    ) internal view returns (bytes memory) {
        bytes32 msgHash = keccak256(
            abi.encode(
                "batchAllocate",
                identityHash,
                eventId,
                keccak256(abi.encodePacked(topicIds)),
                keccak256(abi.encodePacked(credits)),
                block.chainid,
                address(qv)
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PRIVATE_KEY, msgHash);
        return abi.encodePacked(r, s, v);
    }

    /// @notice Get public key array
    function _pubKey() internal pure returns (uint256[2] memory) {
        return [PUB_KEY_X, PUB_KEY_Y];
    }

    // ============ Allocate Tests ============

    function test_allocate_storesValue() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 25);
    }

    function test_allocate_emitsEvent() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, 25);

        vm.expectEmit(true, true, true, true);
        emit SchellingPointQV.Allocation(identityHash, EVENT_ID, TOPIC_1, 25);

        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig);
    }

    function test_allocate_updatesTotalSpent() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig);

        assertEq(qv.totalSpent(EVENT_ID, identityHash), 25);
    }

    // ============ Reallocate Tests ============

    function test_allocate_increaseCredits() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // First allocation: 10 credits
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_1, 10);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, sig1);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 10);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 10);

        // Increase to 25 credits
        bytes memory sig2 = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig2);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 25);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 25);
    }

    function test_allocate_decreaseCredits() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // First allocation: 25 credits
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig1);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 25);

        // Decrease to 10 credits
        bytes memory sig2 = _signAllocate(EVENT_ID, TOPIC_1, 10);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, sig2);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 10);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 10);
    }

    function test_allocate_setToZero() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // First allocation: 25 credits
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig1);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 25);

        // Set to 0 (free credits)
        bytes memory sig2 = _signAllocate(EVENT_ID, TOPIC_1, 0);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 0, sig2);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 0);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 0);
    }

    // ============ Budget Enforcement Tests ============

    function test_allocate_revertsOverBudget() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Try to allocate more than budget (101 > 100)
        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, BUDGET + 1);

        vm.expectRevert("over budget");
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, BUDGET + 1, sig);
    }

    function test_allocate_exactBudget() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Allocate exactly the budget (should succeed)
        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, BUDGET);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, BUDGET, sig);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), BUDGET);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), BUDGET);
    }

    // ============ Batch Allocate Tests ============

    function test_batchAllocate_storesMultiple() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](3);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;
        topicIds[2] = TOPIC_3;

        uint256[] memory credits = new uint256[](3);
        credits[0] = 10;
        credits[1] = 20;
        credits[2] = 30;

        bytes memory sig = _signBatchAllocate(EVENT_ID, topicIds, credits);
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 10);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_2), 20);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_3), 30);
    }

    function test_batchAllocate_emitsAllEvents() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](3);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;
        topicIds[2] = TOPIC_3;

        uint256[] memory credits = new uint256[](3);
        credits[0] = 10;
        credits[1] = 20;
        credits[2] = 30;

        bytes memory sig = _signBatchAllocate(EVENT_ID, topicIds, credits);

        vm.expectEmit(true, true, true, true);
        emit SchellingPointQV.Allocation(identityHash, EVENT_ID, TOPIC_1, 10);
        vm.expectEmit(true, true, true, true);
        emit SchellingPointQV.Allocation(identityHash, EVENT_ID, TOPIC_2, 20);
        vm.expectEmit(true, true, true, true);
        emit SchellingPointQV.Allocation(identityHash, EVENT_ID, TOPIC_3, 30);

        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig);
    }

    function test_batchAllocate_deltaApproach() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        // First batch: [10, 20] => totalSpent = 30
        uint256[] memory credits1 = new uint256[](2);
        credits1[0] = 10;
        credits1[1] = 20;

        bytes memory sig1 = _signBatchAllocate(EVENT_ID, topicIds, credits1);
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits1, sig1);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 30);

        // Second batch: [5, 30] => totalSpent = 5 + 30 = 35
        uint256[] memory credits2 = new uint256[](2);
        credits2[0] = 5;
        credits2[1] = 30;

        bytes memory sig2 = _signBatchAllocate(EVENT_ID, topicIds, credits2);
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits2, sig2);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 5);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_2), 30);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 35);
    }

    function test_batchAllocate_revertsIfOverBudget() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        // Total = 60 + 50 = 110 > 100 budget
        uint256[] memory credits = new uint256[](2);
        credits[0] = 60;
        credits[1] = 50;

        bytes memory sig = _signBatchAllocate(EVENT_ID, topicIds, credits);

        vm.expectRevert("over budget");
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig);
    }

    function test_batchAllocate_requiresMatchingLengths() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        uint256[] memory credits = new uint256[](3);
        credits[0] = 10;
        credits[1] = 20;
        credits[2] = 30;

        bytes memory sig = _signBatchAllocate(EVENT_ID, topicIds, credits);

        vm.expectRevert("length mismatch");
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig);
    }

    function test_batchAllocate_requiresNonEmpty() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](0);
        uint256[] memory credits = new uint256[](0);

        bytes memory sig = _signBatchAllocate(EVENT_ID, topicIds, credits);

        vm.expectRevert("empty arrays");
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig);
    }

    function test_batchAllocate_singleItem() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes32[] memory topicIds = new bytes32[](1);
        topicIds[0] = TOPIC_1;

        uint256[] memory credits = new uint256[](1);
        credits[0] = 42;

        bytes memory sig = _signBatchAllocate(EVENT_ID, topicIds, credits);
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 42);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 42);
    }

    // ============ Event Lifecycle Tests ============

    function test_createEvent_setsBudget() public {
        uint256 newEventId = 99;
        uint256 newBudget = 500;

        qv.createEvent(newEventId, newBudget);

        (uint256 budget, bool active) = qv.events(newEventId);
        assertEq(budget, newBudget);
        assertTrue(active);
    }

    function test_createEvent_emitsEvent() public {
        uint256 newEventId = 99;
        uint256 newBudget = 500;

        vm.expectEmit(true, true, true, true);
        emit SchellingPointQV.EventCreated(newEventId, newBudget);

        qv.createEvent(newEventId, newBudget);
    }

    function test_createEvent_onlyOwner() public {
        address notOwner = address(0xdead);
        vm.prank(notOwner);

        vm.expectRevert("not owner");
        qv.createEvent(99, 500);
    }

    function test_createEvent_revertsDuplicate() public {
        // EVENT_ID already created in setUp
        vm.expectRevert("event exists");
        qv.createEvent(EVENT_ID, 200);
    }

    function test_closeEvent_deactivates() public {
        qv.closeEvent(EVENT_ID);

        (uint256 budget, bool active) = qv.events(EVENT_ID);
        assertEq(budget, BUDGET);
        assertFalse(active);
    }

    function test_closeEvent_emitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit SchellingPointQV.EventClosed(EVENT_ID);

        qv.closeEvent(EVENT_ID);
    }

    function test_closeEvent_onlyOwner() public {
        address notOwner = address(0xdead);
        vm.prank(notOwner);

        vm.expectRevert("not owner");
        qv.closeEvent(EVENT_ID);
    }

    function test_closeEvent_revertsAlreadyClosed() public {
        qv.closeEvent(EVENT_ID);

        vm.expectRevert("event not active");
        qv.closeEvent(EVENT_ID);
    }

    function test_allocate_revertsOnClosedEvent() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);
        qv.closeEvent(EVENT_ID);

        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, 10);

        vm.expectRevert("event not active");
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, sig);
    }

    // ============ Signer Authorization Tests ============

    function test_allocate_revertsUnauthorized() public {
        // Don't authorize the signer
        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, 10);

        vm.expectRevert("signer not authorized or expired");
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, sig);
    }

    function test_allocate_revertsExpired() public {
        // Authorize signer with an expiry in the past
        _authorizeSigner(signer, block.timestamp - 1);

        bytes memory sig = _signAllocate(EVENT_ID, TOPIC_1, 10);

        vm.expectRevert("signer not authorized or expired");
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, sig);
    }

    function test_allocate_revertsInvalidSignature() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Sign with a different private key
        uint256 wrongKey = 0xdead;
        bytes32 msgHash = keccak256(
            abi.encode("allocate", identityHash, EVENT_ID, TOPIC_1, uint256(10), block.chainid, address(qv))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongKey, msgHash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        vm.expectRevert("invalid signature");
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, wrongSig);
    }

    function test_allocate_revertsInvalidSignatureLength() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Pass a signature with wrong length (64 bytes instead of 65)
        bytes memory badSig = new bytes(64);

        vm.expectRevert("invalid signature length");
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, badSig);
    }

    // ============ Idempotent Tests ============

    function test_allocate_idempotent() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Allocate 25 credits
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig1);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 25);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 25);

        // Allocate same amount again (idempotent: totalSpent should not change)
        bytes memory sig2 = _signAllocate(EVENT_ID, TOPIC_1, 25);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 25, sig2);

        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 25);
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 25);
    }

    // ============ View Function Tests ============

    function test_getAllocations_returnsValues() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Allocate to two topics
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_1, 10);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 10, sig1);

        bytes memory sig2 = _signAllocate(EVENT_ID, TOPIC_2, 20);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_2, 20, sig2);

        // Query all three topics (TOPIC_3 not allocated)
        bytes32[] memory topicIds = new bytes32[](3);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;
        topicIds[2] = TOPIC_3;

        uint256[] memory result = qv.getAllocations(_pubKey(), EVENT_ID, topicIds);

        assertEq(result.length, 3);
        assertEq(result[0], 10);
        assertEq(result[1], 20);
        assertEq(result[2], 0); // Not allocated
    }

    function test_getRemainingBudget_correct() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // Start with full budget
        assertEq(qv.getRemainingBudget(_pubKey(), EVENT_ID), BUDGET);

        // Allocate 30 credits
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_1, 30);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_1, 30, sig1);

        assertEq(qv.getRemainingBudget(_pubKey(), EVENT_ID), BUDGET - 30);

        // Allocate 20 more to another topic
        bytes memory sig2 = _signAllocate(EVENT_ID, TOPIC_2, 20);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_2, 20, sig2);

        assertEq(qv.getRemainingBudget(_pubKey(), EVENT_ID), BUDGET - 50);
    }

    // ============ Edge Case Tests ============

    function test_allocate_largeCredits() public {
        // Create event with large budget
        uint256 largeBudget = 1_000_000;
        qv.createEvent(42, largeBudget);
        _authorizeSigner(signer, block.timestamp + 1 hours);

        bytes memory sig = _signAllocate(42, TOPIC_1, largeBudget);
        qv.allocate(_pubKey(), signer, 42, TOPIC_1, largeBudget, sig);

        assertEq(qv.allocations(42, identityHash, TOPIC_1), largeBudget);
        assertEq(qv.totalSpent(42, identityHash), largeBudget);
        assertEq(qv.getRemainingBudget(_pubKey(), 42), 0);
    }

    function test_batchAllocate_untouchedTopics() public {
        _authorizeSigner(signer, block.timestamp + 1 hours);

        // First allocate to TOPIC_3 via single allocate
        bytes memory sig1 = _signAllocate(EVENT_ID, TOPIC_3, 15);
        qv.allocate(_pubKey(), signer, EVENT_ID, TOPIC_3, 15, sig1);

        // Batch allocate to TOPIC_1 and TOPIC_2 only
        bytes32[] memory topicIds = new bytes32[](2);
        topicIds[0] = TOPIC_1;
        topicIds[1] = TOPIC_2;

        uint256[] memory credits = new uint256[](2);
        credits[0] = 10;
        credits[1] = 20;

        bytes memory sig2 = _signBatchAllocate(EVENT_ID, topicIds, credits);
        qv.batchAllocate(_pubKey(), signer, EVENT_ID, topicIds, credits, sig2);

        // TOPIC_3 should be unchanged
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_3), 15);
        // TOPIC_1 and TOPIC_2 should be set
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_1), 10);
        assertEq(qv.allocations(EVENT_ID, identityHash, TOPIC_2), 20);
        // Total spent = 15 + 10 + 20 = 45
        assertEq(qv.totalSpent(EVENT_ID, identityHash), 45);
    }

    function test_getIdentityHash_correct() public view {
        bytes32 expected = keccak256(abi.encode(PUB_KEY_X, PUB_KEY_Y));
        bytes32 actual = qv.getIdentityHash(_pubKey());
        assertEq(actual, expected);
    }

    function test_identityHash_differsByPubKey() public view {
        uint256[2] memory pubKey1 = [PUB_KEY_X, PUB_KEY_Y];
        uint256[2] memory pubKey2 = [PUB_KEY_Y, PUB_KEY_X]; // Swapped

        bytes32 hash1 = qv.getIdentityHash(pubKey1);
        bytes32 hash2 = qv.getIdentityHash(pubKey2);

        assertTrue(hash1 != hash2);
    }

    function test_signers_storesExpiry() public {
        uint256 expiry = block.timestamp + 7 days;
        _authorizeSigner(signer, expiry);

        assertEq(qv.signers(identityHash, signer), expiry);
    }

    function test_signers_zeroForUnauthorized() public view {
        address randomSigner = address(0xdead);
        assertEq(qv.signers(identityHash, randomSigner), 0);
    }
}

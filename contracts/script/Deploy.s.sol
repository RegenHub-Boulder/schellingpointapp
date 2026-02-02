// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/SchellingPointQV.sol";

contract DeployScript is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        SchellingPointQV qv = new SchellingPointQV();

        // Create event with ID derived from "schelling-point-2025"
        uint256 eventId = uint256(keccak256("schelling-point-2025"));
        qv.createEvent(eventId, 100);

        vm.stopBroadcast();

        console.log("============================================");
        console.log("SchellingPointQV deployed to:", address(qv));
        console.log("Event ID:", eventId);
        console.log("Chain ID:", block.chainid);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("============================================");
    }
}

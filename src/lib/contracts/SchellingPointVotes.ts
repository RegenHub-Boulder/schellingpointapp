// ABI for SchellingPointVotes contract
// Updated for WebAuthn signature verification

export const SCHELLING_POINT_VOTES_ABI = [
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "address", "name": "signer", "type": "address" },
      { "internalType": "uint256", "name": "expiry", "type": "uint256" },
      { "internalType": "bytes", "name": "authenticatorData", "type": "bytes" },
      { "internalType": "string", "name": "clientDataJSON", "type": "string" },
      { "internalType": "uint256", "name": "r", "type": "uint256" },
      { "internalType": "uint256", "name": "s", "type": "uint256" }
    ],
    "name": "authorizeSigner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "address", "name": "signer", "type": "address" },
      { "internalType": "uint256", "name": "topicId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "sig", "type": "bytes" }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" }
    ],
    "name": "getNonce",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "identityHash", "type": "bytes32" },
      { "internalType": "address", "name": "signer", "type": "address" }
    ],
    "name": "signers",
    "outputs": [
      { "internalType": "uint256", "name": "expiry", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" }
    ],
    "name": "getIdentityHash",
    "outputs": [
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "stateMutability": "pure",
    "type": "function"
  }
] as const

export function getContractConfig() {
  return {
    address: process.env.CONTRACT_ADDRESS as `0x${string}`,
    abi: SCHELLING_POINT_VOTES_ABI
  }
}

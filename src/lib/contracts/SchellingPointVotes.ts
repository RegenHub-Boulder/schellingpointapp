// ABI for SchellingPointVotes contract
// Updated for WebAuthn signature verification with vote storage

export const SCHELLING_POINT_VOTES_ABI = [
  // authorizeSigner - Authorize ephemeral signer with WebAuthn signature
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
  // vote - Cast single vote (stores to mapping)
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "address", "name": "signer", "type": "address" },
      { "internalType": "bytes32", "name": "topicId", "type": "bytes32" },
      { "internalType": "uint256", "name": "value", "type": "uint256" },
      { "internalType": "bytes", "name": "sig", "type": "bytes" }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // batchVote - Cast multiple votes in single transaction
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "address", "name": "signer", "type": "address" },
      { "internalType": "bytes32[]", "name": "topicIds", "type": "bytes32[]" },
      { "internalType": "uint256[]", "name": "values", "type": "uint256[]" },
      { "internalType": "bytes", "name": "sig", "type": "bytes" }
    ],
    "name": "batchVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // getVotes - Read multiple votes at once
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "bytes32[]", "name": "topicIds", "type": "bytes32[]" }
    ],
    "name": "getVotes",
    "outputs": [
      { "internalType": "uint256[]", "name": "values", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // getNonce - Get current nonce for replay protection
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
  // signers - Check signer authorization expiry
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
  // votes - Read individual vote value
  {
    "inputs": [
      { "internalType": "bytes32", "name": "identityHash", "type": "bytes32" },
      { "internalType": "bytes32", "name": "topicId", "type": "bytes32" }
    ],
    "name": "votes",
    "outputs": [
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // getIdentityHash - Compute identity hash from public key
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
  },
  // nonces - Read nonce for identity
  {
    "inputs": [
      { "internalType": "bytes32", "name": "identityHash", "type": "bytes32" }
    ],
    "name": "nonces",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "identityHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "signer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "expiry", "type": "uint256" }
    ],
    "name": "SignerAuthorized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "identityHash", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "signer", "type": "address" },
      { "indexed": true, "internalType": "bytes32", "name": "topicId", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "nonce", "type": "uint256" }
    ],
    "name": "Vote",
    "type": "event"
  }
] as const

export function getContractConfig() {
  return {
    address: process.env.CONTRACT_ADDRESS as `0x${string}`,
    abi: SCHELLING_POINT_VOTES_ABI
  }
}

// ABI for SchellingPointQV contract
// Overhauled voting contract with event-scoped credit budgets and allocations

export const SCHELLING_POINT_QV_ABI = [
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
  // createEvent - Create a new event with budget (onlyOwner)
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "uint256", "name": "budget", "type": "uint256" }
    ],
    "name": "createEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // closeEvent - Close an event (onlyOwner)
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "closeEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // allocate - Allocate credits to a single topic
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "address", "name": "signer", "type": "address" },
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "bytes32", "name": "topicId", "type": "bytes32" },
      { "internalType": "uint256", "name": "credits", "type": "uint256" },
      { "internalType": "bytes", "name": "sig", "type": "bytes" }
    ],
    "name": "allocate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // batchAllocate - Allocate credits to multiple topics in one tx
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "address", "name": "signer", "type": "address" },
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "bytes32[]", "name": "topicIds", "type": "bytes32[]" },
      { "internalType": "uint256[]", "name": "credits", "type": "uint256[]" },
      { "internalType": "bytes", "name": "sig", "type": "bytes" }
    ],
    "name": "batchAllocate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // getAllocations - Read allocations for multiple topics at once
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "bytes32[]", "name": "topicIds", "type": "bytes32[]" }
    ],
    "name": "getAllocations",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // getRemainingBudget - Get remaining credits for an identity in an event
  {
    "inputs": [
      { "internalType": "uint256[2]", "name": "pubKey", "type": "uint256[2]" },
      { "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "getRemainingBudget",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
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
  // events - Read event data (budget and active status)
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "events",
    "outputs": [
      { "internalType": "uint256", "name": "budget", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // allocations - Read individual allocation value
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "bytes32", "name": "identityHash", "type": "bytes32" },
      { "internalType": "bytes32", "name": "topicId", "type": "bytes32" }
    ],
    "name": "allocations",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // totalSpent - Read total credits spent by identity in an event
  {
    "inputs": [
      { "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "internalType": "bytes32", "name": "identityHash", "type": "bytes32" }
    ],
    "name": "totalSpent",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // owner - Contract owner address
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
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
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "indexed": true, "internalType": "bytes32", "name": "topicId", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "credits", "type": "uint256" }
    ],
    "name": "Allocation",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "budget", "type": "uint256" }
    ],
    "name": "EventCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "eventId", "type": "uint256" }
    ],
    "name": "EventClosed",
    "type": "event"
  }
] as const

export const CONTRACT_ADDRESS = '0x1e3703d4e2135dE24450FDA5cf18c18c66711523'
export const EVENT_ID = '101310439360068229198498235905453178362848215801890223219690675748118742731958'

export function getContractConfig() {
  return {
    address: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || CONTRACT_ADDRESS) as `0x${string}`,
    abi: SCHELLING_POINT_QV_ABI
  }
}

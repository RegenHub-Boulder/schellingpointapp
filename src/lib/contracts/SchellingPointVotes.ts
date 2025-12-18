// ABI for SchellingPointVotes contract
// Only includes the functions we need for the API

export const SCHELLING_POINT_VOTES_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256[2]",
        "name": "pubKey",
        "type": "uint256[2]"
      },
      {
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      },
      {
        "internalType": "uint256[2]",
        "name": "signature",
        "type": "uint256[2]"
      }
    ],
    "name": "authorizeSigner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[2]",
        "name": "pubKey",
        "type": "uint256[2]"
      },
      {
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "topicId",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "amount",
        "type": "int256"
      },
      {
        "internalType": "uint256[2]",
        "name": "signature",
        "type": "uint256[2]"
      }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[2]",
        "name": "pubKey",
        "type": "uint256[2]"
      }
    ],
    "name": "getNonce",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "identityHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "signer",
        "type": "address"
      }
    ],
    "name": "signers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "expiry",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function getContractConfig() {
  return {
    address: process.env.CONTRACT_ADDRESS as `0x${string}`,
    abi: SCHELLING_POINT_VOTES_ABI
  }
}

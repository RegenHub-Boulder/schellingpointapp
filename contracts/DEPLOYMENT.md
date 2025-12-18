# SchellingPointVotes Deployment Guide

## Prerequisites

1. **Foundry** - Already installed
2. **Base Sepolia ETH** - Get from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
3. **Private Key** - A wallet with Base Sepolia ETH
4. **Basescan API Key** (optional, for verification) - Get from [Basescan](https://basescan.org/myapikey)

## Environment Setup

Create a `.env` file in the project root with:

```bash
PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key_here
```

**Security Note**: Never commit `.env` to git. It's already in `.gitignore`.

## Deployment Methods

### Method 1: Using the Deploy Script (Recommended)

```bash
cd contracts
source ../.env  # Load environment variables
./deploy.sh
```

### Method 2: Manual Deployment

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url base_sepolia \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvvv
```

### Method 3: Interactive Keystore (Most Secure)

First, create an encrypted keystore:
```bash
cast wallet import deployer --interactive
```

Then deploy using the keystore:
```bash
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url base_sepolia \
    --account deployer \
    --sender YOUR_ADDRESS \
    --broadcast \
    --verify \
    -vvvv
```

## Network Details

- **Network**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Block Explorer**: https://sepolia.basescan.org

## Verification

If auto-verification fails, verify manually:

```bash
forge verify-contract \
    --chain-id 84532 \
    --num-of-optimizations 200 \
    --watch \
    --compiler-version 0.8.30 \
    DEPLOYED_ADDRESS \
    src/SchellingPointVotes.sol:SchellingPointVotes \
    --etherscan-api-key $BASESCAN_API_KEY
```

## After Deployment

1. **Save the contract address** - Update `CONTRACT_ADDRESS` in your `.env` file
2. **Test the contract** - Use the Base Sepolia explorer to interact
3. **Update frontend** - Configure your frontend with the new contract address

## Testing P256 Precompile

The contract uses RIP-7212 P256 precompile at `0x0000000000000000000000000000000000000100`.
This precompile is available on Base Sepolia and Base Mainnet.

To test locally:
```bash
# Fork Base Sepolia
forge test --fork-url https://sepolia.base.org -vvv
```

## Troubleshooting

### "Insufficient funds"
Get Base Sepolia ETH from the faucet above.

### "Nonce too low/high"
Reset your account nonce or wait a few blocks.

### "Verification failed"
Check that your BASESCAN_API_KEY is correct and try manual verification.

### "P256 precompile not found" (local tests)
This is expected. The P256 precompile only exists on Base networks.
Use fork testing or deploy to Base Sepolia for full functionality.

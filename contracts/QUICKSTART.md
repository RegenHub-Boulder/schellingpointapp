# SchellingPointVotes - Quick Start

## What You Have

A complete Foundry project with:
- ✅ SchellingPointVotes contract (src/SchellingPointVotes.sol)
- ✅ Comprehensive test suite (9 passing tests)
- ✅ Deployment scripts
- ✅ Base Sepolia configuration

## Quick Commands

```bash
# Run tests
forge test -vv

# Dry run (shows deployment info)
forge script script/DeployDryRun.s.sol:DeployDryRunScript

# Deploy to Base Sepolia (requires PRIVATE_KEY env var)
./deploy.sh
```

## What You Need to Deploy

1. **Private Key with Base Sepolia ETH**
   - Get ETH: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

2. **Set Environment Variable**
   ```bash
   export PRIVATE_KEY=0xYourPrivateKeyHere
   ```

3. **Deploy**
   ```bash
   cd /workspace/project/contracts
   ./deploy.sh
   ```

## Contract Features

- **Passkey Authentication**: Uses RIP-7212 P256 precompile
- **Dual Signature**: R1 (passkey) for auth, K1 (EOA) for voting
- **Replay Protection**: Nonce-based
- **Expiring Signers**: Time-limited authorizations

## Next Steps After Deployment

1. Update `CONTRACT_ADDRESS` in project `.env`
2. Test on Base Sepolia explorer
3. Configure frontend with contract address

## Need Help?

See `DEPLOYMENT.md` for detailed deployment options and troubleshooting.

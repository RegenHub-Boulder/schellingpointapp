#!/bin/bash

# Deploy SchellingPointVotes to Base Sepolia
# Usage: ./deploy.sh

set -e

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable is not set"
    echo "Please set it with: export PRIVATE_KEY=your_private_key"
    exit 1
fi

# Deploy to Base Sepolia
echo "Deploying SchellingPointVotes to Base Sepolia..."
forge script script/Deploy.s.sol:DeployScript \
    --rpc-url base_sepolia \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "Deployment complete!"
echo "Check the output above for the deployed contract address."

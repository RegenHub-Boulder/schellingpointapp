#!/bin/bash
# Foundry Installation Script for Linux (including Fedora)
# Downloads and installs Foundry using foundryup

set -e

echo "=== Foundry Installation Script ==="
echo ""

# Check for required dependencies
echo "Checking dependencies..."

# Check for curl
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed."
    echo "On Fedora, install with: sudo dnf install curl"
    exit 1
fi

# Check for git (required by foundry)
if ! command -v git &> /dev/null; then
    echo "Error: git is required but not installed."
    echo "On Fedora, install with: sudo dnf install git"
    exit 1
fi

echo "Dependencies satisfied."
echo ""

# Set up Foundry directory
FOUNDRY_DIR="${FOUNDRY_DIR:-$HOME/.foundry}"
FOUNDRY_BIN_DIR="$FOUNDRY_DIR/bin"

echo "Installing Foundry to: $FOUNDRY_DIR"
echo ""

# Download and run foundryup
echo "Downloading foundryup..."
curl -L https://foundry.paradigm.xyz | bash

# Source the environment to get foundryup in path
export PATH="$FOUNDRY_BIN_DIR:$PATH"

# Run foundryup to install the toolchain
echo ""
echo "Running foundryup to install Foundry toolchain..."
"$FOUNDRY_BIN_DIR/foundryup"

# Add to .bashrc if not already present
BASHRC="$HOME/.bashrc"
FOUNDRY_PATH_LINE="export PATH=\"\$HOME/.foundry/bin:\$PATH\""

if ! grep -q ".foundry/bin" "$BASHRC" 2>/dev/null; then
    echo "" >> "$BASHRC"
    echo "# Foundry" >> "$BASHRC"
    echo "$FOUNDRY_PATH_LINE" >> "$BASHRC"
    echo "Added Foundry to PATH in $BASHRC"
fi

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Foundry tools installed:"
echo "  - forge (build and test)"
echo "  - cast (interact with contracts)"
echo "  - anvil (local testnet)"
echo "  - chisel (Solidity REPL)"
echo ""
echo "Run 'source ~/.bashrc' or start a new terminal to use Foundry."
echo ""

# Verify installation
echo "Verifying installation..."
if command -v forge &> /dev/null || [ -x "$FOUNDRY_BIN_DIR/forge" ]; then
    echo "forge version: $("$FOUNDRY_BIN_DIR/forge" --version 2>/dev/null || forge --version)"
    echo "cast version: $("$FOUNDRY_BIN_DIR/cast" --version 2>/dev/null || cast --version)"
    echo "anvil version: $("$FOUNDRY_BIN_DIR/anvil" --version 2>/dev/null || anvil --version)"
    echo ""
    echo "Foundry installed successfully!"
else
    echo "Warning: Could not verify installation. Please run 'source ~/.bashrc' and try 'forge --version'"
fi

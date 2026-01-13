#!/bin/bash

# Script to create GitHub issues from markdown files
# Usage: ./create-issues.sh

set -e

REPO="RegenHub-Boulder/schellingpointapp"
ASSIGNEE="unforced"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    echo ""
    echo "On macOS: brew install gh"
    echo "On Ubuntu/Debian: sudo apt install gh"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Please run: gh auth login"
    exit 1
fi

echo "Creating GitHub issues for ${REPO}..."
echo ""

# Function to extract title from markdown (first # heading)
get_title() {
    local file="$1"
    grep -m 1 "^# " "$file" | sed 's/^# //'
}

# Function to extract labels from markdown
get_labels() {
    local file="$1"
    grep "^\*\*Labels:\*\*" "$file" | sed 's/\*\*Labels:\*\* //' | tr -d ' '
}

# Function to determine priority label
get_priority() {
    local file="$1"
    local priority=$(grep "^\*\*Priority:\*\*" "$file" | sed 's/\*\*Priority:\*\* //' | tr '[:upper:]' '[:lower:]')
    echo "$priority"
}

# Counter for created issues
count=0

# Process each markdown file in order
for file in "$SCRIPT_DIR"/*.md; do
    if [[ -f "$file" ]] && [[ "$(basename "$file")" != "README.md" ]]; then
        filename=$(basename "$file")
        echo "Processing: $filename"

        # Extract title
        title=$(get_title "$file")

        # Extract labels
        labels=$(get_labels "$file")

        # Extract priority and add to labels if present
        priority=$(get_priority "$file")
        if [[ -n "$priority" ]]; then
            if [[ -n "$labels" ]]; then
                labels="${labels},priority:${priority}"
            else
                labels="priority:${priority}"
            fi
        fi

        # Create the issue
        echo "  Creating issue: $title"

        if gh issue create \
            --repo "$REPO" \
            --title "$title" \
            --body-file "$file" \
            --assignee "$ASSIGNEE" \
            --label "$labels"; then
            echo "  ✓ Issue created successfully"
            ((count++))
        else
            echo "  ✗ Failed to create issue"
        fi

        echo ""

        # Small delay to avoid rate limiting
        sleep 1
    fi
done

echo "========================================="
echo "Completed! Created $count issues."
echo "View them at: https://github.com/${REPO}/issues"
echo "========================================="

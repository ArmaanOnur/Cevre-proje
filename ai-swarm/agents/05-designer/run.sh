#!/bin/bash
set -e
AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_NAME=$(basename "$AGENT_DIR")
echo "🤖 Running: $AGENT_NAME"
echo "Input: $1"
# Call API with system prompt

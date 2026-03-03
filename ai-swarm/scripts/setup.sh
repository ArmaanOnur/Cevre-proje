#!/bin/bash

# ═══════════════════════════════════════════════════════════
# ÇEVRE AI SWARM - SETUP SCRIPT
# ═══════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  ÇEVRE AI SWARM - SETUP"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required (you have $(node -v))"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔑 Checking API key..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  ANTHROPIC_API_KEY not set"
    echo ""
    echo "Please set your API key:"
    echo "  export ANTHROPIC_API_KEY='your-key-here'"
    echo ""
    echo "Get your key at: https://console.anthropic.com/settings/keys"
else
    echo "✅ API key found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Usage:"
echo "  # Run full swarm"
echo "  npm run swarm \"Add Stories feature\""
echo ""
echo "  # Run single agent"
echo "  npm run agent team-lead \"Analyze Stories feature\""
echo ""
echo "  # Test API key"
echo "  ./scripts/test-api.sh"
echo ""

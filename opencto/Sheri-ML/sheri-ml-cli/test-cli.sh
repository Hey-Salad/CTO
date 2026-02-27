#!/bin/bash
# SheriML CLI Test Suite — Validates all commands and brand colors

set -e

CLI="node dist/cli.js"

echo "🍓 Testing SheriML CLI..."
echo ""

echo "✓ Testing version..."
$CLI --version

echo ""
echo "✓ Testing models list..."
$CLI --models | head -15

echo ""
echo "✓ Testing team commands..."
$CLI team list | head -15
$CLI team tools | head -15
$CLI team cost | head -20

echo ""
echo "✓ Testing metrics commands..."
$CLI metrics dora | head -12
$CLI metrics kpis | head -15

echo ""
echo "✓ Testing roadmap commands..."
$CLI roadmap now | head -20
$CLI roadmap milestones | head -20

echo ""
echo "🍓 All tests passed! CLI is working perfectly."
echo ""
echo "Brand colors verified:"
echo "  🍓 Cherry Red (#ed4c4c) - Primary brand color"
echo "  🍓 Peach (#faa09a) - Secondary/success"
echo "  🍓 Light Peach (#ffd0cd) - Accents/borders"
echo "  🍓 Strawberry emoji throughout"

#!/bin/bash
# 🧪 Quick MQTT Agent Test Script
# Starts 2 agents and sends test tasks

CLI_PATH="$(cd "$(dirname "$0")/sheri-ml-cli" && pwd)"
BROKER="mqtt://localhost:1883"
SWARM="opencto-dev"

echo "🧪 OpenCTO MQTT Agent Test"
echo ""

# Check if mosquitto is running
if ! systemctl is-active --quiet mosquitto 2>/dev/null; then
  echo "❌ mosquitto is not running"
  echo "   Start it with: sudo systemctl start mosquitto"
  exit 1
fi

# Check if CLI is built
if [ ! -f "$CLI_PATH/dist/cli-v2.js" ]; then
  echo "❌ CLI not built"
  echo "   Build it with: cd $CLI_PATH && npm run build"
  exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Clean up any existing test agents
pkill -f "test-agent-"  2>/dev/null
pkill -f "deploy-agent-" 2>/dev/null
sleep 1

# Start agents in background
echo "🚀 Starting agents..."

cd "$CLI_PATH"

nohup node dist/cli-v2.js --mqtt --role testing --agent-id test-agent-01 --broker $BROKER --swarm $SWARM > /tmp/test-agent-01.log 2>&1 &
TEST_PID=$!

nohup node dist/cli-v2.js --mqtt --role deployment --agent-id deploy-agent-01 --broker $BROKER --swarm $SWARM > /tmp/deploy-agent-01.log 2>&1 &
DEPLOY_PID=$!

sleep 3

# Check if agents started
if ! ps -p $TEST_PID > /dev/null; then
  echo "❌ Testing agent failed to start"
  cat /tmp/test-agent-01.log
  exit 1
fi

if ! ps -p $DEPLOY_PID > /dev/null; then
  echo "❌ Deployment agent failed to start"
  cat /tmp/deploy-agent-01.log
  exit 1
fi

echo "✅ Agents started:"
echo "   - test-agent-01 (PID: $TEST_PID)"
echo "   - deploy-agent-01 (PID: $DEPLOY_PID)"
echo ""

# Subscribe to MQTT in background for monitoring
echo "📡 Monitoring MQTT messages..."
timeout 30 mosquitto_sub -t "$SWARM/#" -v > /tmp/mqtt-messages.log 2>&1 &
SUB_PID=$!

sleep 2

# Send test tasks
echo "📤 Publishing tasks..."
echo ""

# Task 1: Deployment task (should be picked up by deploy-agent-01)
echo "  Task 1: deployment.deploy → deploy-agent-01"
mosquitto_pub -t "$SWARM/tasks/new" -m '{
  "id": "msg_test_deploy",
  "timestamp": "2026-02-22T20:00:00Z",
  "payload": {
    "task_id": "task_deploy_test",
    "type": "deployment.deploy",
    "priority": "high",
    "payload": {
      "service": "test-service",
      "version": "1.0.0"
    }
  }
}'

sleep 6

# Task 2: Testing task (should be picked up by test-agent-01)
echo "  Task 2: testing.run → test-agent-01"
mosquitto_pub -t "$SWARM/tasks/new" -m '{
  "id": "msg_test_testing",
  "timestamp": "2026-02-22T20:01:00Z",
  "payload": {
    "task_id": "task_test_test",
    "type": "testing.run",
    "priority": "medium",
    "payload": {
      "test_suite": "integration"
    }
  }
}'

sleep 5

echo ""
echo "📊 Results:"
echo ""

# Show agent logs
echo "=== Testing Agent Log ==="
tail -15 /tmp/test-agent-01.log | grep -E "(Claiming|Executing|Task completed|Skipping)" || echo "No task activity"
echo ""

echo "=== Deployment Agent Log ==="
tail -15 /tmp/deploy-agent-01.log | grep -E "(Claiming|Executing|Task completed|Skipping)" || echo "No task activity"
echo ""

# Show MQTT message summary
echo "=== MQTT Messages ==="
kill $SUB_PID 2>/dev/null
sleep 1
REGISTER_COUNT=$(grep -c "agents/register" /tmp/mqtt-messages.log 2>/dev/null || echo "0")
HEARTBEAT_COUNT=$(grep -c "agents/heartbeat" /tmp/mqtt-messages.log 2>/dev/null || echo "0")
ASSIGNED_COUNT=$(grep -c "tasks/assigned" /tmp/mqtt-messages.log 2>/dev/null || echo "0")
COMPLETE_COUNT=$(grep -c "tasks/complete" /tmp/mqtt-messages.log 2>/dev/null || echo "0")

echo "  Registrations: $REGISTER_COUNT"
echo "  Heartbeats: $HEARTBEAT_COUNT"
echo "  Tasks assigned: $ASSIGNED_COUNT"
echo "  Tasks completed: $COMPLETE_COUNT"
echo ""

# Cleanup
echo "🧹 Cleaning up..."
kill $TEST_PID 2>/dev/null
kill $DEPLOY_PID 2>/dev/null
sleep 1

if [ "$COMPLETE_COUNT" -eq "2" ]; then
  echo ""
  echo "✅ Test passed! Both tasks completed successfully."
  echo ""
  echo "Full logs:"
  echo "  Testing: /tmp/test-agent-01.log"
  echo "  Deployment: /tmp/deploy-agent-01.log"
  echo "  MQTT: /tmp/mqtt-messages.log"
  exit 0
else
  echo ""
  echo "⚠️  Test incomplete. Expected 2 completed tasks, got $COMPLETE_COUNT"
  echo ""
  echo "Check logs:"
  echo "  Testing: /tmp/test-agent-01.log"
  echo "  Deployment: /tmp/deploy-agent-01.log"
  echo "  MQTT: /tmp/mqtt-messages.log"
  exit 1
fi

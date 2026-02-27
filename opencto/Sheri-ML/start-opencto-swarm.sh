#!/bin/bash
# 🍓 OpenCTO Multi-Agent Orchestration Script
# Starts 9 Sheri-ML agents in a 3x3 tmux grid

BROKER="${MQTT_BROKER:-mqtt://localhost:1883}"
SWARM="${OPENCTO_SWARM:-opencto-dev}"
CLI_PATH="$(cd "$(dirname "$0")/sheri-ml-cli" && pwd)"

echo "🍓 OpenCTO Multi-Agent Swarm"
echo ""
echo "  Broker: $BROKER"
echo "  Swarm: $SWARM"
echo "  CLI: $CLI_PATH"
echo ""

# Check if CLI is built
if [ ! -f "$CLI_PATH/dist/cli-v2.js" ]; then
  echo "❌ CLI not built. Run: cd $CLI_PATH && npm run build"
  exit 1
fi

# Check if mosquitto is running
if ! systemctl is-active --quiet mosquitto 2>/dev/null; then
  echo "⚠️  Warning: mosquitto service is not running"
  echo "   Start it with: sudo systemctl start mosquitto"
fi

# Kill existing session if it exists
tmux kill-session -t opencto 2>/dev/null

echo "🚀 Starting 9 agents in tmux..."

# Create tmux session
tmux new-session -d -s opencto -x 250 -y 60

# Agent 1: Task Manager (pane 0)
tmux send-keys -t opencto:0.0 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role general --agent-id task-manager-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 2: Code Review (pane 1)
tmux split-window -h -t opencto:0.0
tmux send-keys -t opencto:0.1 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role review --agent-id code-review-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 3: Deployment (pane 2)
tmux split-window -h -t opencto:0.1
tmux send-keys -t opencto:0.2 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role deployment --agent-id deployment-01 --broker $BROKER --swarm $SWARM" C-m

# Balance panes horizontally
tmux select-layout -t opencto:0 even-horizontal

# Agent 4: Testing (new row, pane 3)
tmux select-pane -t opencto:0.0
tmux split-window -v
tmux send-keys -t opencto:0.3 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role testing --agent-id testing-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 5: Security (pane 4)
tmux select-pane -t opencto:0.1
tmux split-window -v
tmux send-keys -t opencto:0.4 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role security --agent-id security-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 6: Documentation (pane 5)
tmux select-pane -t opencto:0.2
tmux split-window -v
tmux send-keys -t opencto:0.5 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role documentation --agent-id docs-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 7: Monitoring (new row, pane 6)
tmux select-pane -t opencto:0.3
tmux split-window -v
tmux send-keys -t opencto:0.6 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role monitoring --agent-id monitoring-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 8: Database Ops (pane 7)
tmux select-pane -t opencto:0.4
tmux split-window -v
tmux send-keys -t opencto:0.7 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role database --agent-id database-01 --broker $BROKER --swarm $SWARM" C-m

# Agent 9: General Purpose (pane 8)
tmux select-pane -t opencto:0.5
tmux split-window -v
tmux send-keys -t opencto:0.8 "cd $CLI_PATH && node dist/cli-v2.js --mqtt --role general --agent-id general-01 --broker $BROKER --swarm $SWARM" C-m

# Balance all panes
tmux select-layout -t opencto:0 tiled

# Wait for agents to start
sleep 3

echo ""
echo "✅ OpenCTO swarm started!"
echo ""
echo "  Session: opencto"
echo "  Agents: 9"
echo "  Layout: 3x3 grid"
echo ""
echo "Commands:"
echo "  Attach: tmux attach -t opencto"
echo "  Monitor: mosquitto_sub -t 'opencto-dev/#' -v"
echo "  Stop: tmux kill-session -t opencto"
echo ""

# Attach to session
tmux attach-session -t opencto

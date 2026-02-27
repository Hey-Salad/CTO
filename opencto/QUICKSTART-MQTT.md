# 🚀 OpenCTO Multi-Agent System - Quick Start

**Get started with autonomous multi-agent collaboration in 2 minutes**

---

## ⚡ Quick Commands

### Start Single Agent
```bash
cd /home/peter/OpenCTO/Sheri-ML/sheri-ml-cli

# Deployment agent
sheri --mqtt --role deployment

# Testing agent
sheri --mqtt --role testing

# Code review agent
sheri --mqtt --role review
```

### Start 9-Agent Swarm
```bash
cd /home/peter/OpenCTO/Sheri-ML
./start-opencto-swarm.sh

# Attach to view all agents
tmux attach -t opencto

# Detach: Ctrl+B then D
# Kill: tmux kill-session -t opencto
```

### Send a Task
```bash
# Deployment task
mosquitto_pub -t "opencto-dev/tasks/new" -m '{
  "id": "msg_001",
  "timestamp": "2026-02-22T20:00:00Z",
  "payload": {
    "task_id": "deploy_auth",
    "type": "deployment.deploy",
    "payload": {
      "service": "heysalad-auth",
      "version": "1.0.0"
    }
  }
}'

# Testing task
mosquitto_pub -t "opencto-dev/tasks/new" -m '{
  "id": "msg_002",
  "timestamp": "2026-02-22T20:01:00Z",
  "payload": {
    "task_id": "test_auth",
    "type": "testing.run",
    "payload": {
      "test_suite": "integration"
    }
  }
}'
```

### Monitor System
```bash
# Watch all MQTT messages
mosquitto_sub -t "opencto-dev/#" -v

# Watch only task messages
mosquitto_sub -t "opencto-dev/tasks/#" -v

# Watch only agent heartbeats
mosquitto_sub -t "opencto-dev/agents/heartbeat" -v
```

### Run Automated Test
```bash
cd /home/peter/OpenCTO/Sheri-ML
./test-mqtt-agents.sh
```

---

## 🎯 Agent Roles

| Role | Tasks It Handles | Use Case |
|------|------------------|----------|
| `general` | code.review, code.generate, documentation.generate | General purpose work |
| `deployment` | deployment.deploy, deployment.rollback | Deploy to production |
| `testing` | testing.run, testing.coverage | Run test suites |
| `review` | code.review, security.scan | Code review and quality |
| `security` | security.scan, security.audit | Security analysis |
| `monitoring` | monitoring.health, monitoring.alerts | System monitoring |
| `documentation` | documentation.generate | Generate docs |
| `database` | database.migrate, database.backup | Database operations |

---

## 📝 Task Types

### Deployment
```json
{"type": "deployment.deploy", "payload": {"service": "name", "version": "1.0.0"}}
{"type": "deployment.rollback", "payload": {"service": "name", "previous_version": "0.9.0"}}
```

### Testing
```json
{"type": "testing.run", "payload": {"test_suite": "integration"}}
{"type": "testing.coverage", "payload": {"threshold": 80}}
```

### Code Review
```json
{"type": "code.review", "payload": {"repo": "name", "pr": 123}}
{"type": "code.generate", "payload": {"prompt": "Create REST API"}}
```

### Security
```json
{"type": "security.scan", "payload": {"repo": "name"}}
{"type": "security.audit", "payload": {"target": "production"}}
```

### Monitoring
```json
{"type": "monitoring.health", "payload": {"service": "api"}}
{"type": "monitoring.alerts", "payload": {"threshold": "critical"}}
```

### Documentation
```json
{"type": "documentation.generate", "payload": {"source": "src/", "output": "docs/"}}
```

### Database
```json
{"type": "database.migrate", "payload": {"version": "20260222_001"}}
{"type": "database.backup", "payload": {"target": "s3://backups/"}}
```

---

## 🔧 Configuration

### Environment Variables
```bash
# MQTT broker URL
export MQTT_BROKER=mqtt://localhost:1883

# Swarm name
export OPENCTO_SWARM=opencto-dev

# For production
export MQTT_BROKER=mqtts://broker.hivemq.com:8883
export MQTT_USERNAME=opencto
export MQTT_PASSWORD=secret
```

### CLI Options
```bash
--mqtt                  Enable MQTT mode
--broker <url>         MQTT broker URL (default: mqtt://localhost:1883)
--agent-id <id>        Agent ID (auto-generated if not provided)
--role <role>          Agent role (default: general)
--swarm <name>         Swarm identifier (default: opencto-dev)
```

---

## 🐛 Troubleshooting

### Mosquitto Not Running
```bash
# Check status
sudo systemctl status mosquitto

# Start
sudo systemctl start mosquitto

# Enable auto-start
sudo systemctl enable mosquitto
```

### Agent Won't Connect
```bash
# Check broker is accessible
mosquitto_sub -t "test" -v

# Test publish
mosquitto_pub -t "test" -m "hello"

# Check firewall (if remote)
sudo ufw allow 1883/tcp
```

### Agent Not Receiving Tasks
```bash
# Check agent is subscribed
mosquitto_sub -t "opencto-dev/tasks/new" -v

# Publish test task
mosquitto_pub -t "opencto-dev/tasks/new" -m '{"id":"test","payload":{"task_id":"t1","type":"testing.run","payload":{}}}'

# Check agent logs
tail -f /tmp/agent-*.log
```

### Task Not Being Claimed
- Check task type matches agent role
- Verify agent is not busy with another task
- Check task message format is correct
- View agent logs for "Skipping task" messages

---

## 📊 Monitoring

### Agent Status
```bash
# See all agent registrations
mosquitto_sub -t "opencto-dev/agents/register" -v

# See agent heartbeats
mosquitto_sub -t "opencto-dev/agents/heartbeat" -v

# See when agents shutdown
mosquitto_sub -t "opencto-dev/agents/shutdown" -v
```

### Task Status
```bash
# See new tasks
mosquitto_sub -t "opencto-dev/tasks/new" -v

# See task assignments
mosquitto_sub -t "opencto-dev/tasks/assigned" -v

# See completed tasks
mosquitto_sub -t "opencto-dev/tasks/complete" -v

# See failed tasks
mosquitto_sub -t "opencto-dev/tasks/failed" -v
```

### Full System Monitor
```bash
# Watch everything
mosquitto_sub -t "opencto-dev/#" -v | tee mqtt-monitor.log

# Filter for specific events
mosquitto_sub -t "opencto-dev/#" -v | grep "Claiming\|completed\|failed"
```

---

## 🎬 Example Workflows

### Deploy + Test Workflow
```bash
# 1. Start agents
sheri --mqtt --role deployment --agent-id deploy-01 &
sheri --mqtt --role testing --agent-id test-01 &

# 2. Deploy
mosquitto_pub -t "opencto-dev/tasks/new" -m '{
  "id": "msg_1",
  "payload": {
    "task_id": "deploy_1",
    "type": "deployment.deploy",
    "payload": {"service": "api", "version": "2.0.0"}
  }
}'

# 3. Wait for deployment (5s)
sleep 5

# 4. Run tests
mosquitto_pub -t "opencto-dev/tasks/new" -m '{
  "id": "msg_2",
  "payload": {
    "task_id": "test_1",
    "type": "testing.run",
    "payload": {"test_suite": "integration"}
  }
}'

# 5. Monitor results
mosquitto_sub -t "opencto-dev/tasks/complete" -v
```

### Full CI/CD Pipeline
```bash
# Start full swarm (review, test, security, deploy, monitoring)
./start-opencto-swarm.sh

# Trigger pipeline
for task in review test security deploy monitor; do
  mosquitto_pub -t "opencto-dev/tasks/new" -m "{
    \"id\": \"msg_$task\",
    \"payload\": {
      \"task_id\": \"$task\",
      \"type\": \"$task.run\",
      \"payload\": {}
    }
  }"
  sleep 2
done
```

---

## 📚 More Information

- **Implementation Details:** `/home/peter/OpenCTO/MQTT-IMPLEMENTATION-COMPLETE.md`
- **Architecture:** `/home/peter/OpenCTO/MQTT-ARCHITECTURE.md`
- **Vision:** `/home/peter/OpenCTO/VISION.md`
- **Session Summary:** `/home/peter/OpenCTO/SESSION-2026-02-22-MQTT-COMPLETE.md`

---

## 🎉 You're Ready!

Your autonomous multi-agent CTO system is ready to use. Start with the test script:

```bash
cd /home/peter/OpenCTO/Sheri-ML
./test-mqtt-agents.sh
```

Then try the 9-agent swarm:

```bash
./start-opencto-swarm.sh
```

**Welcome to the future of autonomous development! 🍓**

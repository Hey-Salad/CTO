# 🔌 MQTT Multi-Agent Architecture

**Purpose:** Enable multiple Sheri-ML instances to collaborate via message passing

**Date:** 2026-02-22
**Status:** Design Phase

---

## 🎯 Core Architecture

### MQTT Broker Options

**Option 1: mosquitto (Local Development)**
```bash
# Install
sudo apt-get install mosquitto mosquitto-clients

# Start
mosquitto -v

# Test
mosquitto_sub -t "opencto/#" -v
mosquitto_pub -t "opencto/test" -m "Hello from agent"
```

**Option 2: AWS IoT Core (Production)**
```bash
# Managed MQTT broker
# Scales to millions of agents
# Built-in authentication
# URL: wss://xxx.iot.us-east-1.amazonaws.com/mqtt
```

**Option 3: CloudMQTT (Quick Start)**
```bash
# Hosted MQTT service
# Free tier: 5 connections, 10K messages/month
# URL: mqtt://xxx.cloudmqtt.com:1883
```

---

## 📡 Sheri-ML MQTT Integration

### CLI Options

```bash
# Start agent with MQTT
sheri-ml --mqtt --agent-id deploy-01 --broker mqtt://localhost:1883

# Specify role
sheri-ml --mqtt --role deployment --broker mqtt://localhost:1883

# Join existing swarm
sheri-ml --mqtt --swarm opencto-prod --broker wss://...
```

### Configuration File

```yaml
# ~/.config/heysalad/mqtt.yml
broker:
  url: mqtt://localhost:1883
  username: sheri-ml
  password: ${MQTT_PASSWORD}

agent:
  id: auto # Generate UUID
  role: general # deployment, testing, review, etc.
  swarm: opencto-dev # Swarm identifier

topics:
  subscribe:
    - opencto/tasks/new
    - opencto/deployment/request
    - opencto/code/review
  publish:
    - opencto/agents/heartbeat
    - opencto/tasks/complete
```

---

## 🔧 Implementation

### 1. Add MQTT Client to CLI

```typescript
// src/mqtt/client.ts
import mqtt from 'mqtt';
import { EventEmitter } from 'events';

export class MQTTClient extends EventEmitter {
  private client: mqtt.MqttClient;
  private agentId: string;
  private swarm: string;

  constructor(brokerUrl: string, agentId: string, swarm: string) {
    super();
    this.agentId = agentId;
    this.swarm = swarm;

    this.client = mqtt.connect(brokerUrl, {
      clientId: agentId,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.client.on('connect', () => this.onConnect());
    this.client.on('message', (topic, payload) => this.onMessage(topic, payload));
    this.client.on('error', (err) => this.onError(err));
  }

  private onConnect() {
    console.log(`✅ MQTT connected: ${this.agentId}`);

    // Subscribe to relevant topics
    this.client.subscribe([
      `${this.swarm}/tasks/new`,
      `${this.swarm}/tasks/assigned`,
      `${this.swarm}/agents/+/status`,
    ]);

    // Announce presence
    this.publish('agents/register', {
      agent_id: this.agentId,
      status: 'online',
      capabilities: ['code-generation', 'deployment'],
    });

    // Start heartbeat
    setInterval(() => this.heartbeat(), 10000);
  }

  private onMessage(topic: string, payload: Buffer) {
    const message = JSON.parse(payload.toString());
    console.log(`📨 Received: ${topic}`, message);

    // Emit to handlers
    this.emit('message', { topic, message });
  }

  private onError(err: Error) {
    console.error('❌ MQTT error:', err);
  }

  publish(topic: string, payload: any) {
    const message = JSON.stringify({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent_id: this.agentId,
      payload,
    });

    this.client.publish(`${this.swarm}/${topic}`, message);
  }

  private heartbeat() {
    this.publish('agents/heartbeat', {
      status: 'alive',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  }

  disconnect() {
    this.publish('agents/shutdown', {
      reason: 'graceful',
    });
    this.client.end();
  }
}
```

### 2. Task Handler

```typescript
// src/mqtt/task-handler.ts
import { MQTTClient } from './client';

export class TaskHandler {
  private mqtt: MQTTClient;
  private agentId: string;
  private currentTask: string | null = null;

  constructor(mqtt: MQTTClient, agentId: string) {
    this.mqtt = mqtt;
    this.agentId = agentId;

    // Listen for tasks
    mqtt.on('message', ({ topic, message }) => {
      if (topic.endsWith('/tasks/new')) {
        this.handleNewTask(message);
      }
    });
  }

  private async handleNewTask(message: any) {
    // Check if we can handle this task
    if (this.currentTask) {
      console.log('⏳ Busy, skipping task');
      return;
    }

    const { task_id, type, payload } = message.payload;

    // Claim task
    this.currentTask = task_id;
    this.mqtt.publish('tasks/assigned', {
      task_id,
      agent_id: this.agentId,
      claimed_at: new Date().toISOString(),
    });

    // Execute task
    try {
      console.log(`🔨 Executing task: ${type}`);
      const result = await this.executeTask(type, payload);

      // Report completion
      this.mqtt.publish('tasks/complete', {
        task_id,
        agent_id: this.agentId,
        status: 'success',
        result,
      });
    } catch (error: any) {
      // Report failure
      this.mqtt.publish('tasks/failed', {
        task_id,
        agent_id: this.agentId,
        status: 'failed',
        error: error.message,
      });
    } finally {
      this.currentTask = null;
    }
  }

  private async executeTask(type: string, payload: any): Promise<any> {
    switch (type) {
      case 'code.review':
        return await this.reviewCode(payload);

      case 'deployment.deploy':
        return await this.deploy(payload);

      case 'testing.run':
        return await this.runTests(payload);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  private async reviewCode(payload: any) {
    // Call LLM to review code
    console.log('👀 Reviewing code...');
    return { approved: true, comments: [] };
  }

  private async deploy(payload: any) {
    // Deploy to Cloudflare
    console.log('🚀 Deploying...');
    return { url: 'https://...', status: 'deployed' };
  }

  private async runTests(payload: any) {
    // Run tests
    console.log('🧪 Running tests...');
    return { passed: 10, failed: 0, coverage: 85 };
  }
}
```

### 3. Main CLI Integration

```typescript
// src/cli-v2.ts (updated)
import { MQTTClient } from './mqtt/client';
import { TaskHandler } from './mqtt/task-handler';

program
  .option('--mqtt', 'Enable MQTT mode for multi-agent collaboration')
  .option('--broker <url>', 'MQTT broker URL', 'mqtt://localhost:1883')
  .option('--agent-id <id>', 'Agent ID (auto-generated if not provided)')
  .option('--role <role>', 'Agent role (deployment, testing, review, etc.)', 'general')
  .option('--swarm <name>', 'Swarm identifier', 'opencto-dev')
  .action(async (options) => {
    // Normal CLI mode
    if (!options.mqtt) {
      await chat(options.primary);
      return;
    }

    // MQTT mode
    console.log('🔌 Starting MQTT agent mode...');

    const agentId = options.agentId || `sheri-ml-${crypto.randomUUID().substring(0, 8)}`;
    const mqtt = new MQTTClient(options.broker, agentId, options.swarm);
    const taskHandler = new TaskHandler(mqtt, agentId);

    console.log(`✅ Agent started: ${agentId}`);
    console.log(`   Role: ${options.role}`);
    console.log(`   Swarm: ${options.swarm}`);
    console.log(`   Broker: ${options.broker}`);
    console.log('\n📡 Listening for tasks...\n');

    // Keep running
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down gracefully...');
      mqtt.disconnect();
      process.exit(0);
    });
  });
```

---

## 🚀 Usage Examples

### Start Multiple Agents Locally

**Terminal 1: Deployment Agent**
```bash
sheri-ml --mqtt --role deployment --agent-id deploy-01
```

**Terminal 2: Testing Agent**
```bash
sheri-ml --mqtt --role testing --agent-id test-01
```

**Terminal 3: Code Review Agent**
```bash
sheri-ml --mqtt --role review --agent-id review-01
```

**Terminal 4: Publish Task**
```bash
mosquitto_pub -t "opencto-dev/tasks/new" -m '{
  "id": "msg_abc123",
  "timestamp": "2026-02-22T19:00:00Z",
  "payload": {
    "task_id": "task_xyz789",
    "type": "deployment.deploy",
    "payload": {
      "service": "auth-service",
      "version": "0.4.0"
    }
  }
}'
```

**Result:**
```
📨 Deployment Agent received task
🚀 Deploying auth-service v0.4.0...
✅ Deployed to https://heysalad-sheri-auth.heysalad-o.workers.dev
📤 Published to: opencto-dev/tasks/complete
```

---

## 🎯 Advanced: tmux Orchestration

### Start 9 Agents in tmux

```bash
#!/bin/bash
# start-opencto-swarm.sh

BROKER="mqtt://localhost:1883"
SWARM="opencto-dev"

# Create tmux session
tmux new-session -d -s opencto

# Agent 1: Task Manager
tmux send-keys -t opencto:0.0 "sheri-ml --mqtt --role task-manager --broker $BROKER --swarm $SWARM" C-m

# Agent 2: Code Review
tmux split-window -h
tmux send-keys -t opencto:0.1 "sheri-ml --mqtt --role code-review --broker $BROKER --swarm $SWARM" C-m

# Agent 3: Deployment
tmux split-window -h
tmux send-keys -t opencto:0.2 "sheri-ml --mqtt --role deployment --broker $BROKER --swarm $SWARM" C-m

# Agent 4: Testing (new row)
tmux select-pane -t 0
tmux split-window -v
tmux send-keys -t opencto:0.3 "sheri-ml --mqtt --role testing --broker $BROKER --swarm $SWARM" C-m

# Agent 5: Security
tmux select-pane -t 1
tmux split-window -v
tmux send-keys -t opencto:0.4 "sheri-ml --mqtt --role security --broker $BROKER --swarm $SWARM" C-m

# Agent 6: Documentation
tmux select-pane -t 2
tmux split-window -v
tmux send-keys -t opencto:0.5 "sheri-ml --mqtt --role docs --broker $BROKER --swarm $SWARM" C-m

# Agent 7: Monitoring (new row)
tmux select-pane -t 3
tmux split-window -v
tmux send-keys -t opencto:0.6 "sheri-ml --mqtt --role monitoring --broker $BROKER --swarm $SWARM" C-m

# Agent 8: Database Ops
tmux select-pane -t 4
tmux split-window -v
tmux send-keys -t opencto:0.7 "sheri-ml --mqtt --role database --broker $BROKER --swarm $SWARM" C-m

# Agent 9: API Gateway
tmux select-pane -t 5
tmux split-window -v
tmux send-keys -t opencto:0.8 "sheri-ml --mqtt --role api-gateway --broker $BROKER --swarm $SWARM" C-m

# Attach to session
tmux attach-session -t opencto
```

---

## 📊 Monitoring

### Subscribe to All Messages

```bash
mosquitto_sub -t "opencto-dev/#" -v
```

**Output:**
```
opencto-dev/agents/register {"agent_id":"deploy-01","status":"online"}
opencto-dev/agents/register {"agent_id":"test-01","status":"online"}
opencto-dev/agents/heartbeat {"agent_id":"deploy-01","uptime":60}
opencto-dev/tasks/new {"task_id":"task_123","type":"deployment.deploy"}
opencto-dev/tasks/assigned {"task_id":"task_123","agent_id":"deploy-01"}
opencto-dev/deployment/status {"status":"building","progress":50}
opencto-dev/tasks/complete {"task_id":"task_123","status":"success"}
```

### Web Dashboard (Future: Beri-ML)

```typescript
// Real-time MQTT monitoring via WebSocket
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', (data) => {
  const { topic, message } = JSON.parse(data);

  // Update dashboard
  if (topic.includes('agents/heartbeat')) {
    updateAgentStatus(message);
  } else if (topic.includes('tasks/complete')) {
    showTaskComplete(message);
  }
});
```

---

## 🎯 Next Steps

### Phase 1: Basic MQTT
- [x] Design architecture
- [ ] Add mqtt package to CLI
- [ ] Implement MQTTClient class
- [ ] Implement TaskHandler class
- [ ] Test with mosquitto locally

### Phase 2: Multi-Agent
- [ ] Agent roles and specialization
- [ ] Task claiming and assignment
- [ ] Progress reporting
- [ ] Error handling and retries

### Phase 3: Orchestration
- [ ] tmux management scripts
- [ ] Agent health monitoring
- [ ] Load balancing across agents
- [ ] Auto-scaling based on queue depth

### Phase 4: Production
- [ ] AWS IoT Core integration
- [ ] Authentication and encryption
- [ ] Metrics and logging
- [ ] Web dashboard (Beri-ML)

---

*Architecture by: HeySalad*
*Date: 2026-02-22*
*Status: Ready to Implement 🍓*

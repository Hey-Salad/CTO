import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface MQTTClientOptions {
  brokerUrl: string;
  agentId: string;
  swarm: string;
  role?: string;
}

export class MQTTClient extends EventEmitter {
  private client: mqtt.MqttClient;
  private agentId: string;
  private swarm: string;
  private role: string;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(options: MQTTClientOptions) {
    super();
    this.agentId = options.agentId;
    this.swarm = options.swarm;
    this.role = options.role || 'general';

    console.log(`🔌 Connecting to MQTT broker: ${options.brokerUrl}`);

    this.client = mqtt.connect(options.brokerUrl, {
      clientId: this.agentId,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => this.onConnect());
    this.client.on('message', (topic, payload) => this.onMessage(topic, payload));
    this.client.on('error', (err) => this.onError(err));
    this.client.on('close', () => this.onClose());
    this.client.on('offline', () => this.onOffline());
    this.client.on('reconnect', () => this.onReconnect());
  }

  private onConnect() {
    console.log(`✅ MQTT connected: ${this.agentId}`);
    console.log(`   Role: ${this.role}`);
    console.log(`   Swarm: ${this.swarm}`);

    // Subscribe to relevant topics
    const topics = [
      `${this.swarm}/tasks/new`,
      `${this.swarm}/tasks/assigned`,
      `${this.swarm}/agents/+/status`,
      `${this.swarm}/broadcast`,
    ];

    this.client.subscribe(topics, (err) => {
      if (err) {
        console.error('❌ Failed to subscribe:', err);
      } else {
        console.log(`📡 Subscribed to topics: ${topics.join(', ')}`);
      }
    });

    // Announce presence
    this.publish('agents/register', {
      agent_id: this.agentId,
      role: this.role,
      status: 'online',
      capabilities: this.getCapabilities(),
      timestamp: new Date().toISOString(),
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 10000);

    this.emit('connected');
  }

  private onMessage(topic: string, payload: Buffer) {
    try {
      const message = JSON.parse(payload.toString());

      // Don't log our own messages
      if (message.agent_id === this.agentId) {
        return;
      }

      console.log(`📨 Received: ${topic}`);

      // Emit to handlers
      this.emit('message', { topic, message });
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  }

  private onError(err: Error) {
    console.error('❌ MQTT error:', err.message);
    this.emit('error', err);
  }

  private onClose() {
    console.log('🔌 MQTT connection closed');
    this.emit('close');
  }

  private onOffline() {
    console.log('📡 MQTT offline');
    this.emit('offline');
  }

  private onReconnect() {
    console.log('🔄 MQTT reconnecting...');
    this.emit('reconnect');
  }

  private getCapabilities(): string[] {
    // Return capabilities based on role
    const capabilities: Record<string, string[]> = {
      general: ['code-generation', 'chat'],
      deployment: ['deploy', 'cloudflare-workers', 'docker'],
      testing: ['test-runner', 'coverage', 'integration-tests'],
      review: ['code-review', 'linting', 'security-scan'],
      security: ['vulnerability-scan', 'dependency-check', 'compliance'],
      monitoring: ['health-check', 'metrics', 'alerts'],
      documentation: ['docs-generation', 'api-docs', 'readme'],
      database: ['migrations', 'backups', 'optimization'],
    };

    return capabilities[this.role] || capabilities.general;
  }

  publish(topic: string, payload: any) {
    const message = JSON.stringify({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      agent_id: this.agentId,
      role: this.role,
      payload,
    });

    const fullTopic = topic.startsWith(this.swarm) ? topic : `${this.swarm}/${topic}`;

    this.client.publish(fullTopic, message, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to publish to ${fullTopic}:`, err);
      }
    });
  }

  private heartbeat() {
    this.publish('agents/heartbeat', {
      status: 'alive',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      role: this.role,
    });
  }

  disconnect() {
    console.log('👋 Shutting down gracefully...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.publish('agents/shutdown', {
      reason: 'graceful',
      uptime: process.uptime(),
    });

    // Give time for shutdown message to be sent
    setTimeout(() => {
      this.client.end(true);
      this.emit('disconnected');
    }, 500);
  }

  isConnected(): boolean {
    return this.client.connected;
  }
}

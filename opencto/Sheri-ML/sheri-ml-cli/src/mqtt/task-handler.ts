import { MQTTClient } from './client';

export interface Task {
  task_id: string;
  type: string;
  payload: any;
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
}

export class TaskHandler {
  private mqtt: MQTTClient;
  private agentId: string;
  private role: string;
  private currentTask: string | null = null;
  private taskQueue: Task[] = [];

  constructor(mqtt: MQTTClient, agentId: string, role: string) {
    this.mqtt = mqtt;
    this.agentId = agentId;
    this.role = role;

    // Listen for tasks
    mqtt.on('message', ({ topic, message }) => {
      if (topic.endsWith('/tasks/new')) {
        this.handleNewTask(message);
      } else if (topic.endsWith('/tasks/assigned')) {
        this.handleTaskAssigned(message);
      }
    });

    console.log(`🎯 Task handler initialized for role: ${this.role}`);
  }

  private async handleNewTask(message: any) {
    const task: Task = message.payload;

    // Check if we can handle this task
    if (this.currentTask) {
      console.log(`⏳ Busy with task ${this.currentTask}, skipping new task ${task.task_id}`);
      return;
    }

    // Check if task is relevant to our role
    if (!this.canHandleTask(task.type)) {
      console.log(`⏭️  Skipping task ${task.task_id} (type: ${task.type}) - not our role`);
      return;
    }

    // Check if task is already assigned
    if (task.assigned_to && task.assigned_to !== this.agentId) {
      console.log(`⏭️  Task ${task.task_id} already assigned to ${task.assigned_to}`);
      return;
    }

    // Claim task
    await this.claimTask(task);
  }

  private async handleTaskAssigned(message: any) {
    const { task_id, agent_id } = message.payload;

    // If someone else claimed a task we were looking at, remove from queue
    if (agent_id !== this.agentId && this.taskQueue.some(t => t.task_id === task_id)) {
      this.taskQueue = this.taskQueue.filter(t => t.task_id !== task_id);
      console.log(`📋 Task ${task_id} claimed by ${agent_id}, removed from our queue`);
    }
  }

  private canHandleTask(taskType: string): boolean {
    // Map task types to roles
    const taskRoleMap: Record<string, string[]> = {
      'code.review': ['review', 'general'],
      'code.generate': ['general'],
      'deployment.deploy': ['deployment'],
      'deployment.rollback': ['deployment'],
      'testing.run': ['testing'],
      'testing.coverage': ['testing'],
      'security.scan': ['security', 'review'],
      'security.audit': ['security'],
      'monitoring.health': ['monitoring'],
      'monitoring.alerts': ['monitoring'],
      'documentation.generate': ['documentation', 'general'],
      'database.migrate': ['database'],
      'database.backup': ['database'],
    };

    const allowedRoles = taskRoleMap[taskType] || ['general'];
    return allowedRoles.includes(this.role);
  }

  private async claimTask(task: Task) {
    this.currentTask = task.task_id;

    console.log(`\n🔨 Claiming task: ${task.task_id}`);
    console.log(`   Type: ${task.type}`);
    console.log(`   Priority: ${task.priority || 'normal'}`);

    // Announce task claim
    this.mqtt.publish('tasks/assigned', {
      task_id: task.task_id,
      agent_id: this.agentId,
      role: this.role,
      claimed_at: new Date().toISOString(),
    });

    // Execute task
    try {
      console.log(`🔨 Executing task: ${task.type}`);

      const startTime = Date.now();
      const result = await this.executeTask(task.type, task.payload);
      const duration = Date.now() - startTime;

      console.log(`✅ Task completed in ${duration}ms`);

      // Report completion
      this.mqtt.publish('tasks/complete', {
        task_id: task.task_id,
        agent_id: this.agentId,
        role: this.role,
        status: 'success',
        result,
        duration,
        completed_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error(`❌ Task failed: ${error.message}`);

      // Report failure
      this.mqtt.publish('tasks/failed', {
        task_id: task.task_id,
        agent_id: this.agentId,
        role: this.role,
        status: 'failed',
        error: error.message,
        stack: error.stack,
        failed_at: new Date().toISOString(),
      });
    } finally {
      this.currentTask = null;

      // Process next task in queue if any
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        if (nextTask) {
          await this.claimTask(nextTask);
        }
      }
    }
  }

  private async executeTask(type: string, payload: any): Promise<any> {
    switch (type) {
      case 'code.review':
        return await this.reviewCode(payload);

      case 'code.generate':
        return await this.generateCode(payload);

      case 'deployment.deploy':
        return await this.deploy(payload);

      case 'deployment.rollback':
        return await this.rollback(payload);

      case 'testing.run':
        return await this.runTests(payload);

      case 'testing.coverage':
        return await this.checkCoverage(payload);

      case 'security.scan':
        return await this.securityScan(payload);

      case 'security.audit':
        return await this.securityAudit(payload);

      case 'monitoring.health':
        return await this.healthCheck(payload);

      case 'monitoring.alerts':
        return await this.checkAlerts(payload);

      case 'documentation.generate':
        return await this.generateDocs(payload);

      case 'database.migrate':
        return await this.runMigration(payload);

      case 'database.backup':
        return await this.backupDatabase(payload);

      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  // Task execution methods (placeholder implementations)

  private async reviewCode(payload: any) {
    console.log('👀 Reviewing code...');
    // TODO: Integrate with LLM for code review
    await this.delay(2000);
    return { approved: true, comments: ['Code looks good'], suggestions: [] };
  }

  private async generateCode(payload: any) {
    console.log('💻 Generating code...');
    // TODO: Integrate with existing chat() function
    await this.delay(3000);
    return { code: '// Generated code', language: 'typescript' };
  }

  private async deploy(payload: any) {
    console.log('🚀 Deploying...');
    // TODO: Integrate with Cloudflare Workers deployment
    await this.delay(5000);
    return { url: 'https://deployed.heysalad-o.workers.dev', status: 'deployed' };
  }

  private async rollback(payload: any) {
    console.log('⏪ Rolling back deployment...');
    await this.delay(3000);
    return { status: 'rolled_back', version: payload.previous_version };
  }

  private async runTests(payload: any) {
    console.log('🧪 Running tests...');
    await this.delay(4000);
    return { passed: 10, failed: 0, skipped: 1, duration: 4000 };
  }

  private async checkCoverage(payload: any) {
    console.log('📊 Checking test coverage...');
    await this.delay(2000);
    return { coverage: 85, lines: 850, uncovered: 150 };
  }

  private async securityScan(payload: any) {
    console.log('🔒 Scanning for security vulnerabilities...');
    await this.delay(3000);
    return { vulnerabilities: 0, warnings: 2, info: 5 };
  }

  private async securityAudit(payload: any) {
    console.log('🔍 Running security audit...');
    await this.delay(5000);
    return { status: 'passed', issues: [], recommendations: [] };
  }

  private async healthCheck(payload: any) {
    console.log('💚 Checking system health...');
    await this.delay(1000);
    return { status: 'healthy', uptime: 99.9, errors: 0 };
  }

  private async checkAlerts(payload: any) {
    console.log('🚨 Checking alerts...');
    await this.delay(1000);
    return { active_alerts: 0, resolved: 5 };
  }

  private async generateDocs(payload: any) {
    console.log('📝 Generating documentation...');
    await this.delay(3000);
    return { status: 'generated', pages: 10, format: 'markdown' };
  }

  private async runMigration(payload: any) {
    console.log('💾 Running database migration...');
    await this.delay(2000);
    return { status: 'migrated', version: payload.version };
  }

  private async backupDatabase(payload: any) {
    console.log('💾 Backing up database...');
    await this.delay(4000);
    return { status: 'backed_up', size: '125MB', location: 's3://backups/' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      current_task: this.currentTask,
      queued_tasks: this.taskQueue.length,
      role: this.role,
      agent_id: this.agentId,
    };
  }
}

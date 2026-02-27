# 🤖 CTO Agent Architecture

**Multi-Agent Autonomous Development System**

---

## 🎯 Agent Roles

### 1. Cheri-ML (Code Generation Agent)
**Type**: ML Inference  
**Model**: HeySalad/Cheri-ML-1.3B  
**Status**: ✅ Running on GPU

**Capabilities**:
- Code completion
- Function implementation
- Code explanation
- Refactoring suggestions

**API**:
- REST: http://localhost:8000
- MCP: http://localhost:5000/sse
- Public: https://cheri-ml.heysalad.app

**Use Cases**:
- Quick code snippets
- Python/TypeScript generation
- Inline completions

---

### 2. Sheri-ML (Advanced Coding Agent)
**Type**: CLI Assistant  
**Model**: Google Gemini 2.5 Pro  
**Status**: ✅ Built (Rust binary)

**Capabilities**:
- Complex code generation
- Architecture planning
- Code review
- Debugging assistance

**Binary**: `sheri-ml/codex-rs/target/release/codex`

**Use Cases**:
- Full application scaffolding
- Architectural decisions
- Complex refactoring

---

### 3. OpenCTO Agent Swarm
**Type**: Multi-Agent System  
**Communication**: MQTT pub/sub  
**Status**: ⚙️ Phase 1 Complete

#### Agent Types:

##### Deployment Agent
- Monitors deployments
- Handles rollbacks
- Manages environments
- Cloudflare Workers integration

##### Testing Agent
- Runs test suites
- Generates test cases
- Reports coverage
- CI/CD integration

##### Security Agent
- Scans for vulnerabilities
- Checks dependencies
- Audit logs
- Secret management

##### Code Review Agent
- Reviews pull requests
- Suggests improvements
- Enforces style guides
- Quality metrics

---

## 🔗 Agent Communication

### MQTT Topics
```
cto/agents/+/status          # Agent health
cto/tasks/pending             # Task queue
cto/tasks/+/assigned          # Task assignment
cto/tasks/+/completed         # Task completion
cto/logs/+                    # Agent logs
```

### Message Format
```json
{
  "agent_id": "deployment-01",
  "task_id": "deploy-prod-123",
  "status": "in_progress",
  "progress": 75,
  "logs": ["Building...", "Deploying..."]
}
```

---

## 📊 Agent Registry

**Location**: HeySalad MCP Gateway  
**Tool**: `people_tool(register_agent, {...})`

### Registered Agents
| Agent ID | Role | Model | Status |
|----------|------|-------|--------|
| cheri-ml-01 | Code Gen | Cheri-ML-1.3B | ✅ Active |
| sheri-ml-01 | Advanced Coding | Gemini 2.5 Pro | ✅ Ready |
| deploy-01 | Deployment | GPT-4o | ⚙️ Dev |
| test-01 | Testing | GPT-4o | ⚙️ Dev |
| security-01 | Security | GPT-4o | ⚙️ Dev |

---

## 🚀 Spawning Agents

### Via HeySalad MCP
```python
# Register new agent
people_tool(register_agent, {
    agent_id: custom-agent-01,
    role: Data

# 🍓 CTO - Autonomous Development System

**The Future of Software Development: AI-Powered CTOs**

> "In the future, every project will have its own AI CTO. Traditional companies have 1 CTO. With OpenCTO, you can have 100."

---

## 📊 Overview

This repository consolidates the complete **HeySalad CTO ecosystem** into one unified system:

### 🤖 Components

| Component | Purpose | Status | Location |
|-----------|---------|--------|----------|
| **Cheri-ML** | Production ML inference server (1.3B model) | ✅ Running | `cheri-ml/` |
| **Sheri-ML** | OpenAI Codex CLI (Rust, Gemini-powered) | ✅ Built | `sheri-ml/` |
| **OpenCTO** | Multi-agent autonomous CTO system | ⚙️ Development | `opencto/` |

---

## 🚀 Quick Start

### Cheri-ML (Inference Server)
```bash
cd cheri-ml
python serve_model.py
# API: http://localhost:8000
```

### Sheri-ML (Codex CLI)
```bash
cd sheri-ml/codex-rs
cargo build --release
./target/release/codex "Write a Rust web server"
```

### OpenCTO (Multi-Agent System)
```bash
cd opencto/Sheri-ML
./start-opencto-swarm.sh
```

---

## 📁 Repository Structure

```
CTO/
├── README.md                    # This file
├── CLAUDE.md                    # Claude Code integration
├── AGENTS.md                    # Agent documentation
├── VISION.md                    # System vision
│
├── cheri-ml/                    # ML Inference Server
│   ├── serve_model.py           # FastAPI + vLLM server
│   ├── api.py                   # API definitions
│   └── README.md
│
├── sheri-ml/                    # Codex CLI (Gemini-powered)
│   ├── codex-rs/                # Rust source
│   ├── README.md                # OpenAI Codex fork docs
│   └── docs/                    # Documentation
│
├── opencto/                     # Multi-Agent System
│   ├── Sheri-ML/                # Agent CLI
│   ├── opencto-dashboard/       # Dashboard UI
│   ├── VISION.md
│   ├── MQTT-ARCHITECTURE.md
│   └── README.md
│
└── docs/                        # Consolidated documentation
    ├── architecture/
    ├── guides/
    └── status/
```

---

## 🎯 Vision

**Autonomous CTOs managing every aspect of development:**

- 🤖 **Cheri-ML**: Generates code using custom 1.3B model
- 💻 **Sheri-ML**: CLI coding assistant (Gemini 2.5 Pro)
- 🌐 **OpenCTO**: Multi-agent swarms for deployment, testing, security

### Goal
Scale from **1 CTO** to **100 autonomous AI CTOs** working in parallel.

---

## 📚 Documentation

- **[CLAUDE.md](CLAUDE.md)** - Integration with Claude Code
- **[AGENTS.md](AGENTS.md)** - Agent roles and communication
- **[VISION.md](VISION.md)** - Long-term vision and architecture

---

## 🔧 Technology Stack

- **ML**: PyTorch, vLLM, CUDA, BitsAndBytes
- **Languages**: Python, Rust, TypeScript/Node.js
- **Communication**: MQTT, SSE, REST APIs
- **AI Providers**: Custom model (Cheri-ML), Google Gemini, OpenAI

---

## 🏢 HeySalad OÜ

**Private Repository**  
Cloudflare Account: `67a17ada4efeee4480283035cc0c5f90`  
GCP Project: `heysalad-finance`

---

**Last Updated**: February 27, 2026

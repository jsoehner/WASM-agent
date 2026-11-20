# WASM AI Agent

A high-performance, modular WebAssembly-based AI agent designed for seamless integration with Open WebUI and local LLM orchestration runtimes.

## Overview

**WASM AI Agent** executes agent workflows within the browser and local environments using low-level WebAssembly core modules combined with extensible TypeScript/JavaScript sub-agents and tool execution runtimes.

### Key Features

- ⚡ **WebAssembly Core**: Sandboxed execution and fast memory management via modular WASM modules (`agent_core.wat`, `communication.wat`, `sub_agents.wat`, `tools.wat`).
- 🤖 **Multi-Agent Architecture**: Dedicated sub-agents for specialized tasks:
  - **Code Agent**: Code analysis, syntax inspection, and refactoring assistance.
  - **Research Agent**: Multi-step query planning, summarization, and synthesis.
  - **Search Agent**: Targeted information discovery and query routing.
- 🛠️ **Extensible Tool Engine**: Built-in runtime tools including computation (`calculate-tool.js`), network fetching (`fetch-tool.js`), and web search (`search-tool.js`).
- 🔄 **Open WebUI & WebSocket Interop**: Connects directly to Open WebUI instances and real-time WebSocket communication channels.
- 🛡️ **Supply Chain & Cryptographic Governance**: Continuous dual-engine SBOM generation, Cryptographic Bill of Materials (CBOM) tracking, and Post-Quantum Cryptography (PQC) readiness auditing.

---

## Architecture

```
WASM-agent/
├── index.html                  # Interactive browser UI & agent orchestrator
├── package.json                # Project dependencies and lifecycle scripts
├── tsconfig.json               # TypeScript compiler configuration
├── src/
│   ├── config/
│   │   └── agent-config.json   # Agent initialization configuration
│   ├── js/
│   │   ├── main.js             # Agent runtime entry point
│   │   ├── wasm-loader.js      # WASM binary loader and memory boundary
│   │   ├── sub-agents/         # Autonomous task agents (code, research, search)
│   │   └── tools/              # Dynamic tool implementations (calc, fetch, search)
│   ├── types/
│   │   └── agent_types.ts      # TypeScript interfaces and agent type definitions
│   └── wasm/
│       ├── agent_core.wat      # Core state machine and execution loop
│       ├── communication.wat   # Inter-agent and WebSocket message transport
│       ├── sub_agents.wat      # Sub-agent lifecycle and registry
│       └── tools.wat           # Low-level tool invocation interface
├── .github/
│   └── workflows/
│       └── sbom-cbom.yml       # Automated dual-engine SBOM & CBOM CI pipeline
├── docs/
│   └── adr/
│       └── 0001-automated-sbom-cbom-supply-chain-governance.md
└── scripts/                    # DevSecOps & Supply Chain verification tooling
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ or v24 recommended)
- `npm` or `pnpm`
- [WABT (WebAssembly Binary Toolkit)](https://github.com/WebAssembly/wabt) for `wat2wasm` (optional, for compiling `.wat` files)

### Installation

```bash
# Clone the repository
git clone https://github.com/jsoehner/WASM-agent.git
cd WASM-agent

# Install dependencies
npm install
```

### Development & Build Commands

```bash
# Start local Vite development server
npm run dev

# Compile WebAssembly text format files
npm run compile-wasm

# Type-check TypeScript codebase
npm run typecheck

# Build bundle for production
npm run build
```

---

## 🔐 SBOM, CBOM & PQC Governance

This repository integrates the [`jsoehner/jsi-bom-actions`](https://github.com/jsoehner/jsi-bom-actions) GitHub Action ([`.github/workflows/sbom-cbom.yml`](.github/workflows/sbom-cbom.yml)) for automated Software Bill of Materials (SBOM), Cryptographic Bill of Materials (CBOM), and Post-Quantum Cryptography (PQC) readiness auditing.

- **Latest Audit Report:** [`docs/security/CRYPTOGRAPHIC_AUDIT.md`](docs/security/CRYPTOGRAPHIC_AUDIT.md)
- **Learn More:** [jsoehner/jsi-bom-actions](https://github.com/jsoehner/jsi-bom-actions)

---

## License

This project is licensed under the [MIT License](LICENSE).

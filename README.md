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

## Automated SBOM & CBOM Supply Chain Pipeline

This repository implements automated Software Bill of Materials (SBOM) and Cryptographic Bill of Materials (CBOM) supply chain governance in adherence to US Executive Order 14028, NIST SP 800-218 (SSDF), and NIST IR 8547. For architectural rationale, design trade-offs, and governance specifications, refer to [ADR-0001: Automated SBOM and CBOM Supply Chain Governance Pipeline](docs/adr/0001-automated-sbom-cbom-supply-chain-governance.md).

### Local Generation & Verification

A unified local tooling suite is provided in [`scripts/`](scripts/) to mirror the CI/CD pipeline locally:

```bash
# 1. Generate dual-engine SBOMs (SPDX / CycloneDX) and CBOM (CycloneDX 1.7)
bash scripts/generate_boms.sh -t dir .

# 2. Perform AST semantic analysis to discover cryptographic call sites & reconcile CBOM
python3 scripts/scan_crypto_ast.py . \
  --cbom oss/cbom.json \
  --output-json oss/crypto-callsites.json

# 3. Run automated verification test harness
bash scripts/test_boms.sh oss

# 4. Perform Post-Quantum Cryptography (PQC) readiness analysis & generate summary
python3 scripts/analyze_cbom.py oss/cbom.json \
  --sbom oss/sbom.spdx.json \
  --json oss/crypto-analysis.json \
  --markdown oss/crypto-summary.md
```

### Continuous Integration Pipeline (`.github/workflows/sbom-cbom.yml`)

The automated GitHub Actions workflow runs on every push to `main`/`master`, tagged releases (`v*`), and pull requests. It executes the following automated stages:

1. **Dual-Engine SBOM Generation**:
   - CycloneDX JSON (`oss/sbom.cyclonedx.json`) generated via Anchore / Syft.
   - SPDX 2.3 JSON (`oss/sbom.spdx.json`) generated via Anchore / Syft.
2. **Cryptographic Bill of Materials (CBOM)**:
   - Generated via `cbomkit/cbomkit-action` adhering to CycloneDX 1.6/1.7 crypto component specifications.
3. **AST Cryptographic Discovery & Reconciliation**:
   - `scripts/scan_crypto_ast.py` scans source code AST to detect cryptographic algorithms, TLS handshakes, PRNGs, and hashing routines, reconciling them with the generated CBOM.
4. **CI Verification Test Harness**:
   - `scripts/test_boms.sh` executes 4 strict quality gates verifying file presence, non-zero file sizes, valid CycloneDX schema structure, and non-empty component inventories.
5. **Post-Quantum Cryptography (PQC) Assessment**:
   - `scripts/analyze_cbom.py` assesses quantum-vulnerable algorithms versus quantum-resilient primitives (NIST FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA) and outputs GitHub Actions step summaries.
6. **Report Publishing & Artifact Retention**:
   - Automatically synchronizes updated cryptographic posture documentation to [`docs/security/CRYPTOGRAPHIC_AUDIT.md`](docs/security/CRYPTOGRAPHIC_AUDIT.md).
   - Archives all generated BOM assets as pipeline artifacts retained for 90 days.

---

## License

This project is licensed under the [MIT License](LICENSE).

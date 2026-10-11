# ADR-0001: Automated SBOM and CBOM Supply Chain Governance Pipeline

## Metadata

| Field | Value |
|---|---|
| ADR ID | ADR-0001 |
| Status | Accepted |
| Created Date | 2026-10-11 |
| Decision Date | 2026-10-11 |
| Effective Date | 2026-10-11 |
| Architecture Domain | Security / Supply Chain Governance / Cryptography / DevOps |
| Scope | Software & Cryptographic Supply Chain Security (Repository, WebAssembly, TypeScript/JS, & CI/CD) |
| Decision Owner | Lead DevSecOps Architect |
| Named Decision Maker | DevSecOps Engineering & Application Security Team |
| Approval Authority | Architecture Review Board (ARB) / Security Governance Committee |
| Approval Evidence ID | ARB-2026-10-SEC-009 |
| APM Code(s) | SEC-SUPPLYCHAIN-04 |
| NIRA Reference(s) | NIRA-SEC-2026-046 |
| Tags | sbom, cbom, cyclonedx, spdx, supply-chain, pqc, wasm, webassembly, typescript, open-webui, ai-agent, ast-analysis, devsecops |

---

## Business and Architecture Context

### Problem Statement

The `WASM-agent` repository delivers a WebAssembly-based AI agent engine designed to integrate with Open WebUI and local LLM orchestration runtimes. Key architectural components include:
1. **WebAssembly Core Modules (`src/wasm/*.wat`)**: Low-level WebAssembly text format modules (`agent_core.wat`, `communication.wat`, `sub_agents.wat`, `tools.wat`) compiled to binary `.wasm` for fast and sandboxed execution.
2. **TypeScript & JavaScript Sub-Agents (`src/js/sub-agents/`)**: Specialized autonomous sub-agents including `code-agent.js`, `research-agent.js`, and `search-agent.js`.
3. **Tool Execution Engine (`src/js/tools/`)**: Modular execution capabilities including `calculate-tool.js`, `fetch-tool.js`, and `search-tool.js` handling dynamic computation, external data fetching, and web searches.
4. **WebSocket & Network Communications**: High-concurrency client-server communications via `ws` and browser Fetch APIs interfacing with Open WebUI backends.
5. **Interactive Web Front-end (`index.html`)**: Client interface orchestrating the WASM runtime and sub-agent workflows.

Because this application operates as an autonomous agent executing external data fetches, WebSocket communication, and sandboxed WebAssembly execution, establishing verifiable supply chain provenance and continuous cryptographic visibility across all dependencies and runtime communication channels is critical.

Under modern cybersecurity directives—including US Executive Order 14028, NIST SP 800-218 (Secure Software Development Framework - SSDF), and NIST IR 8547 (Transition to Post-Quantum Cryptography Standards)—software systems must maintain verifiable Software Bills of Materials (SBOMs) and Cryptographic Bills of Materials (CBOMs).

Without an automated, continuous SBOM and CBOM governance framework:
1. **Supply Chain Vulnerability Blind Spots:** Third-party npm dependencies (`ws`, `typescript`, `vite`, `terser`, `wat`), transitive packages, and CI build environments lack automated, machine-readable tracking to trace known CVEs and software supply chain risks.
2. **Cryptographic Asset Opacity:** TLS/HTTPS connections, WebSocket handshakes, hashing algorithms, and PRNGs utilized during agent communication lack formal inventory and classification.
3. **Post-Quantum Cryptography (PQC) Readiness Gap:** As cryptography migrates to quantum-resistant standards (NIST FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA), distinguishing classical/quantum-vulnerable algorithms from quantum-safe implementations requires continuous tracking.
4. **Attestation & Compliance Deficit:** The absence of standardized CycloneDX (v1.5–1.7) and SPDX (v2.3) specifications prevents automated policy enforcement by enterprise DevSecOps pipelines.

### Current Situation

Prior to this decision:
1. `WASM-agent` lacked an automated CI/CD pipeline to generate, validate, and publish SBOMs or CBOMs upon code pushes and pull requests.
2. No automated Abstract Syntax Tree (AST) scanning was performed across JavaScript/TypeScript and WASM assets to detect cryptographic primitives and call sites.
3. No automated validation gates existed to verify schema validity or detect empty BOM inventories.
4. Cryptographic posture and PQC migration readiness were not documented or tracked in the repository.

### Decision Drivers

- **Full Supply Chain Visibility:** Continuous automated generation of CycloneDX and SPDX SBOM inventories for all package dependencies and runtime assets.
- **Cryptographic Discovery & PQC Readiness:** Continuous discovery and categorization of cryptographic algorithms, hashes, and TLS cipher suites into a standardized CycloneDX CBOM.
- **Automated CI Quality Gate:** Enforce automated validation ensuring that generated BOMs are syntactically valid, schema-compliant, and non-empty.
- **Developer-CI Parity:** Local CLI execution scripts that mirror the GitHub Actions pipeline for instant developer feedback.
- **Compliance Alignment:** Adherence to EO 14028, NTIA minimum SBOM elements, and NIST SSDF guidelines.

---

## Assumptions

- The project builds and executes WebAssembly modules and Node.js/browser TypeScript and JavaScript dependencies.
- CI workflows run in GitHub Actions standard Ubuntu runners equipped with Python 3.11+ and Node 24 compliant actions.
- Cryptographic standards will transition to quantum-resilient algorithms requiring continuous monitoring over multiple release cycles.

---

## Constraints

- CI execution overhead must remain low (< 2 minutes) without impacting development velocity.
- The pipeline must rely on portable open-source and local tooling without hard dependencies on proprietary SaaS platforms.
- GitHub Actions must use immutable SHA-pinned references and adhere to Node 24 runtime standards.

---

## Alternatives Considered

| Option | Advantages | Disadvantages / Risks | Disposition |
|---|---|---|---|
| **Option 1: Status Quo (Manual Inspection)** | Zero CI overhead; no maintenance required. | High security and compliance risk; zero automated visibility into transitive dependencies or cryptographic drift. | **Rejected** |
| **Option 2: Standalone SBOM Generation (Syft Only)** | Simple workflow; generates CycloneDX and SPDX files. | Lacks cryptographic asset identification; does not generate CBOMs or perform AST semantic analysis. | **Rejected** |
| **Option 3: CBOM-Only Scanner (`cbomkit`)** | Generates CycloneDX CBOM format for cryptographic discovery. | Misses SPDX format required by enterprise procurement standards; lacks custom AST call-site analysis. | **Rejected** |
| **Option 4: Dual-Engine SBOM/CBOM Pipeline + AST Analysis + CI Test Harness (Selected)** | Full coverage: dual-engine SBOMs (CycloneDX & SPDX via Anchore/Syft), CBOM (via cbomkit), semantic AST crypto discovery (`scan_crypto_ast.py`), automated CI verification harness (`test_boms.sh`), and PQC readiness reporting (`analyze_cbom.py`). Local script parity provided. | Minor CI duration addition (~60s); requires Python 3.11 runtime setup in CI runner; artifact retention management needed. | **Selected** |

---

## Decision

### Selected Option

Adopt **Option 4: Dual-Engine SBOM/CBOM Pipeline + AST Analysis + CI Test Harness** across the repository.

Specifically:
1. **GitHub Actions Workflow (`.github/workflows/sbom-cbom.yml`):**
   - Configured with Node 24 SHA-pinned actions (`actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`, `anchore/sbom-action@006b7ce8314066bdf1765b4500370d40fa6917a3`, `cbomkit/cbomkit-action@34a3d960625ae7f7f1b59455eff93a96df090eb7`, `actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065`, `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`).
   - Generates dual CycloneDX JSON (`oss/sbom.cyclonedx.json`) and SPDX JSON (`oss/sbom.spdx.json`) SBOMs via Anchore / Syft.
   - Generates CycloneDX CBOM (`oss/cbom.json`) via `cbomkit`.
   - Performs semantic AST cryptographic analysis via `scripts/scan_crypto_ast.py`.
   - Executes validation and test harness via `scripts/test_boms.sh`.
   - Assesses Post-Quantum Cryptography (PQC) readiness and outputs step summaries via `scripts/analyze_cbom.py`.
   - Automatically publishes updated cryptographic audit reports to `docs/security/CRYPTOGRAPHIC_AUDIT.md` and archives BOM artifacts.
2. **Local Tooling Suite (`scripts/`):**
   - `scripts/generate_boms.sh`: Portable CLI script for local generation across source directories or Docker containers.
   - `scripts/test_boms.sh`: Strict verification harness testing syntax, CycloneDX schema conformance, and non-empty component counts.
   - `scripts/scan_crypto_ast.py`: AST walker identifying cryptographic call-sites, key generation, and cipher instantiations.
   - `scripts/analyze_cbom.py`: PQC readiness analysis, algorithm categorization, and Markdown/JSON report generator.
   - `scripts/attach_oci_bom.sh` & `scripts/fetch_oci_cbom.py`: OCI artifact publishing and retrieval utilities.
   - `scripts/known_cbom_catalog.json`: Pre-audited cryptographic algorithm reference catalog.

### Rationale

This comprehensive approach guarantees end-to-end supply chain transparency for the WebAssembly and TypeScript AI agent runtime. Uniting dual-engine SBOM generation with cryptographic CBOM asset tracking and AST call-site discovery ensures all software packages and cryptographic primitives (e.g., TLS communications, hashing, PRNGs) are inventoried, audited, and protected against supply chain vulnerabilities and future quantum computing threats.

---

## Consequences

### Benefits

- **Continuous Compliance & Audit Readiness:** Full alignment with EO 14028, NIST SSDF, and CycloneDX/SPDX standards.
- **Cryptographic & PQC Visibility:** Continuous classification of cryptographic primitives and algorithms according to quantum vulnerability and post-quantum migration roadmaps.
- **Automated CI Verification Gate:** `test_boms.sh` enforces schema validity and inventory completeness on every pull request and push to `main`.
- **Developer Workflow Parity:** Developers can run identical scripts locally prior to committing changes.

### Trade-offs and Negative Consequences

- **CI Pipeline Latency:** Adds approximately 60–90 seconds to workflow execution time.
- **Maintenance Overhead:** Pinned action hashes and cryptographic reference catalogs (`known_cbom_catalog.json`) require periodic maintenance as standards evolve.
- **Artifact Storage:** Retention of BOM artifacts in GitHub Actions consumes artifact storage quota (mitigated by 90-day retention limit).

### New Constraints

- Repository CI runners require Python 3.11+ runtime for AST and analysis scripts.
- GitHub Actions token permissions require `contents: write` for automated cryptographic audit report synchronization on `main` branch pushes.

### Follow-on Decisions and Activities

- Configure pull request checks to fail if deprecated or insecure algorithms are newly detected.
- Periodic updates to `known_cbom_catalog.json` aligned with emerging NIST Post-Quantum Cryptography standards.
- Explore signing generated BOM artifacts using Sigstore/Cosign.

---

## Security, Privacy, and Risk Considerations

- **Integrity & Authenticity:** All workflow dependencies use immutable SHA commit pins to mitigate supply chain tampering.
- **Confidentiality:** Scans inspect dependencies and public cryptographic declarations; no credentials, secret keys, or API tokens are embedded into generated BOM artifacts.
- **Supply Chain Traceability:** BOMs link directly to commit SHAs and repository build metadata.

---

## Technical Debt Assessment

- **Catalog Maintenance:** The static cryptographic catalog in `scripts/known_cbom_catalog.json` must be reviewed periodically against NIST PQC standardization updates.

---

## Review and Lifecycle

- **Review Schedule:** Annual or upon major NIST PQC milestone release.
- **Supersedes:** None (Initial baseline governance record).
- **Superseded By:** None.

# AI Code Assistant Guidelines (AGENTS.md)

Universal development, architecture, and behavior instructions for AI Code Assistants (**Google Antigravity**, **OpenAI Codex**, and **Anthropic Claude**) working in `cloud-network-learning-materials`.

---

## 1. Codebase Overview & Domain Identity

This repository is a **Principal / SME Cloud Network Engineering Learning & Hands-On Platform** covering RFC protocol theory to massive-scale AWS Enterprise hybrid cloud architectures.

- **Stack**: VitePress 1.6+ (Vue 3, TypeScript, Mermaid.js, Tailwind-style CSS) + Terraform IaC (AWS Provider >= 5.0).
- **Core Modules**: 17 deep-dive modules (`docs/modules/`), 6 interactive simulators (`docs/interactive/`), 5 hands-on IaC labs (`docs/labs/` & `labs/`), and reference cheat sheets (`docs/reference/`).
- **Target Audience**: Senior/Staff Cloud Network Engineers, Cloud Architects, and Network SMEs.

---

## 2. Essential Commands & Verification

Always verify changes using the commands below before completing tasks:

```bash
# Documentation & Interactive Tools (VitePress)
npm run dev        # Launch local VitePress dev server (http://localhost:5173)
npm run build      # Static site build & Vue SSR verification (MANDATORY before task completion)
npm run preview    # Preview production static build locally

# Infrastructure as Code (Terraform Labs)
cd labs/<lab-directory>
terraform init -backend=false
terraform validate
```

> [!IMPORTANT]
> **Verification Gate**: Any edit to `docs/` or Vue components in `docs/.vitepress/theme/components/` MUST pass `npm run build` with exit code `0` to catch SSR hydration mismatches, broken Markdown syntax, or unresolved imports.

---

## 3. Platform-Specific Assistant Profiles

### A. Google Antigravity (AGY / Gemini CLI)
- **Tool Discipline**: Use `view_file` before editing, `replace_file_content` for surgical modifications, and `write_to_file` only for new files.
- **Skills & Subagents**: Leverage skills located in `.agents/skills/` and invoke specialized subagents (`invoke_subagent`) when handling independent parallel tasks.
- **Artifacts**: Store persistent architectural reports, diff summaries, or design plans in the session artifact directory (`<appDataDir>/brain/<conversation-id>`).

### B. OpenAI Codex / OpenCode / Universal Agent Harnesses
- **Environment Lookups**: Inspect configuration (`package.json`, `docs/.vitepress/config.mts`) directly rather than guessing paths or dependencies.
- **Tool Mapping**: Rely on standard diff / patch / execute tools; ensure exit codes are checked after every shell command.
- **Skill Manifests**: Skills and subagent definitions adhere to `.agents/skills/*/agents/openai.yaml`.

### C. Anthropic Claude (Claude Code)
- **Git Safety & Guardrails**: Strictly adhere to `.claude/skills/git-guardrails-claude-code`. Never run destructive commands (`git push --force`, `git reset --hard`, `git clean -fd`, `git branch -D`) without explicit user permission.
- **Slash Commands & Skills**: Recommend appropriate slash commands (`/plan`, `/grill-me`, `/goal`, `/learn`) when orchestrating complex design reviews or long-running tasks.
- **Context Efficiency**: Keep explanations concise, focused on diffs and architectural impact.

---

## 4. Content & Language Standards

### Bilingual Writing Rule
- **Narrative & Explanation**: Professional **Bahasa Indonesia** (clear, technical, grammatically standard).
- **Networking & Cloud Terminology**: 100% **English** technical terms. **Never translate standard industry terms** (e.g., keep *Subnet*, *Route Table*, *Transit Gateway*, *Cloud WAN*, *Payload*, *Handshake*, *Encapsulation*, *Peering*, *Advertisement*, *Prefix List*, *Appliance Mode*, *Underlay*, *Overlay*, *Flow Logs*).

### Technical Rigor & Depth
- Avoid generic overview explanations. Anchor discussions in **RFC standards** (e.g., RFC 1918, RFC 6598, RFC 793, RFC 4271, RFC 7348), **packet headers/flow mechanics**, and **AWS underlay internals** (Nitro cards, ENA, Hyperplane flow engine).
- Include edge cases, failure modes, asymmetric routing traps, and real-world SEV-1 troubleshooting methodologies.

---

## 5. Code & File Conventions

### VitePress Markdown (`docs/`)
- **Frontmatter**: Every markdown page must include YAML frontmatter (`title`, `description`).
- **Mermaid Diagrams**: Use standard ` ```mermaid ` fences. They are parsed and rendered via `<MermaidRenderer>` client component.
- **Callout Containers**: Use VitePress containers for callouts:
  ```markdown
  ::: tip CATATAN ARSITEKTUR
  Penjelasan teknis best-practice.
  :::
  
  ::: warning RISIKO ASYMMETRIC ROUTING
  Penjelasan risiko kegagalan traffic flow.
  :::
  ```
- **LaTeX Math**: Use `$...$` for inline math and `$$...$$` for display equations (e.g., subnet formulas, bitwise operations).

### Vue 3 Interactive Components (`docs/.vitepress/theme/components/`)
- Single File Components (SFC) with `<script setup lang="ts">` or `<script setup>`.
- Keep components responsive with pure SVG or Tailwind/VitePress CSS variables.
- Register new components globally in `docs/.vitepress/theme/index.ts`.
- Ensure client-only execution for window/browser APIs by wrapping with `<ClientOnly>` if embedded inside markdown.

### Terraform Labs (`labs/`)
- **Directory Structure**: Each lab under `labs/<id>-<name>/` must contain:
  - `main.tf`: Provider setup and resource definitions.
  - `variables.tf`: Input variables with explicit types and descriptions.
  - `outputs.tf`: Meaningful exported attributes (e.g. VPC IDs, TGW Route Table IDs, ENI IPs).
  - `README.md`: Architecture topology, deployment steps, and verification commands.
- **Provider Requirements**: AWS Provider pinned to `~> 5.0`.
- **Clean Tagging**: Include consistent tags (`Project`, `Environment`, `ManagedBy = "Terraform"`).

---

## 6. Directory Structure Quick Reference

```
cloud-network-learning-materials/
├── AGENTS.md                          # Master AI assistant guidance (this file)
├── CLAUDE.md                          # Pointer & rules for Claude Code
├── GEMINI.md                          # Pointer & rules for Google Antigravity / Gemini CLI
├── package.json                       # VitePress scripts & frontend dependencies
├── skills-lock.json                   # Installed skills metadata & lock
├── .agents/skills/                    # Local skills repository & agent prompts
├── .claude/skills/                    # Claude Code skills & safety guardrails
├── docs/
│   ├── index.md                       # Landing page & curriculum roadmap
│   ├── .vitepress/
│   │   ├── config.mts                 # VitePress navigation, sidebar & markdown config
│   │   └── theme/
│   │       ├── index.ts               # Theme entry point & global component registration
│   │       ├── style.css              # Custom styling & dark mode tokens
│   │       └── components/            # Interactive Vue 3 visualizers & tools
│   ├── modules/                       # 17 Advanced Curriculum Modules (01 to 17)
│   ├── interactive/                   # 6 Interactive Simulator & Drill Pages
│   ├── labs/                          # 5 Hands-on Lab Guides & Walkthroughs
│   └── reference/                     # SME Cheat Sheets & RFC summaries
└── labs/                              # Production Terraform IaC Blueprints (01 to 05)
```

---

## 7. Definition of Done for AI Assistants

Before confirming any task complete:
1. **Self-Review**: Verify all modified files match repository language standards and technical rigor.
2. **Build Test**: Run `npm run build` to confirm zero SSR/Markdown rendering errors.
3. **IaC Validation**: If Terraform files were touched, run `terraform validate`.
4. **Summary**: Provide concise, structured output referencing modified files with markdown links.

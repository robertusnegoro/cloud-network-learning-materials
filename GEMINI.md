# Google Antigravity & Gemini CLI Instructions

> [!NOTE]
> This repository uses **[`AGENTS.md`](./AGENTS.md)** as the unified master specification for all AI assistants. Consult [`AGENTS.md`](./AGENTS.md) for complete architecture, domain standards, and component guidelines.

---

## Fast Reference for Antigravity & Gemini CLI

### Primary Commands
```bash
npm run dev        # VitePress local dev server (http://localhost:5173)
npm run build      # Build static site & verify Vue SSR hydration (Mandatory gate)
npm run preview    # Preview built documentation site
```

### Tool & Workflow Guidelines
- **Precision Edits**: Use `view_file` to inspect lines and `replace_file_content` for atomic changes.
- **Verification Gate**: Execute `npm run build` using `run_command` before concluding any documentation or frontend change. Verify dual-theme visual contrast (Light/Dark mode) and ensure inline `<svg>` elements have explicit `width`/`height` attributes.
- **Skills & Subagents**: Skill definitions live in `.agents/skills/`. Dispatch subagents via `invoke_subagent` for parallel exploration.
- **Public Repo Security**: Zero secret policy. Never commit credentials, private keys, or actual AWS account/secret data.
- **Commit Flag**: Always append `--no-gpg-sign` to avoid passphrase prompts during agent commits.
- **Branch Ownership**: Push only to `main` as repo owner (`robertusnegoro`). No force-pushing.

### Core Language & Terminology Rule
- **Prose & Explanations**: Professional Bahasa Indonesia.
- **Networking & Cloud Terms**: 100% English (*VPC, Subnet, Route Table, Transit Gateway, Cloud WAN, GWLB, BGP, MTU/MSS, PMTUD, PrivateLink, Direct Connect*).

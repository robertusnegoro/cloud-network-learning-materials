# Claude Code Instructions

> [!NOTE]
> This repository uses **[`AGENTS.md`](./AGENTS.md)** as the unified master specification for all AI assistants. Consult [`AGENTS.md`](./AGENTS.md) for complete architecture, domain standards, and component guidelines.

---

## Fast Reference for Claude Code

### Primary Commands
```bash
npm run dev        # VitePress local dev server (http://localhost:5173)
npm run build      # Build static site & verify Vue SSR hydration (Mandatory gate)
npm run preview    # Preview built documentation site
```

### Git Guardrails & Safety
Strictly follow the safety guardrails in `.claude/skills/git-guardrails-claude-code`:
- **Prohibited without explicit confirmation**: `git push --force`, `git reset --hard`, `git clean -fd`, `git branch -D`.
- **Public Repo Secret Guardrail**: Never commit credentials, private keys, real AWS secrets, or internal proprietary tokens.
- **Commit Flag**: Always use `--no-gpg-sign` for automated CLI commits to avoid passphrase hang.
- **Main Branch Access**: Only the repository owner (`robertusnegoro`) can push to `main`.
- Always inspect `git status` and `git diff` before committing.

### Core Language & Terminology Rule
- **Prose & Explanations**: Professional Bahasa Indonesia.
- **Networking & Cloud Terms**: 100% English (*VPC, Subnet, Route Table, Transit Gateway, Cloud WAN, GWLB, BGP, MTU/MSS, PMTUD, PrivateLink, Direct Connect*).

### Definition of Done
Before completing any task:
1. Run `npm run build` to ensure no VitePress / Vue compilation or markdown errors.
2. If Terraform was changed, run `terraform validate` inside the respective `labs/<lab>/` folder.

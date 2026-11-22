# pagespeed-optimizer-skills

An [Agent Skill](https://agentskills.io) that measures a URL with PageSpeed Insights / Lighthouse and fixes the code until Performance, Accessibility, Best Practices and SEO all score >= 90. It tracks FCP, LCP, TBT, CLS and Speed Index, and works with any web stack.

Works with Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, Kiro and other clients that support `SKILL.md`.

## Install

With the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add tuthuongvo/pagespeed-optimizer-skills
```

Or manually: clone this repo and copy (or symlink) `skills/pagespeed-optimizer` into your agent's skills folder.

| Agent | User-level folder | Project-level folder |
|---|---|---|
| Codex, Gemini CLI, Cursor, Copilot | `~/.agents/skills/` | `.agents/skills/` |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Kiro | `~/.kiro/skills/` | `.kiro/skills/` |

Restart the agent or start a new session after installing.

## Use

Ask the agent to optimize PageSpeed for a URL, or invoke the skill directly (for example `/pagespeed-optimizer https://example.com`). The agent measures, fixes, re-measures, and reports a before/after table.

The bundled script can also run on its own (requires Node 18+):

```bash
node skills/pagespeed-optimizer/scripts/psi.mjs https://example.com --strategy=both
node skills/pagespeed-optimizer/scripts/psi.mjs http://localhost:3000 --local   # Lighthouse via local Chrome
```

Set `PSI_API_KEY` ([get one](https://developers.google.com/speed/docs/insights/v5/get-started)) to avoid PageSpeed Insights API rate limits (HTTP 429). `localhost` URLs need `--local`.

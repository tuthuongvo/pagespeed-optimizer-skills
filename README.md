# pagespeed-optimizer-skills

An [Agent Skill](https://agentskills.io) that measures a URL with PageSpeed Insights / Lighthouse and fixes the code until Performance, Accessibility, Best Practices and SEO all score >= 90. It tracks FCP, LCP, TBT, CLS and Speed Index, and works with any web stack.

Works with Claude Code, Codex, Gemini CLI, Cursor, GitHub Copilot, Kiro and other clients that support `SKILL.md`.

## Install

With the [skills CLI](https://github.com/vercel-labs/skills) (Node.js 22.20+), run from your project:

```bash
npx skills add tuthuongvo/pagespeed-optimizer-skills                  # current project
npx skills add tuthuongvo/pagespeed-optimizer-skills -g               # all projects
npx skills add tuthuongvo/pagespeed-optimizer-skills -a claude-code   # one specific agent
```

Or manually: clone this repo and copy (or symlink) `skills/pagespeed-optimizer` into your agent's skills folder.

| Agent | User-level folder | Project-level folder |
|---|---|---|
| Codex, Gemini CLI, Cursor, Copilot | `~/.agents/skills/` | `.agents/skills/` |
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Kiro | `~/.kiro/skills/` | `.kiro/skills/` |

Restart the agent or start a new session after installing.

## Requirements

- Node.js 18+ for the measurement script.
- Google Chrome for `--local` mode. Lighthouse is fetched with `npx`, so there's nothing else to install.
- Optional: a PageSpeed Insights API key in `PSI_API_KEY` ([get one](https://developers.google.com/speed/docs/insights/v5/get-started)). Without a key, the public API often returns HTTP 429 (quota exceeded). Export it before starting the agent:

  ```bash
  export PSI_API_KEY=your-key
  ```

## Use

### Invoke the skill

The agent activates the skill automatically when you mention PageSpeed, Lighthouse, Core Web Vitals or site speed. You can also call it explicitly:

| Agent | Explicit invocation |
|---|---|
| Claude Code | `/pagespeed-optimizer <url>` |
| Codex | `$pagespeed-optimizer <url>`, or pick it from `/skills` |
| Gemini CLI | Check with `/skills list`; run `/skills reload` after installing |
| Cursor | Type `/` in Agent chat and pick `pagespeed-optimizer` |
| GitHub Copilot | `/pagespeed-optimizer <url>` |
| Kiro | `/pagespeed-optimizer <url>` |

Example prompts:

```text
/pagespeed-optimizer https://example.com
Optimize PageSpeed for https://example.com, mobile first, get all scores above 90
Run Lighthouse on http://localhost:3000 and fix the CLS and LCP issues
Audit https://example.com/pricing for accessibility and SEO only, don't change code yet
```

### What the agent does

1. Detects the stack. For local sites, it builds and runs the production version, because dev servers give misleading scores.
2. Measures mobile and desktop, and maps each failing audit to the files that cause it.
3. Fixes issues in order of impact (TBT and LCP first), one group of related changes at a time.
4. Re-measures, runs the project's tests, lint and typecheck, and repeats until all scores are >= 90 or the remaining issues can't be fixed in code.
5. Reports a before/after table, the changes by file, and remaining issues with recommendations (for example CDN or server headers).

The agent won't remove features such as analytics or chat without asking, and it won't game the score (for example by serving Lighthouse a different page).

### Targets

| Metric | Good |
|---|---|
| Performance, Accessibility, Best Practices, SEO | >= 90 |
| First Contentful Paint (FCP) | <= 1.8 s |
| Largest Contentful Paint (LCP) | <= 2.5 s |
| Total Blocking Time (TBT) | <= 200 ms |
| Cumulative Layout Shift (CLS) | <= 0.1 |
| Speed Index (SI) | <= 3.4 s |

### Run the script directly

```bash
node skills/pagespeed-optimizer/scripts/psi.mjs <url> [--strategy=mobile|desktop|both] [--local] [--out=dir]
```

| Option | Default | Description |
|---|---|---|
| `--strategy` | `mobile` | `mobile`, `desktop` or `both` |
| `--local` | off | Run Lighthouse with local Chrome instead of the PSI API. Required for `localhost` and private URLs |
| `--out` | `.pagespeed` | Folder for the full Lighthouse JSON (`lh-<strategy>.json`) |

Examples:

```bash
node skills/pagespeed-optimizer/scripts/psi.mjs https://example.com --strategy=both
node skills/pagespeed-optimizer/scripts/psi.mjs http://localhost:3000 --local
```

The output shows:
- The 4 category scores.
- The 5 metrics: 🟢 good, 🟠 needs improvement, 🔴 poor.
- Failing audits sorted by estimated savings, with the resources that cause them.
- The LCP element and the elements that shift layout.

Add `.pagespeed/` to your project's `.gitignore`.

Scores vary by about ±5 points between runs, so compare 2-3 runs before and after a change. Local runs also differ from real PSI results, so confirm the final numbers with PSI against the production URL.

# Project Conventions

- Never use emdashes (—) or emojis anywhere — not in UI copy, code, comments, or generated strings.
- Never run `git commit` in a shell command. Draft the commit message as text for the user to run manually (GPG signing required).
- Import lucide icons from `"lucide-react"`, never from `"lucide-react/icons"`.
- Use `bun --bun` for all script execution (`bun --bun dev`, `bun --bun build`, `bun --bun test`). Use `bun add`/`bun remove` for package management. Never use Node, npm, or bare `bun run`.
- Use `bunx --bun` instead of `npx` for any package runner invocation (e.g. `bunx --bun @shadscan/cli`, `bunx --bun shadcn@latest`).
- Do not add `(horizontal-viewport-segments: N)` or `(vertical-viewport-segments: N)` media queries to CSS or JS. Foldable detection uses `device-posture: folded` with orientation conditions only (Galaxy Z Fold 5 target).
- When the device is folded with no data loaded, use `layout-split split-no-data` (not `layout-stack`). In tent mode, add `grid-row: 2` on `.panel-form` inside the tent-mode `@media` block so the form stays below the fold.

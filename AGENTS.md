# Project Conventions

Rules for anyone who changes this repo, people and coding agents alike. `CLAUDE.md` imports this file.

## Writing

- Never use emdashes (—) or emojis anywhere: not in UI copy, code, comments, or generated strings.
- New functions and components get a short TSDoc comment. A function with several steps lists them in its TSDoc as `Step 1`, `Step 2`, and nested steps as `Step 2.1`, `Step 2.2`; the code marks each with a matching `// Step N` comment. Non-obvious constants get a one-line doc comment. Keep comments short; say why, not what.

## Git

- Commits are signed via SSH (`gpg.format=ssh`), not GPG - running `git commit` in a shell command is fine.
- Never add `Co-Authored-By` or `Claude-Session` footers to commit messages.
- Large changes land as multiple small, logically grouped Conventional Commits, not one big commit.

## Toolchain

- Use `bun --bun` for all script execution (`bun --bun dev`, `bun --bun test`). Use `bun add`/`bun remove` for package management. Never use Node, npm or Vite. Exception: `build` collides with Bun's own bundler subcommand, so `bun --bun build` runs _that_ and fails with "Missing entrypoints" - use `bun --bun run build` to run `scripts/build.ts`.
- Use `bunx --bun` instead of `npx` for any package runner invocation (e.g. `bunx --bun shadcn@latest`).
- Checks, all run in CI (`.github/workflows/check.yml`): `bun --bun test`, `bun run lint` (oxlint), `bun check` (types, replaces `tsc`), `bun fmt --check` (formatter, replaces Prettier), `bun audit --prod`. `bun lint` is not in a stable Bun release yet (oven-sh/bun#46439 is after 1.4.4); when it ships, delete the `lint` script and the `oxlint` package, because `bun lint` reads `.oxlintrc.json` and a `lint` script would shadow it.
- React, React DOM and their types stay on `~19.2` (patches only). React 19.3 adds 8.7 kB gzip for `<ViewTransition />` and server APIs that this app does not use. The React advisories since 19.2 are in the `react-server-dom-*` packages (Server Components), which this app does not install; `react` and `react-dom` 19.2.9 have none. Move to 19.3 only for a fix or a feature the app needs, and check `bun audit` and the GitHub advisories for `react` and `react-dom` first.
- Dev-only pages (e.g. `dev/test.html`, the synthetic test-data generator) are routes in `scripts/dev.ts` only, never files in `public/`: `scripts/build.ts` copies `public/` into `dist/` as-is. Dev-only app code (`app/dev-data.ts`) returns early when `process.env.NODE_ENV === "production"`, which the build defines, so the bundler drops it; check with `grep` on `dist/`.
- Files that the app imports or that `index.html` links (`app/assets/`) are bundled and hashed. `public/` holds only files that must keep a fixed URL (the font, `llms.txt`).

## Code map

- `lib/stream.ts`: reads a JSON array from a byte stream one element at a time (a small depth and string scanner, then `JSON.parse` per element). Web APIs only, so the browser and `bun test` run the same code.
- `lib/upload.ts`: `loadExports` streams all picked files in parallel, keeps only `{ title, times }` per chat, yields to the browser about every 12 ms, and reports a partial result every 200 ms. A newer upload or a failed file cancels the rest.
- `lib/parse.ts`: export detection, per-chat summaries, and `dayFormatter`, which caches the local day of each 15-minute UTC block (exact for every UTC offset in use).
- `lib/aggregate.ts`: counts prompts per local day and per chat. A time zone change only re-buckets the stored times; it never parses the export again.
- `lib/calendar-geometry.ts`: `layoutCalendar` places every cell and label (pure, tested); `shade` picks a cell color.
- `lib/providers.ts`: ChatGPT and Claude labels, export steps, Tailwind classes and heatmap shades. Use it; do not repeat provider colors in components.
- `lib/layout.ts`: responsive layout decisions (heatmap orientation, root layout class) as pure, tested functions - extend those rather than re-deriving the logic inline in `app/page.tsx`.
- `hooks/use-upload.ts`: upload state for the form. `components/` holds the parts: `drop-zone`, `loaded-files`, `export-steps`, `time-zone-picker`, `calendar-heatmap`, `day-tooltip`.

## Data and tests

- A heatmap cell counts visible user prompts per local day (see "What a cell counts" in the README). `test/oracle.test.ts` runs the real upload path and checks it against `jq` in 3 time zones; it is the judge of every count. Keep both in step when the rule changes. Add a fixture case to `test/fixtures/` rather than a hand-made parse test; each rule needs a fixture node that only that rule excludes (the hidden text prompt and the shown `user_editable_context` node are there for that).
- `bun test` runs in UTC unless `TZ` is set, so a time zone bug passes locally. Run `TZ=America/New_York bun --bun test` and `TZ=Asia/Kolkata bun --bun test` for date code; CI runs all three. A test that needs a zone with daylight saving time sets `process.env.TZ` in `beforeAll` and restores it in `afterAll`.
- Stream code is tested with a chunk boundary at every byte of each fixture. Keep that when you change `lib/stream.ts`.
- To prove a test can fail, break the code on purpose, run the test, and restore the code.

## UI

- Import lucide icons from `"lucide-react"`, never from `"lucide-react/icons"`.
- Tailwind v4 scans only the `@source` paths in `app/globals.css`: `app/`, `components/`, `src/` and `lib/providers.ts`. A new file with class names outside those paths needs its own `@source` line, or its classes are silently missing.
- shadcn's semantic color tokens (`text-muted-foreground`, `border-border`, `bg-primary`, `text-foreground`, `bg-accent`/`text-accent-foreground`, `text-destructive`, etc.) are **not wired up** - `app/globals.css` only defines `--panel-border` and `--accent`, so these classes are silently inert. Use explicit Tailwind colors instead (`zinc-*` for neutral/muted text, `red-*` for errors, `green-*`/`orange-*` for ChatGPT/Claude).
- All interactive elements (buttons, inputs) use `ring-2 ring-violet-500 dark:ring-violet-400` for focus-visible rings, not the default neutral ring colors.
- The violet accent color is the CSS variable `--accent: 139 92 246` (RGB components). Reference it as `rgb(var(--accent))` or `rgb(var(--accent) / <alpha>)` in CSS. Never hardcode the hex `#8B5CF6`. For a filled state with white text (not enough contrast at 139 92 246), darken locally with `color-mix(in srgb, rgb(var(--accent)) 85%, black)` rather than changing the shared variable.
- The app font is Archivo, self-hosted from `public/fonts/`. Its `@font-face` is an inline `<style>` in `index.html`, not in `app/globals.css`: Bun puts every CSS `url()` asset under 128 kB into the CSS as base64 (oven-sh/bun#24599). Inline SVG `<text>` (the calendar heatmap) sets no `fontFamily`, so it inherits the body font. `body` uses `tabular-nums` so dates and counts line up.
- Heatmap motion: each cell carries its place in the date range as `--t` (0 to 1). While data streams in, cells fade over 180 ms, spread over 240 ms in date order. A time zone change runs a 700 ms wave (`sweep-a` and `sweep-b` alternate so each change restarts it). The reduced-motion rule in `app/globals.css` makes all of it instant; keep that rule covering any new motion.
- Do not add `(horizontal-viewport-segments: N)` or `(vertical-viewport-segments: N)` media queries to CSS or JS. Foldable detection uses `device-posture: folded` with orientation conditions only (Galaxy Z Fold 5 target).
- When the device is folded with no data loaded, use `layout-split split-no-data` (not `layout-stack`). In tent mode, add `grid-row: 2` on `.panel-form` inside the tent-mode `@media` block so the form stays below the fold.
- A UI section that collapses in cramped contexts and stays expanded in spacious ones must key off real layout capability (fold state, or a `compact` prop computed from it), not raw container width - a narrow desktop-split sidebar and a narrow mobile stack can measure the same width but behave completely differently (the sidebar never hides content behind scroll; the stack does).

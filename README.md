# AI Chat Heatmap Web App

<div align="center">
    <!-- GitHub Codespaces Badge -->
    <a href="https://codespaces.new/cr2007/chatgpt-heatmap-web">
        <img alt="Open in GitHub Codespaces" title="Open in GitHub Codespaces" src="https://github.com/codespaces/badge.svg">
    </a>
    <!-- DeepWiki Badge -->
    <a href="https://deepwiki.com/cr2007/chatgpt-heatmap-web">
        <img alt="Ask DeepWiki" title="Ask DeepWiki" src="https://deepwiki.com/badge.svg">
    </a>
    <br>
    <!-- TypeScript -->
    <img alt="TypeScript" title="TypeScript" src="https://img.shields.io/badge/TypeScript-informational?style=flat&logo=typescript&logoColor=white&color=3178C6">
    <!-- Bun -->
    <img alt="Bun" title="Fast JavaScript Runtime" src="https://img.shields.io/badge/Bun-informational?style=flat&logo=bun&logoColor=white&color=000000">
</div>

A web application to visualize your ChatGPT and Claude conversation activity as a calendar heatmap.

## Features

- Upload ChatGPT and/or Claude conversation exports (`conversations.json`); once one is loaded, drop the next file anywhere on the page
- Side-by-side color-coded heatmap: teal for ChatGPT, clay for Claude, a split for days with both; 4 shades per provider, set by the quartiles of your active days. The two ramps stay apart for people with red-green color blindness
- Figures above the calendar: total prompts, active days, longest streak, busiest day and the split between providers, for all years or one year
- The chats of any day: hover a day, tap it on a phone, or move with the arrow keys
- Find your time zone by city, country, time name ("Pacific Time"), abbreviation ("IST") or offset ("+5:30"); small typos still match, and the zones nearest yours come first
- Light and dark theme: follows your computer until you flip it with the theme button or the D key
- Works on phones, tablets, laptops and large screens (a 4K screen at 1x scales up), and uses a half-open foldable as two screens: the calendar on one half, the figures and the chats of a day on the other
- Built with React and [Tailwind CSS](https://tailwindcss.com/), with no UI component library
- Fully client-side: no data leaves your browser. The built page has a Content-Security-Policy that blocks every network request from the page.

## Getting Started

**Prerequisites:** [Bun](https://bun.sh/) 1.4.4 (the version in `packageManager` in `package.json`)

```sh
git clone https://github.com/cr2007/chatgpt-heatmap-web.git
cd chatgpt-heatmap-web

bun install   # Install dependencies
bun --bun dev # Start the dev server
```

The app is available at [http://localhost:3000](http://localhost:3000).

The dev server listens on localhost only. To reach it from another device on your network, start it with `HOST=0.0.0.0 bun --bun dev`. The synthetic test-data page is at [http://localhost:3000/test.html](http://localhost:3000/test.html) (dev server only).

Checks (CI runs all of them before a deploy):

```sh
bun --bun test           # Tests (add TZ=America/New_York to test another time zone)
bun run lint             # oxlint
bun check                # Type check
bun fmt --check          # Format check (bun fmt to fix)
bun audit --prod         # Vulnerabilities in runtime dependencies
bun --bun run build      # Production build into dist/
bun run size             # Gzip size budget for dist/ (after the build)
```

## Usage

### ChatGPT

1. Go to [chatgpt.com](https://chat.com) > Profile > Settings > Data Controls > Export Data
2. Download and unzip the archive
3. Upload the `conversations.json` file

### Claude

1. Go to [claude.ai](https://claude.ai) > Settings > Privacy > Export Data
2. Claude emails you a link to a list of files (a manifest JSON). Each download link in it expires after 24 hours.
3. Find the file with the category `conversations` (for example `conversations-000.zip`) and open its `export_url` to download it
4. Unzip it and upload the `conversations.json` file

You can upload one or both files. The heatmap updates automatically after each upload.

### What a cell counts

Each cell shows the number of messages you sent on that day, in the time zone you pick:

- A message is one prompt you typed: a ChatGPT `user` message or a Claude `human` message.
- An edited prompt counts again, because you sent it again.
- Hidden context does not count, for example ChatGPT custom instructions.
- Starting a chat does not count by itself. A chat with no prompts adds nothing.
- A prompt with no timestamp does not count.
- A prompt dated before ChatGPT's launch (30 November 2022) or more than a day in the future does not count. Such a date comes from a wrong clock or a broken file.

`test/oracle.test.ts` checks this rule with `jq`, which counts the prompts straight from the raw export. To check your own export (the file stays on your machine):

```sh
CONVERSATIONS_JSON=/path/to/conversations.json bun --bun test test/oracle.test.ts
```

### What the figures mean

The figures above the calendar use the same counted prompts, in the same time zone. A year tab limits them to that year.

- **Active days:** days with at least one prompt. The share is out of the days from the first to the last active day.
- **Longest streak:** the most days in a row with at least one prompt.
- **Busiest day:** the day with the most prompts. A tie goes to the earliest day.
- **By provider:** the share of prompts sent to ChatGPT, when both exports are loaded. With one export, this figure shows the average prompts per active day.

`test/oracle.test.ts` also computes these figures with `jq` and compares them with the app.

## Self-Hosting

### Option 1: Pre-built image from GitHub Container Registry

```sh
docker run -d -p 3000:3000 ghcr.io/cr2007/chatgpt-heatmap-web:latest
```

Each release (a `vX.Y.Z` tag) publishes `X.Y.Z`, `X.Y` and `latest`. Pin a version with, for example, `ghcr.io/cr2007/chatgpt-heatmap-web:1.2`.

### Option 2: Build locally

```sh
git clone https://github.com/cr2007/chatgpt-heatmap-web.git
cd chatgpt-heatmap-web

docker build -t chatgpt-heatmap .
docker run -d -p 3000:3000 chatgpt-heatmap
```

The application is available at [http://localhost:3000](http://localhost:3000).

The image is about 2 MB: BusyBox httpd serves the built files, with gzip, as a non-root user. It needs no writable files, so `docker run --read-only` works.

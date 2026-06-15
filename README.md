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
    <!-- Vite -->
    <img alt="Vite" title="Vite" src="https://img.shields.io/badge/Vite-informational?style=flat&logo=vite&logoColor=white&color=9135FF">
    <!-- Shadcn/ui -->
    <img alt="Shadcn UI Library" title="Component Library" src="https://img.shields.io/badge/shadcn/ui-informational?style=flat&logo=shadcn/ui&logoColor=white&color=000000">
    <!-- Bun -->
    <img alt="Bun" title="Fast JavaScript Runtime" src="https://img.shields.io/badge/Bun-informational?style=flat&logo=bun&logoColor=white&color=000000">
</div>

A web application to visualize your ChatGPT and Claude conversation activity as a calendar heatmap.

## Features

- Upload ChatGPT and/or Claude conversation exports (`conversations.json`)
- Side-by-side color-coded heatmap: green for ChatGPT, orange for Claude, gradient for days with both
- Select your preferred time zone for accurate date mapping
- Light/Dark mode toggle
- Modern UI built with [shadcn/ui](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/)
- Fully client-side: no data leaves your browser

## Getting Started

**Prerequisites:** [Bun](https://bun.sh/)

```sh
git clone https://github.com/cr2007/chatgpt-heatmap-web.git
cd chatgpt-heatmap-web

bun install   # Install dependencies
bun --bun dev # Start the dev server
```

The app is available at [http://localhost:3000](http://localhost:3000).

To run the test suite:

```sh
bun test
```

## Usage

### ChatGPT

1. Go to [chatgpt.com](https://chat.com) > Profile > Settings > Data Controls > Export Data
2. Download and unzip the archive
3. Upload the `conversations.json` file

### Claude

1. Go to [claude.ai](https://claude.ai) > Settings > Export Data
2. Download and unzip the archive
3. Upload the `conversations.json` file

You can upload one or both files. The heatmap updates automatically after each upload.

## Self-Hosting

### Option 1: Pre-built image from GitHub Container Registry

```sh
docker run -d -p 3000:3000 ghcr.io/cr2007/chatgpt-heatmap-web:latest
```

### Option 2: Build locally

```sh
git clone https://github.com/cr2007/chatgpt-heatmap-web.git
cd chatgpt-heatmap-web

docker build -t chatgpt-heatmap .
docker run -d -p 3000:3000 chatgpt-heatmap
```

The application is available at [http://localhost:3000](http://localhost:3000).

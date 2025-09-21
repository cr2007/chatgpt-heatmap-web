# ChatGPT Heatmap Web App

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/cr2007/chatgpt-heatmap-web)

<div align="center">
    <!-- JavaScript -->
    <img alt="JS" title="JavaScript" src="https://img.shields.io/badge/JavaScript-informational?style=flat&logo=javascript&logoColor=black&color=F7DF1E">
    <!-- Next.js -->
    <img alt="Next.js" title="Next.js" src="https://img.shields.io/badge/Next.js-informational?style=flat&logo=next.js&logoColor=white&color=000000">
    <!-- Shadcn/ui -->
    <img alt="Shadcn UI Library" title="Component Library" src="https://img.shields.io/badge/shadcn/ui-informational?style=flat&logo=shadcn/ui&logoColor=white&color=000000">
    <!-- Bun -->
    <img alt="Bun" title="Fast JavaScript Runtime" src="https://img.shields.io/badge/Bun-informational?style=flat&logo=bun&logoColor=white&color=000000">
</div>

A web application to visualize your ChatGPT conversation activity as a calendar heatmap.

## Features

- 📅 Upload your exported ChatGPT conversation history (`conversations.json`)
- 🌎 Select your preferred time zone for accurate date mapping
- 🎨 Responsive, interactive calendar heatmap powered by [@nivo/calendar](https://nivo.rocks/calendar/)
- 🌗 Light/Dark mode toggle
- 💅 Modern UI built with [shadcn/ui](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/)
- 🔐 Fully client-side rendering, so no data is shared outside of the application
- ⚡ Fast, type-safe, and easy to use

## Getting Started

**Prerequisites:** [Bun](https://bun.sh/) (recommended), or [Node.js](https://nodejs.org/) with npm

Clone the repository:

```sh
git clone https://github.com/cr2007/chatgpt-heatmap-web.git
cd chatgpt-heatmap-web

# Bun
bun i   # Install Dependencies
bun dev # Start the server

# Node.js
npm i       # Install dependencies
npm run dev # Start the server
```

Once that is completed, you can access the app by heading to [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Export your ChatGPT data from [chatgpt.com](https://chat.com)
   1. Profile > Settings > Data controls > Export Data > Confirm export
2. Download and unzip the archive, then upload the `conversations.json` file
3. Select your time zone
4. View your ChatGPT usage as a calendar heatmap!

## Self-Hosting

You can self-host this application using Docker in two ways:

### Option 1: Using the Pre-built Image from GitHub Container Registry

```sh
# Run the container
docker run -d -p 3000:3000 ghcr.io/cr2007/chatgpt-heatmap-web:latest
```

You can then access the application at [http://localhost:3000](http://localhost:3000)

### Option 2: Building the Docker Image Locally

```sh
# Clone the repository
git clone https://github.com/cr2007/chatgpt-heatmap-web.git
cd chatgpt-heatmap-web

# Build the Docker image
docker build -t chatgpt-heatmap .

# Run the container
docker run -d -p 3000:3000 chatgpt-heatmap
```

After running the aboce commands, you can access the application at [http://localhost:3000](http://localhost:3000).

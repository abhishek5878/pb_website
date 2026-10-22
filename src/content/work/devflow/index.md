---
links:
  - { label: "devflow on GitHub", url: "https://github.com/abhishek5878/devflow", kind: repo }
  - { label: "The landing page", url: "https://landing-pi-virid.vercel.app", kind: page }
examples:
  - { src: ./shot-1.png, caption: "The landing page: one command, context copied, paste it into the next tool.", url: "https://landing-pi-virid.vercel.app" }
updated: 2026-10-22
---

You hit your AI limit. You lose context. Again. DevFlow was my one-day fix for that, on 4 March 2026.

One command reads the repo, the git history, the stack, the project rules and recent errors, and writes a handoff for the next AI, copied to your clipboard. Paste it into Claude, Cursor or whatever's next and keep going. It runs entirely on your machine and sends nothing anywhere. The routing is a utility; the context is the product.

The other half is a local proxy that speaks the OpenAI API and fails over from Claude to GPT-4 to Gemini to a local Ollama model when a limit hits. There's a VS Code extension too, built and never published.

Twelve commits, one day. It installs straight from GitHub with npx; it was never on npm.

# PollyGlot — React Translation Chat App (OpenAI SDK: OpenRouter, Groq, OpenAI & Custom)

A React translation chat app matching the Scrimba **PollyGlot** layout, powered by the official **`openai` SDK** (`new OpenAI({ apiKey, baseURL, dangerouslyAllowBrowser: true })`) so it works uniformly across **OpenRouter**, **Groq**, **OpenAI**, and any **OpenAI-compatible `baseURL`** (e.g. Ollama, Together, Mistral).

## Project Files

```text
assets/
  fr-flag.png
  jpn-flag.png
  parrot.png
  sp-flag.png
  worldmap.png
index.css
index.html
index.js
package.json
vite.config.js
.env.example
```

## Supported Providers & Editable Models

- **OpenRouter** (`https://openrouter.ai/api/v1`) — free presets including `nvidia/nemotron-nano-9b-v2:free`, `nvidia/nemotron-3-nano-30b-a3b:free`, `meta-llama/llama-3.3-70b-instruct:free`, `google/gemma-3-27b-it:free`, `qwen/qwen3-next-80b-a3b-instruct:free`, plus paid/auto models and editable model input.
- **Groq** (`https://api.groq.com/openai/v1`) — free-tier presets including `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `meta-llama/llama-4-scout-17b-16e-instruct`, `qwen/qwen3-32b`, `openai/gpt-oss-120b`, plus editable model input.
- **OpenAI** (`https://api.openai.com/v1`) — `gpt-4o-mini`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-4o`, plus `dall-e-3` image generation and editable model input.
- **Custom** — any OpenAI-compatible `baseURL`, API key, and model name.

## Setup

```bash
cd ~/Desktop/pollyglot
npm install
npm run dev
```

You can configure keys and models in the **Settings** modal, or create a `.env` file from [.env.example](file:///Users/hitesh/Desktop/pollyglot/.env.example) using either `AI_KEY` / `AI_URL` / `AI_MODEL` or `VITE_*` variables.

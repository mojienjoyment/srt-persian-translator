# 🎬 SRT to Persian Translator (Cloudflare Worker + Gemini AI)

A fast, secure, and AI-powered web tool to translate English SRT subtitles into natural Persian. It is specifically optimized for movies and TV series, ensuring the dialogue sounds like everyday spoken language rather than formal literary text.

Built entirely on the edge using **Cloudflare Workers** and powered by **Google Gemini AI**.

![UI Preview](https://img.shields.io/badge/UI-Live%20Logs%20%26%20Progress-blue) ![Deployment](https://img.shields.io/badge/Deployed-Cloudflare%20Workers-orange)

## ✨ Features

- **🗣️ Natural & Informal Translation**: Strictly prompts the AI to use colloquial, spoken Persian (e.g., "میرم" instead of "می‌روم"), making it perfect for movie/series subtitles.
- **🧠 Smart Dynamic Chunking**: Automatically handles files of any size. It tries to send the whole text first, and if it hits a timeout or limit, it seamlessly falls back to splitting the file into 2, 4, 100, 50, 20, or even 10 blocks per chunk.
- **⚡ Real-Time UI**: 
  - Live progress bar.
  - Real-time system logs showing exactly what the back-end is doing.
  - Live streaming of the translated text as it is generated.
- **🔒 100% Secure**: Your Gemini API key is stored securely in Cloudflare Secrets. It is never exposed to the front-end or the user's browser.
- **⚙️ Custom Prompts**: Advanced users can toggle a checkbox to edit the system prompt for specific translation styles or languages.
- **📥 Easy Export**: Automatically downloads the translated `.srt` file. Includes a "Copy to Clipboard" fallback button just in case.
- **🚦 RPM Aware**: Automatically calculates and enforces delays between requests based on the selected model's Rate Limit (Requests Per Minute) to prevent `429 Too Many Requests` errors.

## 🛠️ Tech Stack

- **Back-end**: Cloudflare Workers (JavaScript)
- **Front-end**: Vanilla HTML5, CSS3, JavaScript (No frameworks, ultra-lightweight)
- **AI Engine**: Google Gemini API (Supports multiple Flash models)

## 🚀 Deployment Guide

Follow these steps to deploy the translator to your own Cloudflare account.

### Prerequisites
- Node.js installed on your machine.
- A free [Cloudflare Account](https://dash.cloudflare.com/).
- A free [Google Gemini API Key](https://aistudio.google.com/app/apikey).

### Step 1: Clone and Install
```bash
git clone https://github.com/mojienjoyment/srt-persian-translator.git
cd srt-persian-translator
npm install
```

### Step 2: Login to Cloudflare
```bash
npx wrangler login
```
*(A browser window will open. Click "Allow" to authorize Wrangler.)*

### Step 3: Add your Gemini API Key
Store your API key securely in Cloudflare Secrets. Run the following command and paste your key when prompted (it will be hidden as you type):
```bash
npx wrangler secret put GEMINI_API_KEY
```

### Step 4: Deploy
```bash
npx wrangler deploy
```
Wrangler will output a URL (e.g., `https://srt-persian-translator.your-subdomain.workers.dev`). Open this URL in your browser to use the app!

## 📖 Usage

1. **Select a Model**: Choose a Gemini model from the drop-down. The app will automatically adjust the delay between requests to respect the model's RPM limit.
2. **Upload SRT**: Click "Upload SRT File" and select your English `.srt` or `.txt` subtitle file.
3. **(Optional) Custom Prompt**: Check the "Enable Custom Prompt" box if you want to modify the AI's instructions.
4. **Start Translation**: Click the button and watch the live logs and output.
5. **Download**: Once finished, the translated Persian `.srt` file will automatically download.

## 🤖 Supported Models & RPM Limits

| Model Name | Actual API ID | RPM Limit | Auto-Delay |
| :--- | :--- | :--- | :--- |
| Gemini 3.1 Flash Lite | `gemini-3.1-flash-lite` | 15 | ~4.5s |
| Gemini 3.5 Flash Lite | `gemini-3.5-flash-lite` | 15 | ~4.5s |
| Gemini 3 Flash | `gemini-3.0-flash` | 5 | ~12.5s |
| Gemini 3.5 Flash | `gemini-3.5-flash` | 5 | ~12.5s |
| Gemini 3.6 Flash | `gemini-3.6-flash` | 5 | ~12.5s |
| Gemini 3.7 Flash | `gemini-3.7-flash` | 5 | ~12.5s |

*(Note: Model names in the UI are mapped to the closest available Gemini API endpoints. Update the `MODEL_MAP` in `worker.js` when Google releases newer versions).*

## 🐛 Troubleshooting

- **Error 524 (Timeout)**: This happens if a chunk is too large and takes Cloudflare more than 100 seconds to process. The app is designed to catch this automatically and split the text into smaller chunks.
- **API Key Error**: Ensure you ran `npx wrangler secret put GEMINI_API_KEY` and deployed *after* setting the secret.
- **Formatting Issues**: If the AI breaks the SRT format, try enabling the "Custom Prompt" and adding: *"Ensure every subtitle block strictly follows the SRT format: Index, Timestamp, Text."*

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

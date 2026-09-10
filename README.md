# 🛡️ ScamShield

**Protect yourself before you click.**

A practical, India-focused scam detection dashboard that analyzes suspicious messages and links using rule-based red-flag detection.

## Features (v1)

- 🔍 **Message Scanner** – Paste any SMS, WhatsApp, email or chat
- 🔗 **Link Scanner** – Analyze suspicious URLs (never opens them)
- 🎯 **Risk Scoring** – LOW / MEDIUM / HIGH with numeric score
- 🚩 **Red Flag Detection** for:
  - Fake prize / lottery scams
  - Fake job offers (registration fees)
  - Fake bank / KYC / account-block threats
  - Fake delivery / courier payment requests
  - Romance / emotional-financial pressure
- 🧠 **“Explain Like I’m 10”** – Plain-language explanations
- 📊 **Scan History & Stats** (saved in browser localStorage)
- 📚 **Scam Education** section with real-world examples
- 🎨 Dark security-dashboard UI

## Important Design Rule

ScamShield **never** says “This is 100% a scam.”  
It always outputs a **risk level + score + red flags + recommendations**.  
Users must still verify independently through official channels.

## How to Run

1. Unzip the folder
2. Open `index.html` in any modern browser  
   (or use a local server: `python -m http.server 8000`)

No API keys or backend required for this version.

## Project Structure

```
scamshield/
├── index.html
├── css/styles.css
├── js/app.js          # Main logic + risk engine
└── README.md
```

## Future Ideas

- OCR for screenshots
- Voice input
- Multi-language (Hindi + major Indian languages)
- Real URL reputation APIs
- Optional LLM for richer explanations
- PWA / mobile app

## Disclaimer

This is an educational / portfolio tool.  
It uses pattern matching and is not perfect.  
Always double-check with official sources. Never share OTPs, PINs, or send money based solely on a message.

---

Built to help people stay safe from everyday digital scams.

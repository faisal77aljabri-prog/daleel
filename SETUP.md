# Daleel Setup Guide

## Overview
Daleel is a Saudi-focused college guidance platform with AI-powered tools for selecting universities, writing essays, and planning applications.

## Features

### Phase 1 ✅ (Complete)
- **Onboarding Quiz** — First-visit modal captures GPA, test scores, major, funding, country
- **College List Builder** — AI generates personalized reach/target/safety colleges with fit scores
- **Essay Advisor** — Inline highlights show writing issues with concrete fixes
- **EC Portfolio & Advisor** — Save extracurriculars, get AI feedback; cut-list grading for Common App
- **Profile Score** — Unified dashboard tracking academics, tests, ECs, essays
- **ACT Support** — Full ACT input across all tools (College List, Profile Score, etc.)

### Phase 2 ✅ (Complete, needs API key)
- **Right-Fit Matcher** — Priority sliders for academics, cost, location, culture, size
- **Real University Data** — US college stats (admission rate, test ranges, cost) + neighborhood POIs (grocery, restaurants, transit)
- **Hybrid Data Strategy** — College Scorecard API for US schools, OpenStreetMap Overpass for POIs, AI fallback for non-US

### Additional Tools
- Scholarship Finder, CPP Calculator, Test Guide, Application Tracker, Countdown, Community, Tips Feed

## Getting Started

### 1. Local Development
```bash
cd /tmp/daleel
python3 -m http.server 8000
# Open http://localhost:8000
```

### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel link
vercel deploy
```

### 3. Enable Real University Data (Optional but Recommended)

The app works fully without this, but enabling real university data makes college profiles richer:

#### Step A: Get a College Scorecard API Key
1. Visit [https://api.data.gov/](https://api.data.gov/)
2. Sign up for a free account (or log in)
3. Under "My Keys," click "Create New Key"
4. You'll get a `COLLEGE_SCORECARD_API_KEY` (e.g., `abc123def456...`)

#### Step B: Add the Key to Vercel
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `COLLEGE_SCORECARD_API_KEY`
   - **Value:** (paste your key from Step A)
   - **Environments:** Production, Preview, Development
4. Redeploy: `vercel --prod`

#### Step C: Test It
1. Open your deployed app
2. Build a college list and click on any college card
3. Scroll down in the modal — you should see:
   - Real admission rate, SAT/ACT ranges, annual cost
   - Nearby groceries, restaurants, transit (from OpenStreetMap)
   - Sample: MIT shows 3% admit rate, nearby Trader Joe's, Blue Bike stations, etc.

**Note:** Non-US schools (UK, Canada, Australia) will show AI-generated info instead, which is fine.

## Authentication

The app uses local account storage (no cloud backend). Features:
- Sign up with email + password (stored in browser localStorage)
- Profile data persists per user
- No external authentication required

## Architecture

### Tech Stack
- **Frontend:** Vanilla JS, HTML5, CSS3 (no build step)
- **AI:** Groq API (Llama 3.3 70B) via `/api/grok.js`
- **Data:** College Scorecard API, OpenStreetMap Overpass (when enabled)
- **Deployment:** Vercel edge functions

### File Structure
```
/tmp/daleel/
├── index.html, auth.html, college-list.html, ...  (18 pages)
├── js/
│   ├── app.js              (main: callAI, card rendering, form handlers)
│   ├── auth.js             (sign up/in, local auth, session)
│   ├── sidebar.js          (navigation drawer)
│   ├── ec-portfolio.js     (save/manage ECs)
│   ├── profile-hub.js      (unified profile editor)
│   ├── translations.js     (i18n: English + Arabic)
│   ├── onboarding.js       (first-visit quiz)
│   └── countdown.js        (application deadline timer)
├── css/
│   └── styles.css          (khuzama colors, responsive layout)
├── api/
│   ├── grok.js             (Groq API proxy)
│   └── university.js       (College Scorecard + Overpass)
├── vercel.json             (CORS config)
└── SETUP.md                (this file)
```

## Color Scheme (Khuzama)

- **Navy Deep:** #281640 (aubergine base)
- **Navy Mid:** #351F52
- **Navy Light:** #3F2662
- **Lavender (Gold):** #B79CE0 (primary accent)
- **Lavender Light:** #D4B0F0
- **Lavender Dim:** #7F5FA8

## Keyboard Shortcuts & RTL

- **Language Toggle:** عربي / EN button in sidebar or navbar
- **RTL Support:** Automatic when Arabic is selected (CSS `dir="rtl"`)
- **Mobile:** Hamburger menu and sidebar drawer on small screens

## Troubleshooting

### "Sign-in not working"
- Check browser console for errors
- Clear localStorage: `localStorage.clear()` in dev tools
- Refresh page

### "College list showing only 1 school"
- Likely AI token limit. Check `/api/grok.js` max_tokens setting (should be 4096+)
- Try simplifying your input (e.g., fewer major + country combos)

### "College cards don't show photos or real stats"
- College Scorecard API key not set in Vercel? See **Step 3** above
- For dev locally: Set env `COLLEGE_SCORECARD_API_KEY` before running Vercel locally:
  ```bash
  export COLLEGE_SCORECARD_API_KEY=your_key_here
  vercel dev
  ```

### "AP/Qudurat/Tahsili translations missing"
- Check `js/translations.js` — add missing `T.ar` keys, or file a GitHub issue

## Contributing / Feedback

Built by Faisal for Saudi students. PRs and feature requests welcome!

---

**Last Updated:** June 6, 2026  
**Status:** Phase 1 & 2 complete; ready for production (with optional real-data backend)

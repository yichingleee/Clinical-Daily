# ClinicalDaily

**Your AI-Powered Medical Research Assistant**

Stay current with the latest clinical trials from top medical journals

---

## What is ClinicalDaily?

ClinicalDaily is a web application that helps you discover and understand the latest medical research. It automatically fetches recent clinical trial publications from prestigious medical journals and uses AI to create easy-to-read summaries.

### Key Features

- **Live Research Feed** - Automatically fetches the latest clinical trials from 7 top medical journals
- **AI Summaries** - Get structured summaries of complex research papers with one click
- **Smart Filtering** - Filter by journal, study type, and date range
- **Search** - Find articles by keywords in titles or abstracts
- **Mobile Friendly** - Works on desktop, tablet, and phone

### Supported Journals

- New England Journal of Medicine (NEJM)
- JAMA
- The Lancet
- BMJ
- Nature Medicine
- Annals of Internal Medicine
- Journal of Clinical Oncology

---

## Getting Started

Follow these steps to run ClinicalDaily on your computer. Don't worry if you're new to coding — we'll guide you through each step!

### Step 1: Check Prerequisites

Before starting, make sure you have **Node.js 20+** installed on your computer.

**How to check if Node.js is installed:**

1. Open your terminal (or Command Prompt on Windows)
2. Type this command and press Enter:
   ```
   node --version
   ```
3. If you see a version number (like `v20.0.0`), you're good to go!

**If Node.js is NOT installed:**

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (Node 20+)
3. Run the installer and follow the on-screen instructions
4. Restart your terminal after installation

### Step 2: Download the Project

If you downloaded this as a ZIP file, extract it to a folder on your computer.

If you're using Git:
```
git clone <repository-url>
cd Clinical-Daily
```

### Step 3: Install Dependencies

Open your terminal, navigate to the project folder, and run:

```
npm install
```

This command downloads all the necessary files the app needs to run. It may take a minute or two.

### Step 4: Get Your Gemini API Key

ClinicalDaily uses Google's Gemini AI to generate summaries. You'll need a free API key:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the API key (it looks like a long string of letters and numbers)

> **Important:** Keep your API key private. Don't share it with others or post it online.

### Step 5: Set Up Your API Key

Create a new file called `.env.local` in the project folder:

**On Mac/Linux:**
```
echo "GEMINI_API_KEY=your_api_key_here" > .env.local
```

**On Windows (PowerShell):**
```
"GEMINI_API_KEY=your_api_key_here" | Out-File -FilePath .env.local -Encoding ASCII
```

**Or manually:**
1. Create a new text file in the project folder
2. Name it `.env.local` (including the dot at the beginning)
3. Add this line (replace with your actual API key):
   ```
   GEMINI_API_KEY=paste_your_api_key_here
   ```
4. Save the file

### Step 6: Run the App

Start the application by running:

```
npm run dev
```

You should see output similar to:
```
  VITE v6.2.0  ready in 300 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.100:3000/
```

### Step 7: Open in Your Browser

Open your web browser and go to:

```
http://localhost:3000
```

You should now see ClinicalDaily running with the latest research articles!

---

## How to Use ClinicalDaily

### Browsing Articles

When you open the app, it automatically loads the latest clinical trials from the past 14 days. Each article card shows:

- **Journal badge** (color-coded)
- **Trial badge** (for clinical studies)
- **Title** of the research
- **Authors** (first three, plus "et al." if more)
- **Publication date**
- **Abstract preview**

### Filtering Your Feed

Use the sidebar filters (on the left side of the screen) to narrow down results:

| Filter | What it does |
|--------|--------------|
| **Time Window** | Show articles from the last 7, 14, or 30 days |
| **Study Type** | Filter by Clinical Trial, RCT, Meta-Analysis, or Systematic Review |
| **Journals** | Select which journals to include |

On mobile, tap the menu icon (☰) in the top right to open filters.

### Searching

Use the search bar at the top to find articles containing specific words in their title or abstract.

### Sorting

Use the dropdown menu to sort articles by:
- **Newest First** (default)
- **Oldest First**

### Getting AI Summaries

For any article marked as a trial, you can generate an AI summary:

1. Find an article with the "Trial" badge
2. Click the **"Summarize Trial"** button
3. Wait a few seconds while the AI analyzes the abstract
4. View the structured summary with:
   - Research Design
   - Study Population
   - Interventions
   - Endpoints
   - Results

> **Note:** AI summaries require a valid Gemini API key. The summary is generated on-demand and may take a few seconds.

### Refreshing the Feed

Click the **Refresh** button to fetch the latest articles from PubMed.

---

## Troubleshooting

### "Cannot find module" or similar errors

Try reinstalling dependencies:
```
rm -rf node_modules
npm install
```

On Windows:
```
rmdir /s /q node_modules
npm install
```

### App starts on a different port

If port 3000 is already in use, the app will automatically switch to the next available port (3001, 3002, etc.). Check your terminal output for the actual URL to use.

### "API Key is missing" error when summarizing

Make sure:
1. You created the `.env.local` file in the project root folder
2. The file contains `GEMINI_API_KEY=your_actual_key` (no quotes around the key)
3. You restarted the dev server after creating the file

### No articles showing up

This can happen if:
- No clinical trials were published in your selected time window (try "Last 30 Days")
- All journals are unchecked (click "All" to select all journals)
- PubMed servers are temporarily unavailable (try again later)

### Page looks broken or unstyled

Make sure you have an internet connection. The app loads styles from an online CDN.

---

## Stopping the App

To stop the application, go to your terminal and press:

- **Mac/Linux:** `Ctrl + C`
- **Windows:** `Ctrl + C`

---

## Building for Production

If you want to create a production-ready version:

```
npm run build
```

This creates optimized files in the `dist` folder.

To preview the production build:
```
npm run preview
```

---

## FAQ

**Q: Is ClinicalDaily free to use?**
A: Yes! The app is free. The Gemini API also has a free tier that should be sufficient for personal use.

**Q: Where does the research data come from?**
A: Articles are fetched from PubMed, a free database maintained by the National Library of Medicine.

**Q: How often is the data updated?**
A: Click the Refresh button to get the latest articles. The app doesn't auto-refresh to conserve API calls.

**Q: Can I use this offline?**
A: No, the app requires an internet connection to fetch articles and generate AI summaries.

**Q: Is my data private?**
A: Yes. The app runs locally on your computer. Your API key stays on your machine and is not sent anywhere except to Google's Gemini service for generating summaries.

---

## Need Help?

- **GitHub Issues:** [https://github.com/anthropics/claude-code/issues](https://github.com/anthropics/claude-code/issues)
- **AI Studio:** [View in AI Studio](https://ai.studio/apps/drive/1IBM9TMpf_r7IbEk5KFGfLvjcVgGqiJ2e)

---

## License

This project is private. See package.json for details.

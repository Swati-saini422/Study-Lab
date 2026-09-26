# StudyLab — 10 AI Study Tools

A single web project bundling ten small AI-powered tools for students: Resume Builder,
Notes Generator, Presentation Generator, Mind Map, Google Sheets Backend, Quiz Generator,
Doubt-Solving Chatbot, Flashcards, Study Planner, and Notes-from-Photo (OCR + summary).

## Files
- `index.html` — page structure and navigation
- `style.css` — all styling (dark/light, blue theme, animations)
- `script.js` — all app logic and API calls
- Loaded from CDN: `marked.js` (Markdown rendering), `jsPDF` (resume PDF export),
  `Tesseract.js` (in-browser OCR), `PptxGenJS` (slide export)

## Running it
No build step needed — just open `index.html` in a browser, or serve the folder with
any static server (e.g. `python -m http.server`) for the smoothest experience.

## Adding your API key
1. Get an API key from https://console.anthropic.com
2. Paste it into the "Anthropic API key" box in the sidebar and click **Save key**.
3. It's stored only in your browser's `localStorage` — nothing is sent anywhere except
   directly to Anthropic's API when you use a tool.

**Security note:** calling the API straight from the browser exposes your key to anyone
who opens dev tools on your machine. That's fine for a personal project or class
assignment, but for anything public-facing, put a small backend in between so the key
never reaches the browser.

## Google Sheets Backend tool
This tool expects the URL of a Google Apps Script Web App you've deployed yourself
(`doGet`/`doPost` returning/accepting JSON). Paste that URL into the tool to load and
add rows live. Until you add one, it shows demo data so the UI still works.

## Notes
- The model name is set once, near the top of `script.js` (`const MODEL = ...`) —
  update it there if Anthropic renames or retires that model.
- OCR quality depends on the photo; Tesseract.js works best on clear, well-lit,
  reasonably horizontal text.

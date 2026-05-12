# Book Generation Automation

A modular book generation system with a React frontend and Node.js backend. The system accepts an Excel outline and generates chapter drafts by searching the web with SerpAPI.

## Features

- Upload Excel outline containing `Chapter Title` and optional `Outline`
- Use SerpAPI to search chapter topics on the web
- Generate draft chapters with source snippets
- Human-in-the-loop review and download approved chapters

## Setup

### Backend

1. Copy `backend/.env.example` to `backend/.env`
2. Set `SERP_API_KEY` with your SerpAPI key
3. Install dependencies:

```bash
cd backend
npm install
```

4. Run backend:

```bash
npm run start
```

### Frontend

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Run frontend:

```bash
npm run dev
```

3. Open the app in your browser (default `http://localhost:5173`)

## Excel format

The first sheet should include a header row with at least one of:

- `Chapter Title`
- `Title`

Optional outline column headers:

- `Outline`
- `Chapter Outline`

Each row is treated as a chapter entry.

## How it works

- The frontend uploads the Excel file to the backend
- The backend parses chapter titles and outlines
- The user selects a chapter to generate
- The backend calls SerpAPI and builds a draft from search snippets
- Drafts are reviewed in the UI before download

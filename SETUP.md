# Book Generation System - Complete Setup Guide

This guide will walk you through setting up the entire system from scratch.

## Prerequisites

- Node.js 18+ with npm
- Supabase account (free tier available at https://supabase.com)
- LLM provider: Either Ollama (local) or OpenAI (API)
- SerpAPI key for web search (https://serpapi.com - free tier available)

## Step 1: Prepare Supabase Database

### Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Create a new project
3. Note your `PROJECT_URL` and create a `SERVICE_ROLE_KEY` (Settings → API)

### Create Database Tables

In Supabase SQL Editor, run the following queries:

```sql
-- Book Outlines Table
CREATE TABLE book_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes_on_outline_before TEXT,
  notes_on_outline_after TEXT,
  status_outline_notes TEXT DEFAULT 'no',
  outline TEXT,
  chapter_templates JSONB,
  stage TEXT DEFAULT 'input',
  source TEXT DEFAULT 'provided',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chapters Table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outline_id UUID NOT NULL REFERENCES book_outlines(id) ON DELETE CASCADE,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  outline TEXT,
  chapter_notes_status TEXT DEFAULT 'no',
  chapter_notes TEXT,
  draft TEXT,
  summary TEXT,
  source_context TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(outline_id, chapter_index)
);

-- Final Books Table
CREATE TABLE final_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outline_id UUID NOT NULL REFERENCES book_outlines(id) ON DELETE CASCADE,
  final_review_notes_status TEXT DEFAULT 'no',
  final_review_notes TEXT,
  book_output_status TEXT DEFAULT 'pending',
  exported_txt_path TEXT,
  exported_docx_path TEXT,
  compiled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_chapters_outline_id ON chapters(outline_id);
CREATE INDEX idx_final_books_outline_id ON final_books(outline_id);
```

## Step 2: Set Up Backend

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Create Environment File

Create `.env` with the following:

```env
# Supabase
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM Provider: 'ollama' or 'openai'
LLM_PROVIDER=ollama

# Ollama Configuration (if using Ollama)
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2

# OpenAI Configuration (if using OpenAI)
# OPENAI_API_KEY=your-openai-api-key
# OPENAI_MODEL=gpt-4

# Web Search API
SERP_API_KEY=your-serpapi-key

# Optional: Notification Webhook (for external integrations)
# NOTIFICATION_WEBHOOK_URL=https://your-webhook-endpoint.com
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Choose Your LLM Provider

#### Option A: Using Ollama (Local)

1. **Install Ollama**: Download from https://ollama.ai
2. **Start Ollama**:
   ```bash
   ollama serve
   ```
3. **In another terminal, pull Llama 3.2**:
   ```bash
   ollama pull llama3.2
   ```
4. **Verify it works**:
   ```bash
   curl http://127.0.0.1:11434/api/tags
   ```

#### Option B: Using OpenAI

1. **Get API Key**: https://platform.openai.com/api-keys
2. **Update `.env`**:
   ```env
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_key
   OPENAI_MODEL=gpt-4
   ```

### 5. Get SerpAPI Key

1. Sign up at https://serpapi.com (free tier: 100 searches/month)
2. Copy your API key to `.env`:
   ```env
   SERP_API_KEY=your_key
   ```

### 6. Start Backend Server

```bash
npm run start
```

You should see:
```
Express server running on http://localhost:4000
```

## Step 3: Set Up Frontend

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Create Environment File

Create `.env.local`:

```env
VITE_API_BASE=http://localhost:4000
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.4.1  ready in 120 ms

  ➜  Local:   http://localhost:5173/
```

## Step 4: Test the System

### 1. Prepare Test Excel File

Create a file `test_book.xlsx` with this structure:

| title | notes_on_outline_before | outline | notes_on_outline_after | status_outline_notes | chapter_title | chapter_outline |
|-------|-------------------------|---------|------------------------|----------------------|---------------|-----------------|
| My First Book | Create an outline for a beginner-friendly book on machine learning | | | no_notes_needed | Chapter 1: What is ML? | Introduction to machine learning basics |
| | | | | | Chapter 2: Data | Understanding data in ML |
| | | | | | Chapter 3: Models | Building and training models |

### 2. Open the UI

1. Open http://localhost:5173 in your browser
2. Upload `test_book.xlsx`
3. Fill in the form:
   - Book Title: `My First Book`
   - Notes Before: `Create an outline for a beginner-friendly book on machine learning`
   - Status: `no_notes_needed`
4. Click **Generate Outline**

### 3. Generate a Chapter

1. After outline is ready, in the Chapter Generation section:
2. For "Chapter 1: What is ML?":
   - Set "Chapter Notes Status" to `no_notes_needed`
   - Click **Generate Chapter**

### 4. Accept and Compile

1. Once chapter is generated, click **Accept**
2. In Final Compilation stage:
   - Set "Final Review Status" to `no_notes_needed`
   - Click **Compile Final Draft**
3. Check `backend/exports/` for generated files

## Troubleshooting

### Backend won't start

**Error**: `Cannot find module 'dotenv'`

```bash
npm install dotenv
```

**Error**: `SUPABASE_SERVICE_ROLE_KEY is not configured`

- Make sure `.env` file exists in `backend/` directory
- Check that `SUPABASE_SERVICE_ROLE_KEY` value is set

### LLM Generation Fails

**Error**: `OLLAMA_URL connection refused`

- Make sure Ollama is running: `ollama serve`
- Verify llama3.2 is installed: `ollama pull llama3.2`

**Error**: `OPENAI_API_KEY is not configured`

- Make sure `LLM_PROVIDER=openai` in `.env`
- Make sure `OPENAI_API_KEY` is set to a valid key

### Frontend can't connect to backend

**Error**: `ERR_CONNECTION_REFUSED`

- Make sure backend is running on port 4000
- Check `.env.local` has correct `VITE_API_BASE`
- Try using `http://127.0.0.1:4000` instead of `localhost`

### Supabase Connection Issues

**Error**: `Supabase client connection failed`

- Verify `SUPABASE_URL` is correct (check Supabase dashboard)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not Anon key)
- Make sure tables exist (run SQL queries in Supabase SQL Editor)

## Workflow Overview

### Stage 1: Input + Outline
- Upload Excel file with book title and chapter titles
- System generates outline based on `notes_on_outline_before`
- Editor can review and add `notes_on_outline_after`
- Status: `paused` → `awaiting_notes` → `ready`

### Stage 2: Chapter Generation
- For each chapter, set `chapter_notes_status`:
  - `no` → Paused (requires user input to continue)
  - `yes` → Waits for editor notes in `chapter_notes`
  - `no_notes_needed` → Generates immediately
- System searches web via SerpAPI and generates draft
- Uses context from previous chapters
- Editor reviews and accepts

### Stage 3: Final Compilation
- After all chapters accepted, compile final book
- Exports to `.txt` and `.docx` (optional)
- Stores paths in database

## Next Steps

1. Customize prompts in `backend/src/services/llmService.js`
2. Set up webhook for notifications (optional)
3. Add more LLM providers if needed
4. Integrate with your publishing workflow

## Support

For issues or questions:
1. Check backend logs: `npm run start`
2. Check frontend console: Browser DevTools (F12)
3. Check Supabase logs: Dashboard → Logs
4. Verify all environment variables are set correctly

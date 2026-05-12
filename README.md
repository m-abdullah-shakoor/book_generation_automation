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
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SERP_API_KEY`
3. If you want to use Ollama Llama 3.2, set `LLM_PROVIDER=ollama`, `OLLAMA_URL`, and `OLLAMA_MODEL=llama3.2`. If you still want OpenAI, keep `LLM_PROVIDER=openai` and set `OPENAI_API_KEY`.
4. Install dependencies:

```bash
cd backend
npm install
```

4. Run backend:

```bash
npm run start
```

### Required Supabase tables

Create the following tables in your Supabase project:

- `book_outlines`
  - `id` (uuid or int, primary key)
  - `title`
  - `notes_on_outline_before`
  - `notes_on_outline_after`
  - `status_outline_notes`
  - `outline`
  - `chapter_templates` (json)
  - `stage`
  - `created_at`
  - `updated_at`

- `chapters`
  - `id`
  - `outline_id`
  - `chapter_index`
  - `title`
  - `outline`
  - `chapter_notes_status`
  - `chapter_notes`
  - `draft`
  - `summary`
  - `source_context`
  - `status`
  - `created_at`
  - `updated_at`

- `final_books`
  - `id`
  - `outline_id`
  - `final_review_notes_status`
  - `final_review_notes`
  - `book_output_status`
  - `exported_txt_path`
  - `exported_docx_path`
  - `compiled_at`
  - `created_at`
  - `updated_at`

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

## Excel Format

The system now follows a strict 3-stage workflow. Your Excel file can define the book at the top row, followed by chapters.

### Book-Level (Row 1)

| Column | Required | Notes |
|--------|----------|-------|
| `title` | Yes | Book title |
| `notes_on_outline_before` | Yes | Editor guidance BEFORE outline generation. Outline generation is blocked without this. |
| `outline` | No | If provided, skip generation and use this outline. |
| `notes_on_outline_after` | No | Optional editor feedback AFTER outline generation. |
| `status_outline_notes` | No | One of: `yes`, `no_notes_needed`, `no` (defaults to `no`) |

### Chapter Rows (Row 2+)

| Column | Required | Notes |
|--------|----------|-------|
| `chapter_title` or `Chapter Title` | Yes | Chapter title |
| `chapter_outline` or `Chapter Outline` | No | Chapter outline/structure |

### Example Excel Format

```
title | notes_on_outline_before | outline | notes_on_outline_after | status_outline_notes | chapter_title | chapter_outline
My Book | Create an outline for a book about AI safety | | | no_notes_needed | Chapter 1: Intro | Basic introduction
| | | | | Chapter 2: History | Historical context of AI
| | | | | Chapter 3: Ethics | Ethical considerations
```

## Workflow Stages

### 1. Input + Outline Stage
- **Input**: Upload Excel file with `title` and `notes_on_outline_before`
- **Logic**:
  - If `outline` provided in Excel → Use it directly
  - If `outline` not provided → Generate using LLM (OpenAI or Ollama Llama3.2)
  - Check `status_outline_notes` to determine if editor notes are required
  - Only proceed if `notes_on_outline_before` is filled

### 2. Chapter Generation Stage
- **Input**: Outline + chapter list
- **Logic**:
  - For each chapter, check `chapter_notes_status`:
    - `no` → Paused, waiting for status update
    - `yes` → Wait for `chapter_notes` from editor, then generate
    - `no_notes_needed` → Generate immediately
  - Uses summaries of previous chapters as context
  - Integrates web search via SerpAPI

### 3. Final Compilation Stage
- **Input**: Accepted chapters
- **Logic**:
  - Check `final_review_notes_status`:
    - `yes` → Wait for final notes
    - `no_notes_needed` → Proceed to compilation
    - `no` → Paused
  - Exports as `.txt` or `.docx`

## Workflow Variables

All variables follow strict naming:
- `title`: Book title (mandatory)
- `notes_on_outline_before`: Editorial guidance before outline (mandatory for generation)
- `outline`: Generated or provided outline
- `notes_on_outline_after`: Post-outline editorial feedback
- `status_outline_notes`: Controls outline approval flow
- `chapter_notes_status`: Controls chapter generation flow (yes/no/no_notes_needed)
- `chapter_notes`: Per-chapter editorial notes
- `final_review_notes_status`: Controls final compilation flow
- `final_review_notes`: Final editorial feedback

## API Endpoints

### 1. Upload Outline

**POST** `/api/outline/upload`

Multipart form with `outline` file (Excel).

Returns parsed outline with book-level data and chapters.

### 2. Generate Outline

**POST** `/api/outline/generate`

```json
{
  "title": "My Book",
  "notes_on_outline_before": "Create a comprehensive outline...",
  "notes_on_outline_after": "",
  "outline": "",
  "status_outline_notes": "no_notes_needed",
  "chapters": []
}
```

**Responses**:
- `202` if paused (missing notes_before)
- `200` if outline generated successfully

### 3. Regenerate Outline

**POST** `/api/outline/:outlineId/regenerate`

Same body as `/generate`. Updates existing outline with new notes.

### 4. Generate Chapter

**POST** `/api/chapters/generate`

```json
{
  "outlineId": "uuid",
  "chapter_index": 0,
  "title": "Chapter 1: Introduction",
  "outline": "Chapter outline here",
  "chapter_notes_status": "no_notes_needed",
  "chapter_notes": ""
}
```

**Logic**:
- If `chapter_notes_status` is `yes` and no `chapter_notes` → returns `202` (awaiting notes)
- If `chapter_notes_status` is `no` → returns `202` (paused)
- If `chapter_notes_status` is `yes` with notes → generates draft
- If `chapter_notes_status` is `no_notes_needed` → generates draft immediately

### 5. Accept Chapter

**POST** `/api/chapters/:chapterId/accept`

Marks chapter as accepted and ready for compilation.

### 6. Compile Final Draft

**POST** `/api/final/compile`

```json
{
  "outlineId": "uuid",
  "final_review_notes_status": "no_notes_needed",
  "final_review_notes": "",
  "output_format": "txt"
}
```

**Logic**:
- If `final_review_notes_status` is `no` → returns `202` (paused)
- If `final_review_notes_status` is `yes` or `no_notes_needed` → compiles and exports

Returns paths to generated `.txt` and optionally `.docx` files.

## Notification Events

The system sends webhooks (if `NOTIFICATION_WEBHOOK_URL` is set):

- `outline-paused`: Outline generation blocked
- `outline-awaiting-notes`: Waiting for `notes_on_outline_after`
- `outline-ready-for-review`: Outline ready
- `outline-regenerated`: Outline regenerated
- `chapter-paused`: Chapter paused
- `chapter-awaiting-notes`: Waiting for `chapter_notes`
- `chapter-ready-for-review`: Chapter draft ready
- `chapter-accepted`: Chapter accepted
- `final-pause`: Final compilation paused
- `final-draft-compiled`: Book exported successfully
- `outline-error`, `chapter-error`, `final-error`: Error events

## LLM Provider Configuration

### Using Ollama Llama3.2

1. Install Ollama: https://ollama.ai
2. Pull Llama 3.2:
   ```bash
   ollama pull llama3.2
   ollama serve
   ```
3. In `.env`:
   ```
   LLM_PROVIDER=ollama
   OLLAMA_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3.2
   ```

### Using OpenAI

In `.env`:
```
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4
```

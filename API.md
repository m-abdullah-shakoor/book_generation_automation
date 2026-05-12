# API Documentation - Book Generation System

## Overview

This API provides endpoints for a three-stage book generation workflow:
1. **Input + Outline Stage**: Upload book details and generate outline
2. **Chapter Generation Stage**: Generate individual chapters with LLM and web search
3. **Final Compilation Stage**: Compile and export final book

All variable names use **snake_case** and must be followed exactly.

## Base URL

```
http://localhost:4000/api
```

## Endpoints

### 1. Upload Outline File

**POST** `/outline/upload`

Uploads and parses an Excel file to extract book and chapter information.

**Request**
- Content-Type: `multipart/form-data`
- Field: `outline` (file)

**Example**
```bash
curl -X POST http://localhost:4000/api/outline/upload \
  -F "outline=@book.xlsx"
```

**Response (200)**
```json
{
  "outline": {
    "type": "book_outline",
    "title": "My First Book",
    "notes_on_outline_before": "Create an outline...",
    "notes_on_outline_after": "",
    "outline": "",
    "status_outline_notes": "no_notes_needed",
    "chapters": [
      {
        "title": "Chapter 1: Introduction",
        "outline": "Basic intro"
      }
    ]
  }
}
```

**Response (400)**
```json
{
  "error": "No spreadsheet found in uploaded file"
}
```

---

### 2. Generate Outline

**POST** `/outline/generate`

Generates a book outline based on provided information. Uses LLM (Ollama or OpenAI) if outline not provided.

**Request Body**
```json
{
  "title": "My First Book",
  "notes_on_outline_before": "Create a comprehensive outline for a beginner's guide to Python programming",
  "notes_on_outline_after": "",
  "outline": "",
  "status_outline_notes": "no_notes_needed",
  "chapters": []
}
```

**Required Fields**
- `title` (string): Book title
- `notes_on_outline_before` (string): Editorial guidance BEFORE outline (blocks generation if missing)
- `status_outline_notes` (string): One of `yes`, `no`, `no_notes_needed`

**Optional Fields**
- `outline` (string): If provided, skips generation and uses this outline directly
- `notes_on_outline_after` (string): Post-generation editor feedback
- `chapters` (array): Chapter templates from Excel parser

**Response (200) - Outline Generated Successfully**
```json
{
  "outline": {
    "id": "uuid-here",
    "title": "My First Book",
    "notes_on_outline_before": "Create a comprehensive outline...",
    "outline": "# Book Outline\n\nChapter 1: Basics\n...",
    "status_outline_notes": "no_notes_needed",
    "stage": "input",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "status": "review_pending"
}
```

**Response (202) - Paused (Awaiting Input)**
```json
{
  "status": "awaiting_notes",
  "message": "Waiting for outline notes from editor (status_outline_notes=yes).",
  "outline": { ... }
}
```

**Response (202) - Paused (Missing Required Input)**
```json
{
  "status": "paused",
  "message": "Outline generation paused. notes_on_outline_before is required."
}
```

---

### 3. Regenerate Outline

**POST** `/outline/:outlineId/regenerate`

Updates and regenerates an existing outline with new notes.

**Request Body**
```json
{
  "title": "My First Book",
  "notes_on_outline_before": "Create a comprehensive outline...",
  "notes_on_outline_after": "Make it more beginner-friendly",
  "status_outline_notes": "no_notes_needed"
}
```

**Response (200) - Outline Regenerated**
```json
{
  "outline": {
    "id": "uuid-here",
    "outline": "# Updated Book Outline\n...",
    "notes_on_outline_after": "Make it more beginner-friendly",
    "updated_at": "2024-01-15T11:00:00Z"
  },
  "status": "regenerated"
}
```

---

### 4. Get Outline

**GET** `/outline/:outlineId`

Retrieves an existing outline by ID.

**Response (200)**
```json
{
  "outline": {
    "id": "uuid-here",
    "title": "My First Book",
    "outline": "# Book Outline\n...",
    "stage": "input",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Response (404)**
```json
{
  "error": "Outline record not found."
}
```

---

### 5. Generate Chapter

**POST** `/chapters/generate`

Generates a draft for a specific chapter using LLM and web search.

**Request Body**
```json
{
  "outlineId": "uuid-of-outline",
  "chapter_index": 0,
  "title": "Chapter 1: Introduction",
  "outline": "Basic introduction to the topic",
  "chapter_notes_status": "no_notes_needed",
  "chapter_notes": ""
}
```

**Required Fields**
- `outlineId` (string): Parent outline ID
- `chapter_index` (integer): Chapter position (0-based)
- `title` (string): Chapter title
- `chapter_notes_status` (string): One of `yes`, `no`, `no_notes_needed`

**Optional Fields**
- `outline` (string): Chapter outline/structure
- `chapter_notes` (string): Editor notes for chapter generation

**Logic**
- If `chapter_notes_status` is `no` → Returns 202 (paused)
- If `chapter_notes_status` is `yes` + no `chapter_notes` → Returns 202 (awaiting notes)
- If `chapter_notes_status` is `yes` + has `chapter_notes` → Generates draft
- If `chapter_notes_status` is `no_notes_needed` → Generates draft immediately

**Response (200) - Chapter Generated**
```json
{
  "chapter": {
    "id": "uuid-here",
    "outline_id": "uuid-of-outline",
    "chapter_index": 0,
    "title": "Chapter 1: Introduction",
    "draft": "# Chapter 1: Introduction\n\nThis chapter covers...",
    "summary": "A concise summary of the chapter",
    "source_context": "Source 1: ...\nSource 2: ...",
    "status": "review_pending",
    "created_at": "2024-01-15T10:45:00Z"
  },
  "status": "review_pending"
}
```

**Response (202) - Chapter Paused**
```json
{
  "chapter": { ... },
  "status": "paused",
  "message": "Chapter paused. chapter_notes_status must be set to 'yes' or 'no_notes_needed' to proceed."
}
```

**Response (202) - Awaiting Notes**
```json
{
  "chapter": { ... },
  "status": "awaiting_notes",
  "message": "Waiting for chapter_notes from editor (chapter_notes_status=yes)."
}
```

---

### 6. Accept Chapter

**POST** `/chapters/:chapterId/accept`

Marks a chapter draft as accepted and ready for final compilation.

**Request Body** (empty)

**Response (200)**
```json
{
  "chapter": {
    "id": "uuid-here",
    "status": "accepted"
  },
  "message": "Chapter accepted and ready for compilation."
}
```

---

### 7. Compile Final Draft

**POST** `/final/compile`

Compiles all accepted chapters into a final book and exports to .txt and optionally .docx.

**Request Body**
```json
{
  "outlineId": "uuid-of-outline",
  "final_review_notes_status": "no_notes_needed",
  "final_review_notes": "",
  "output_format": "txt"
}
```

**Required Fields**
- `outlineId` (string): Outline ID
- `final_review_notes_status` (string): One of `yes`, `no`, `no_notes_needed`

**Optional Fields**
- `final_review_notes` (string): Final editor feedback
- `output_format` (string): `txt` or `docx` (default: `txt`)

**Response (200) - Compilation Successful**
```json
{
  "final": {
    "id": "uuid-here",
    "outline_id": "uuid-of-outline",
    "book_output_status": "ready",
    "exported_txt_path": "/path/to/book_uuid_timestamp.txt",
    "exported_docx_path": "/path/to/book_uuid_timestamp.docx",
    "compiled_at": "2024-01-15T11:00:00Z"
  },
  "status": "compiled",
  "files": {
    "txtPath": "/path/to/book_uuid_timestamp.txt",
    "docxPath": "/path/to/book_uuid_timestamp.docx"
  }
}
```

**Response (202) - Paused**
```json
{
  "status": "paused",
  "message": "Final compilation paused until review status is confirmed."
}
```

**Response (400) - No Chapters Available**
```json
{
  "error": "No chapters available for final compilation."
}
```

---

## Health Check

**GET** `/ping`

Simple health check endpoint.

**Response (200)**
```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error description"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 202 | Accepted (paused/awaiting) |
| 400 | Bad request (missing/invalid fields) |
| 404 | Resource not found |
| 500 | Server error |

---

## Workflow State Machine

### Outline States
```
PAUSED (notes_before missing)
  ↓
AWAITING_NOTES (status=yes, awaiting notes_after)
  ↓
READY_FOR_REVIEW
  ↓
ACCEPTED
```

### Chapter States
```
PAUSED (notes_status=no)
  ↓
AWAITING_NOTES (notes_status=yes, awaiting chapter_notes)
  ↓
GENERATING
  ↓
REVIEW_PENDING
  ↓
ACCEPTED
```

### Final Compilation States
```
PAUSED (notes_status=no)
  ↓
COMPILING
  ↓
READY (files exported)
```

---

## Authentication

Currently, no authentication is required. For production, implement API key or JWT authentication via Express middleware.

---

## Rate Limiting

For production deployment, implement rate limiting using middleware like `express-rate-limit`.

---

## Notifications

If `NOTIFICATION_WEBHOOK_URL` is configured in `.env`, the system sends POST requests to:

```
POST {NOTIFICATION_WEBHOOK_URL}
Content-Type: application/json

{
  "event": "outline-paused" | "chapter-generated" | etc,
  "payload": { ... }
}
```

Supported events:
- `outline-paused`
- `outline-awaiting-notes`
- `outline-ready-for-review`
- `outline-regenerated`
- `chapter-paused`
- `chapter-awaiting-notes`
- `chapter-ready-for-review`
- `chapter-accepted`
- `final-pause`
- `final-draft-compiled`
- `outline-error`, `chapter-error`, `final-error`

---

## Example Workflow

### Step 1: Upload Excel
```bash
curl -X POST http://localhost:4000/api/outline/upload \
  -F "outline=@book.xlsx"
```

### Step 2: Generate Outline
```bash
curl -X POST http://localhost:4000/api/outline/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Book",
    "notes_on_outline_before": "Create an outline...",
    "status_outline_notes": "no_notes_needed"
  }'
```

### Step 3: Generate Chapter
```bash
curl -X POST http://localhost:4000/api/chapters/generate \
  -H "Content-Type: application/json" \
  -d '{
    "outlineId": "uuid-from-step-2",
    "chapter_index": 0,
    "title": "Chapter 1",
    "chapter_notes_status": "no_notes_needed"
  }'
```

### Step 4: Accept Chapter
```bash
curl -X POST http://localhost:4000/api/chapters/{chapterId}/accept
```

### Step 5: Compile Book
```bash
curl -X POST http://localhost:4000/api/final/compile \
  -H "Content-Type: application/json" \
  -d '{
    "outlineId": "uuid-from-step-2",
    "final_review_notes_status": "no_notes_needed"
  }'
```

---

## Support

For issues, check:
1. Backend logs: `npm run start`
2. Error messages in API responses
3. `.env` configuration
4. Database connectivity (Supabase)
5. LLM provider setup (Ollama/OpenAI)

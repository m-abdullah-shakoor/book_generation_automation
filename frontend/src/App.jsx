import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function App() {
  const [outlineFile, setOutlineFile] = useState(null);
  const [parsedOutline, setParsedOutline] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [outlineNotesBefore, setOutlineNotesBefore] = useState('');
  const [outlineNotesAfter, setOutlineNotesAfter] = useState('');
  const [statusOutlineNotes, setStatusOutlineNotes] = useState('no_notes_needed');
  const [outlineRecord, setOutlineRecord] = useState(null);
  const [chapterNotesStatus, setChapterNotesStatus] = useState({});
  const [chapterNotes, setChapterNotes] = useState({});
  const [chapterDrafts, setChapterDrafts] = useState({});
  const [chapterRecords, setChapterRecords] = useState({});
  const [finalReviewStatus, setFinalReviewStatus] = useState('no_notes_needed');
  const [finalReviewNotes, setFinalReviewNotes] = useState('');
  const [compiledFiles, setCompiledFiles] = useState(null);
  const [status, setStatus] = useState('Upload an Excel outline with "Chapter Title" and optional "Outline" columns.');

  const handleFileChange = (event) => {
    setOutlineFile(event.target.files?.[0] || null);
  };

  const uploadOutline = async () => {
    if (!outlineFile) return;
    setStatus('Uploading outline...');
    const formData = new FormData();
    formData.append('outline', outlineFile);

    try {
      const response = await axios.post(`${API_BASE}/api/outline/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setParsedOutline(response.data.outline);
      console.log('Parsed outline from backend:', response.data.outline);
      setBookTitle(response.data.outline.title || 'Untitled Book');
      setOutlineRecord(null);
      setChapterDrafts({});
      setChapterRecords({});
      setCompiledFiles(null);
      setStatus('Outline uploaded. Add notes and generate the outline.');
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to upload outline.');
    }
  };

  const generateOutline = async () => {
    if (!bookTitle || !outlineNotesBefore) {
      setStatus('Book title and notes before outline generation are required.');
      return;
    }

    setStatus('Generating outline draft...');
    try {
      const response = await axios.post(`${API_BASE}/api/outline/generate`, {
        title: bookTitle,
        notes_on_outline_before: outlineNotesBefore,
        notes_on_outline_after: outlineNotesAfter,
        outline: '', // If existing outline is provided, use it here
        status_outline_notes: statusOutlineNotes,
        chapters: parsedOutline?.chapters || [],
      });
      setOutlineRecord(response.data.outline);
      setStatus('Outline generated and stored for review.');
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to generate outline.');
    }
  };

  const regenerateOutline = async () => {
    if (!outlineRecord) {
      setStatus('Generate an outline first before regenerating.');
      return;
    }

    setStatus('Regenerating outline with editor notes...');
    try {
      const response = await axios.post(`${API_BASE}/api/outline/${outlineRecord.id}/regenerate`, {
        title: bookTitle,
        notes_on_outline_before: outlineNotesBefore,
        notes_on_outline_after: outlineNotesAfter,
        status_outline_notes: statusOutlineNotes,
        chapters: parsedOutline?.chapters || [],
      });
      setOutlineRecord(response.data.outline);
      setStatus('Outline regenerated.');
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to regenerate outline.');
    }
  };

  const generateChapter = async (chapter, index) => {
    if (!outlineRecord) {
      setStatus('Please generate an outline before generating chapters.');
      return;
    }

    const notesStatus = chapterNotesStatus[index] || 'no';
    setStatus(`Processing chapter ${index + 1} ...`);

    try {
      const response = await axios.post(`${API_BASE}/api/chapters/generate`, {
        outlineId: outlineRecord.id,
        chapter_index: index,
        title: chapter.title,
        outline: chapter.outline,
        chapter_notes_status: notesStatus,
        chapter_notes: chapterNotes[index] || '',
      });

      setChapterDrafts((prev) => ({ ...prev, [index]: response.data.chapter }));
      setChapterRecords((prev) => ({ ...prev, [index]: response.data.chapter }));
      setStatus(response.data.message || `Chapter ${index + 1} generated.`);
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to generate chapter.');
    }
  };

  const acceptChapter = async (index) => {
    const chapter = chapterRecords[index];
    if (!chapter?.id) {
      setStatus('Generate the chapter draft before accepting it.');
      return;
    }

    setStatus('Accepting chapter...');
    try {
      const response = await axios.post(`${API_BASE}/api/chapters/${chapter.id}/accept`);
      setChapterRecords((prev) => ({ ...prev, [index]: response.data.chapter }));
      setStatus(`Chapter ${index + 1} accepted.`);
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to accept chapter.');
    }
  };

  const compileFinal = async () => {
    if (!outlineRecord) {
      setStatus('Generate an outline record first.');
      return;
    }

    if (!finalReviewStatus || finalReviewStatus === 'no') {
      setStatus('Final review notes status must be set before compilation.');
      return;
    }

    setStatus('Compiling final book draft...');
    try {
      const response = await axios.post(`${API_BASE}/api/final/compile`, {
        outlineId: outlineRecord.id,
        final_review_notes_status: finalReviewStatus,
        final_review_notes: finalReviewNotes,
        output_format: 'txt',
      });
      setCompiledFiles(response.data.files);
      setStatus('Final draft compiled successfully.');
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to compile final book.');
    }
  };

  return (
    <div className="page-shell">
      <div className="container">
        <header>
          <h1>Book Generation Automation</h1>
          <p>A workflow-driven editor-in-the-loop book system with Supabase persistence.</p>
        </header>

        <section className="card">
          <h2>1. Input + Outline Stage</h2>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          <button onClick={uploadOutline} disabled={!outlineFile}>Upload Outline File</button>

          {parsedOutline && (
            <div className="outline-form">
              <label>
                Book Title
                <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} />
              </label>
              <label>
                Notes Before Outline
                <textarea value={outlineNotesBefore} onChange={(e) => setOutlineNotesBefore(e.target.value)} />
              </label>
              <label>
                Outline Status
                <select value={statusOutlineNotes} onChange={(e) => setStatusOutlineNotes(e.target.value)}>
                  <option value="yes">yes (wait for notes)</option>
                  <option value="no_notes_needed">no_notes_needed</option>
                  <option value="no">no</option>
                </select>
              </label>
              <label>
                Notes After Outline
                <textarea value={outlineNotesAfter} onChange={(e) => setOutlineNotesAfter(e.target.value)} />
              </label>
              <div className="button-row">
                <button onClick={generateOutline}>Generate Outline</button>
                <button onClick={regenerateOutline} disabled={!outlineRecord}>Regenerate Outline</button>
              </div>
            </div>
          )}
        </section>

        {outlineRecord && (
          <section className="card">
            <h2>Generated Outline</h2>
            <p><strong>Status:</strong> {outlineRecord.stage}</p>
            <div className="draft-box">
              <pre>{outlineRecord.outline}</pre>
            </div>
          </section>
        )}

        {parsedOutline && (
          <section className="card">
            <h2>2. Chapter Generation Stage</h2>
            <div className="chapter-list">
              {parsedOutline.chapters.map((chapter, index) => (
                <div key={`${chapter.title}-${index}`} className="chapter-item">
                  <div>
                    <strong>{chapter.title}</strong>
                    {chapter.outline && <p>{chapter.outline}</p>}
                    <label>
                      Chapter Notes Status
                      <select value={chapterNotesStatus[index] || 'no'} onChange={(e) => setChapterNotesStatus((prev) => ({ ...prev, [index]: e.target.value }))}>
                        <option value="yes">yes</option>
                        <option value="no_notes_needed">no_notes_needed</option>
                        <option value="no">no</option>
                      </select>
                    </label>
                    <label>
                      Chapter Notes
                      <textarea value={chapterNotes[index] || ''} onChange={(e) => setChapterNotes((prev) => ({ ...prev, [index]: e.target.value }))} />
                    </label>
                  </div>
                  <div className="chapter-actions">
                    <button onClick={() => generateChapter(chapter, index)}>Generate Chapter</button>
                    {chapterRecords[index]?.id && (
                      <button onClick={() => acceptChapter(index)}>Accept</button>
                    )}
                  </div>
                  {chapterDrafts[index] && (
                    <div className="draft-box">
                      <pre>{chapterDrafts[index].draft}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <h2>3. Final Compilation Stage</h2>
          <label>
            Final Review Notes Status
            <select value={finalReviewStatus} onChange={(e) => setFinalReviewStatus(e.target.value)}>
              <option value="yes">yes</option>
              <option value="no_notes_needed">no_notes_needed</option>
              <option value="no">no</option>
            </select>
          </label>
          <label>
            Final Review Notes
            <textarea value={finalReviewNotes} onChange={(e) => setFinalReviewNotes(e.target.value)} />
          </label>
          <button onClick={compileFinal}>Compile Final Draft</button>
          {compiledFiles && (
            <div className="sources">
              <p>Compiled files generated:</p>
              <pre>{JSON.stringify(compiledFiles, null, 2)}</pre>
            </div>
          )}
        </section>

        <p className="status">{status}</p>
      </div>
    </div>
  );
}

export default App;

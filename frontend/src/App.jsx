import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5173';

function App() {
  const [outlineFile, setOutlineFile] = useState(null);
  const [outline, setOutline] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [accepted, setAccepted] = useState({});
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
      const response = await axios.post(`${API_BASE}/api/upload-outline`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setOutline(response.data.outline);
      setSelectedChapter(null);
      setDrafts({});
      setStatus('Outline loaded. Select a chapter to generate a draft.');
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to upload outline.');
    }
  };

  const generateChapter = async (chapter) => {
    setStatus(`Generating chapter draft for "${chapter.title}"...`);
    setSelectedChapter(chapter);
    try {
      const response = await axios.post(`${API_BASE}/api/generate-chapter`, {
        title: chapter.title,
        outline: chapter.outline,
      });
      setDrafts((prev) => ({ ...prev, [chapter.title]: response.data.chapter }));
      setStatus(`Draft generated for "${chapter.title}".`);
    } catch (error) {
      console.error(error);
      setStatus(error.response?.data?.error || 'Failed to generate chapter.');
    }
  };

  const acceptDraft = (chapterTitle) => {
    if (!drafts[chapterTitle]) {
      return;
    }
    setAccepted((prev) => ({ ...prev, [chapterTitle]: drafts[chapterTitle] }));
    setStatus(`Draft accepted for "${chapterTitle}".`);
  };

  const acceptedChapters = Object.entries(accepted).map(([title, data]) => ({ title, ...data }));

  const downloadAccepted = () => {
    const content = acceptedChapters
      .map((chapter) => `# ${chapter.title}\n\n${chapter.draft}`)
      .join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'book_chapters.md';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-shell">
      <div className="container">
        <header>
          <h1>Book Generation Automation</h1>
          <p>Upload an outline, review chapter drafts, and keep the human in the loop.</p>
        </header>

        <section className="card">
          <h2>1. Upload Excel Outline</h2>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          <button onClick={uploadOutline} disabled={!outlineFile}>Upload Outline</button>
          <p className="status">{status}</p>
        </section>

        {outline && (
          <section className="card">
            <h2>2. Chapter Outline</h2>
            <p>{outline.bookTitle}</p>
            <div className="chapter-list">
              {outline.chapters.map((chapter, index) => (
                <div key={`${chapter.title}-${index}`} className="chapter-item">
                  <div>
                    <strong>{chapter.title}</strong>
                    {chapter.outline && <p>{chapter.outline}</p>}
                  </div>
                  <button onClick={() => generateChapter(chapter)}>
                    Generate Draft
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {selectedChapter && drafts[selectedChapter.title] && (
          <section className="card">
            <h2>3. Review Draft</h2>
            <h3>{selectedChapter.title}</h3>
            <div className="draft-box">
              <pre>{drafts[selectedChapter.title].draft}</pre>
            </div>
            <button onClick={() => acceptDraft(selectedChapter.title)}>
              Accept Draft
            </button>
            <div className="sources">
              <h4>Sources</h4>
              {drafts[selectedChapter.title].sources.map((source, index) => (
                <div key={index} className="source-item">
                  <a href={source.link} target="_blank" rel="noreferrer">{source.title}</a>
                  <p>{source.snippet}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {acceptedChapters.length > 0 && (
          <section className="card">
            <h2>4. Download Accepted Chapters</h2>
            <button onClick={downloadAccepted}>Download Markdown</button>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;

const axios = require('axios');
const { OLLAMA_URL, OLLAMA_MODEL } = require('../config');

// 🔧 Convert messages → single prompt (IMPORTANT)
function buildPrompt(messages) {
  return messages
    .map((msg) => {
      if (msg.role === 'system') return `SYSTEM:\n${msg.content}`;
      if (msg.role === 'user') return `USER:\n${msg.content}`;
      if (msg.role === 'assistant') return `ASSISTANT:\n${msg.content}`;
      return msg.content;
    })
    .join('\n\n');
}

async function createCompletion(messages, temperature = 0.7) {
  const prompt = buildPrompt(messages);

  const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
    model: OLLAMA_MODEL || 'llama3',
    prompt,
    stream: false,
    options: {
      temperature,
    },
  });

  return response.data.response?.trim() || '';
}



async function generateOutlineDraft({ title, notesBefore, notesAfter, chapterTemplates = [] }) {
  const chapterSchema = chapterTemplates
    .map((chapter, index) => `Chapter ${index + 1}: ${chapter.title}`)
    .join('\n');

  const messages = [
    {
      role: 'system',
      content: 'You are a book production assistant. Generate a structured outline with chapters.',
    },
    {
      role: 'user',
      content: `
Book Title: ${title}

Editor Notes Before:
${notesBefore}

Existing Chapters:
${chapterSchema || 'None'}

Generate a clean outline with chapters and short descriptions.
      `,
    },
  ];

  if (notesAfter) {
    messages.push({
      role: 'user',
      content: `Refine the outline using these notes: ${notesAfter}`,
    });
  }

  return createCompletion(messages);
}


async function generateChapterDraft({
  bookTitle,
  chapterTitle,
  previousContext,
  chapterNotes,
}) {
  const messages = [
    {
      role: 'system',
      content: 'You are a professional book writer.',
    },
    {
      role: 'user',
      content: `
Book: ${bookTitle}
Chapter: ${chapterTitle}

Previous Context:
${previousContext || 'None'}

Editor Notes:
${chapterNotes || 'None'}

Write a detailed chapter with sections.
      `,
    },
  ];

  return createCompletion(messages);
}


async function summarizeChapterContent({ chapterTitle, chapterDraft }) {
  const messages = [
    {
      role: 'user',
      content: `
Summarize this chapter in 120 words:

Title: ${chapterTitle}

${chapterDraft}
      `,
    },
  ];

  return createCompletion(messages, 0.5);
}


module.exports = {
  generateOutlineDraft,
  generateChapterDraft,
  summarizeChapterContent,
};
const { getOutlineById } = require('../models/outlineModel');
const { createChapter, updateChapter, getPreviousSummaries, getChaptersByOutline, getChapterByOutlineAndIndex, getChapterById } = require('../models/chapterModel');
const { generateChapterDraft, summarizeChapterContent } = require('../services/llmService');
const { searchWeb, buildSourceContext } = require('../services/searchService');
const { sendNotification } = require('../services/notificationService');

async function generateChapter(req, res) {
  try {
    const {
      outlineId,
      chapter_index,
      title,
      outline: chapterOutline,
      chapter_notes_status,
      chapter_notes,
    } = req.body;

    if (!outlineId || chapter_index == null || !title) {
      return res.status(400).json({ error: 'outlineId, chapter_index, and title are required.' });
    }

    const bookOutline = await getOutlineById(outlineId);
    if (!bookOutline) {
      return res.status(404).json({ error: 'Outline record not found.' });
    }

    if (!chapter_notes_status || chapter_notes_status === 'no') {
      const chapterRecord = await createChapter({
        outline_id: outlineId,
        chapter_index,
        title,
        outline: chapterOutline || '',
        chapter_notes_status: chapter_notes_status || 'no',
        chapter_notes: chapter_notes || '',
        status: 'paused',
      });
      await sendNotification('chapter-paused', { outlineId, chapter_index, title });
      return res.status(202).json({
        chapter: chapterRecord,
        status: 'paused',
        message: 'Chapter paused. chapter_notes_status must be set to "yes" or "no_notes_needed" to proceed.',
      });
    }

    if (chapter_notes_status === 'yes') {
      if (!chapter_notes || !chapter_notes.trim()) {
        const chapterRecord = await createChapter({
          outline_id: outlineId,
          chapter_index,
          title,
          outline: chapterOutline || '',
          chapter_notes_status: 'yes',
          chapter_notes: chapter_notes || '',
          status: 'awaiting_notes',
        });
        await sendNotification('chapter-awaiting-notes', { outlineId, chapter_index, title });
        return res.status(202).json({
          chapter: chapterRecord,
          status: 'awaiting_notes',
          message: 'Waiting for chapter_notes from editor (chapter_notes_status=yes).',
        });
      }

      const previousSummaries = await getPreviousSummaries(outlineId, chapter_index);
      const previousContext = previousSummaries.join('\n\n');
      const searchResults = await searchWeb(title);
      const sourceContext = buildSourceContext(searchResults);
      const draft = await generateChapterDraft({
        bookTitle: bookOutline.title,
        chapterTitle: title,
        chapterOutline: chapterOutline || '',
        previousContext,
        chapterNotes: chapter_notes.trim(),
        sourceContext,
      });
      const summary = await summarizeChapterContent({ chapterTitle: title, chapterDraft: draft });

      const chapterData = {
        outline_id: outlineId,
        chapter_index,
        title,
        outline: chapterOutline || '',
        chapter_notes_status: 'yes',
        chapter_notes: chapter_notes.trim(),
        draft,
        summary,
        source_context: sourceContext,
        status: 'review_pending',
      };

      const result = await createChapter(chapterData);
      await sendNotification('chapter-ready-for-review', { outlineId, chapter_index, title });
      return res.json({ chapter: result, status: 'review_pending' });
    }

    if (chapter_notes_status === 'no_notes_needed') {
      const previousSummaries = await getPreviousSummaries(outlineId, chapter_index);
      const previousContext = previousSummaries.join('\n\n');
      const searchResults = await searchWeb(title);
      const sourceContext = buildSourceContext(searchResults);
      const draft = await generateChapterDraft({
        bookTitle: bookOutline.title,
        chapterTitle: title,
        chapterOutline: chapterOutline || '',
        previousContext,
        chapterNotes: chapter_notes || '',
        sourceContext,
      });
      const summary = await summarizeChapterContent({ chapterTitle: title, chapterDraft: draft });

      const chapterData = {
        outline_id: outlineId,
        chapter_index,
        title,
        outline: chapterOutline || '',
        chapter_notes_status: 'no_notes_needed',
        chapter_notes: chapter_notes || '',
        draft,
        summary,
        source_context: sourceContext,
        status: 'review_pending',
      };

      const result = await createChapter(chapterData);
      await sendNotification('chapter-ready-for-review', { outlineId, chapter_index, title });
      return res.json({ chapter: result, status: 'review_pending' });
    }

    res.status(400).json({ error: 'Invalid chapter_notes_status. Use "yes", "no", or "no_notes_needed".' });
  } catch (error) {
    console.error(error);
    await sendNotification('chapter-error', { message: error.message });
    res.status(500).json({ error: error.message || 'Chapter generation failed.' });
  }
}

async function acceptChapter(req, res) {
  try {
    const { chapterId } = req.params;
    const chapter = await getChapterById(chapterId);
    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found.' });
    }

    const updated = await updateChapter(chapterId, { status: 'accepted' });
    await sendNotification('chapter-accepted', { chapterId, outlineId: chapter.outline_id, title: chapter.title });
    res.json({ chapter: updated, message: 'Chapter accepted and ready for compilation.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to accept chapter.' });
  }
}

module.exports = {
  generateChapter,
  acceptChapter,
};

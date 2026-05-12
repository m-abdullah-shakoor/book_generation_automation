const fs = require('fs');
const path = require('path');
const { parseBookOutlineFile } = require('../utils/excelParser');
const { generateOutlineDraft } = require('../services/llmService');
const { createOutline, updateOutline, getOutlineById } = require('../models/outlineModel');
const { sendNotification } = require('../services/notificationService');

async function uploadOutline(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Outline file is required.' });
    }

    const buffer = fs.readFileSync(req.file.path);
    const outlineData = parseBookOutlineFile(buffer);
    fs.unlinkSync(req.file.path);

    res.json({ outline: outlineData });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Upload failed.' });
  }
}

async function generateOutline(req, res) {
  try {
    const {
      title,
      notes_on_outline_before,
      notes_on_outline_after,
      outline: providedOutline,
      status_outline_notes,
      chapters = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Book title is required.' });
    }

    if (providedOutline && providedOutline.trim()) {
      const stage = status_outline_notes === 'yes'
        ? 'awaiting_outline_notes'
        : status_outline_notes === 'no_notes_needed'
          ? 'outline_ready'
          : 'outline_paused';

      const outlineRecord = await createOutline({
        title,
        notes_on_outline_before: notes_on_outline_before || '',
        notes_on_outline_after: notes_on_outline_after || '',
        status_outline_notes: status_outline_notes || 'no_notes_needed',
        outline: providedOutline.trim(),
        chapter_templates: chapters,
        stage,
        source: 'provided',
      });

      const event = stage === 'awaiting_outline_notes' ? 'outline-awaiting-notes' : 'outline-ready-for-review';
      await sendNotification(event, { outlineId: outlineRecord.id, title, stage });

      return res.json({ outline: outlineRecord, message: 'Outline from Excel accepted.' });
    }

    if (!notes_on_outline_before || !notes_on_outline_before.trim()) {
      const outlineRecord = await createOutline({
        title,
        notes_on_outline_before: '',
        notes_on_outline_after: notes_on_outline_after || '',
        status_outline_notes: status_outline_notes || 'no',
        outline: '',
        chapter_templates: chapters,
        stage: 'outline_paused',
        source: 'user_input',
      });
      await sendNotification('outline-paused', {
        outlineId: outlineRecord.id,
        reason: 'Missing notes_on_outline_before. Cannot generate outline without editorial guidance.',
      });
      return res.status(202).json({
        outline: outlineRecord,
        message: 'Outline paused. notes_on_outline_before is required to generate outline.',
      });
    }

    const draft = await generateOutlineDraft({
      title,
      notesBefore: notes_on_outline_before.trim(),
      notesAfter: notes_on_outline_after || '',
      chapterTemplates: chapters,
    });

    const stage = status_outline_notes === 'yes'
      ? 'awaiting_outline_notes'
      : status_outline_notes === 'no_notes_needed'
        ? 'outline_ready'
        : 'outline_paused';

    const outlineRecord = await createOutline({
      title,
      notes_on_outline_before: notes_on_outline_before.trim(),
      notes_on_outline_after: notes_on_outline_after || '',
      status_outline_notes: status_outline_notes || 'no',
      outline: draft,
      chapter_templates: chapters,
      stage,
      source: 'generated',
    });

    const event = stage === 'awaiting_outline_notes' ? 'outline-awaiting-notes' : 'outline-ready-for-review';
    await sendNotification(event, { outlineId: outlineRecord.id, title, stage });

    res.json({ outline: outlineRecord });
  } catch (error) {
    console.error(error);
    await sendNotification('outline-error', { message: error.message });
    res.status(500).json({ error: error.message || 'Outline generation failed.' });
  }
}


async function regenerateOutline(req, res) {
  try {
    const { outlineId } = req.params;
    const {
      notes_on_outline_before,
      notes_on_outline_after,
      status_outline_notes,
      chapters = [],
    } = req.body;

    const existing = await getOutlineById(outlineId);
    if (!existing) {
      return res.status(404).json({ error: 'Outline record not found.' });
    }

    const notesBeforeToUse = notes_on_outline_before?.trim() || existing.notes_on_outline_before;
    if (!notesBeforeToUse) {
      await sendNotification('outline-error', {
        outlineId,
        message: 'Cannot regenerate outline without notes_on_outline_before.',
      });
      return res.status(400).json({
        error: 'notes_on_outline_before is required to regenerate outline.',
      });
    }

    const draft = await generateOutlineDraft({
      title: existing.title,
      notesBefore: notesBeforeToUse,
      notesAfter: notes_on_outline_after || existing.notes_on_outline_after,
      chapterTemplates: chapters.length ? chapters : existing.chapter_templates || [],
    });

    const stage = status_outline_notes === 'yes'
      ? 'awaiting_outline_notes'
      : status_outline_notes === 'no_notes_needed'
        ? 'outline_ready'
        : status_outline_notes === 'no'
          ? 'outline_paused'
          : existing.stage;

    const updated = await updateOutline(outlineId, {
      outline: draft,
      notes_on_outline_before: notesBeforeToUse,
      notes_on_outline_after: notes_on_outline_after || existing.notes_on_outline_after,
      status_outline_notes: status_outline_notes || existing.status_outline_notes,
      chapter_templates: chapters.length ? chapters : existing.chapter_templates || [],
      stage,
    });

    await sendNotification('outline-regenerated', { outlineId, stage });
    res.json({ outline: updated });
  } catch (error) {
    console.error(error);
    await sendNotification('outline-error', { message: error.message });
    res.status(500).json({ error: error.message || 'Outline regeneration failed.' });
  }
}

async function getOutline(req, res) {
  try {
    const { outlineId } = req.params;
    const outline = await getOutlineById(outlineId);
    res.json({ outline });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch outline.' });
  }
}

module.exports = {
  uploadOutline,
  generateOutline,
  regenerateOutline,
  getOutline,
};

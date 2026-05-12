const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { getOutlineById } = require('../models/outlineModel');
const { getChaptersByOutline } = require('../models/chapterModel');
const { createFinalDraft } = require('../models/finalModel');
const { sendNotification } = require('../services/notificationService');

async function compileFinal(req, res) {
  try {
    const {
      outlineId,
      final_review_notes_status,
      final_review_notes,
      output_format = 'txt',
    } = req.body;

    if (!outlineId) {
      return res.status(400).json({ error: 'outlineId is required.' });
    }

    if (!final_review_notes_status || final_review_notes_status === 'no') {
      await sendNotification('final-pause', { outlineId, reason: 'Final review notes status not ready.' });
      return res.status(202).json({ status: 'paused', message: 'Final compilation paused until review status is confirmed.' });
    }

    const outline = await getOutlineById(outlineId);
    if (!outline) {
      return res.status(404).json({ error: 'Outline record not found.' });
    }

    const chapters = await getChaptersByOutline(outlineId);
    const acceptedChapters = chapters.filter((chapter) => chapter.status === 'accepted' || chapter.status === 'review_pending');
    if (acceptedChapters.length === 0) {
      return res.status(400).json({ error: 'No chapters available for final compilation.' });
    }

    const compiledText = acceptedChapters
      .map((chapter) => `# ${chapter.title}\n\n${chapter.draft || ''}`)
      .join('\n\n---\n\n');

    const exportDir = path.resolve(__dirname, '../../exports');
    fs.mkdirSync(exportDir, { recursive: true });

    const fileBase = `book_${outlineId}_${Date.now()}`;
    const txtPath = path.join(exportDir, `${fileBase}.txt`);
    fs.writeFileSync(txtPath, compiledText, 'utf8');

    let docxPath = null;
    if (output_format === 'docx') {
      const doc = new Document({
        sections: [
          {
            children: acceptedChapters.flatMap((chapter) => [
              new Paragraph({ text: chapter.title, heading: 'Heading1' }),
              new Paragraph({ text: chapter.draft || '' }),
              new Paragraph({ text: '' }),
            ]),
          },
        ],
      });
      const buffer = await Packer.toBuffer(doc);
      docxPath = path.join(exportDir, `${fileBase}.docx`);
      fs.writeFileSync(docxPath, buffer);
    }

    const finalRecord = await createFinalDraft({
      outline_id: outlineId,
      final_review_notes_status,
      final_review_notes: final_review_notes || '',
      book_output_status: 'ready',
      exported_txt_path: txtPath,
      exported_docx_path: docxPath,
      compiled_at: new Date().toISOString(),
    });

    await sendNotification('final-draft-compiled', {
      outlineId,
      output_format,
      files: { txtPath, docxPath },
    });

    res.json({ final: finalRecord, files: { txtPath, docxPath } });
  } catch (error) {
    console.error(error);
    await sendNotification('final-error', { message: error.message });
    res.status(500).json({ error: error.message || 'Final compilation failed.' });
  }
}

module.exports = {
  compileFinal,
};

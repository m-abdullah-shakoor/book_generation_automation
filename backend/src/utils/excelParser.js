const XLSX = require('xlsx');

function parseBookOutlineFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Excel file contains no sheets.');
  }

  const sheet = workbook.Sheets[sheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (raw.length === 0) {
    throw new Error('Excel file has no data rows.');
  }

  const firstRow = raw[0];
  const hasBookLevelData = firstRow.title || firstRow.book_title;

  if (hasBookLevelData) {
    const title = firstRow.title || firstRow.book_title || '';
    const notes_on_outline_before = firstRow.notes_on_outline_before || firstRow.notes_before || '';
    const outline = firstRow.outline || '';
    const notes_on_outline_after = firstRow.notes_on_outline_after || firstRow.notes_after || '';
    const status_outline_notes = firstRow.status_outline_notes || 'no';

    const chapters = raw.slice(1).map((row, index) => {
      const chapterTitle = row.chapter_title || row['Chapter Title'] || row.title || row.Title || '';
      const chapterOutline = row.chapter_outline || row['Chapter Outline'] || row.outline || '';
      if (!chapterTitle) {
        throw new Error(`Missing chapter title in row ${index + 3}. Use header 'chapter_title' or 'Chapter Title'.`);
      }
      return {
        chapter_index: index,
        title: String(chapterTitle).trim(),
        outline: String(chapterOutline).trim(),
        chapter_notes_status: 'no',
        chapter_notes: '',
      };
    });

    return {
      type: 'book_outline',
      title: String(title).trim(),
      notes_on_outline_before: String(notes_on_outline_before).trim(),
      outline: String(outline).trim(),
      notes_on_outline_after: String(notes_on_outline_after).trim(),
      status_outline_notes: status_outline_notes || 'no',
      chapters,
    };
  } else {
    const chapters = raw.map((row, index) => {
      const chapterTitle = row.chapter_title || row['Chapter Title'] || row.title || row.Title || '';
      const chapterOutline = row.chapter_outline || row['Chapter Outline'] || row.outline || '';
      if (!chapterTitle) {
        throw new Error(`Missing chapter title in row ${index + 2}. Use header 'chapter_title' or 'Chapter Title'.`);
      }
      return {
        chapter_index: index,
        title: String(chapterTitle).trim(),
        outline: String(chapterOutline).trim(),
        chapter_notes_status: 'no',
        chapter_notes: '',
      };
    });

    return {
      type: 'chapters_only',
      chapters,
    };
  }
}

module.exports = { parseBookOutlineFile };


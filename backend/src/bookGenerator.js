const XLSX = require('xlsx');

function parseOutlineFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Excel file contains no sheets.');
  }

  const sheet = workbook.Sheets[sheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const chapters = raw.map((row, index) => {
    const title = row['Chapter Title'] || row['Title'] || row['chapter_title'] || row['title'] || row['chapter'] || row['Chapter'];
    const outline = row['Outline'] || row['outline'] || row['Chapter Outline'] || row['chapter_outline'] || '';
    if (!title) {
      throw new Error(`Missing chapter title in row ${index + 2}. Use a header named "Chapter Title" or "Title".`);
    }
    return { title: String(title).trim(), outline: String(outline).trim() };
  });

  return {
    bookTitle: sheet['!ref'] ? `Book outline` : 'Book Outline',
    chapters,
  };
}

module.exports = { parseOutlineFile };

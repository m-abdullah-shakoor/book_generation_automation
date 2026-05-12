require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { parseOutlineFile } = require('./bookGenerator');
const { searchWeb, buildChapterDraft } = require('./serpService');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 4000;
const serpApiKey = process.env.SERP_API_KEY;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.post('/api/upload-outline', upload.single('outline'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Outline file is required.' });
    }

    const buffer = fs.readFileSync(req.file.path);
    const outlineData = parseOutlineFile(buffer);
    fs.unlinkSync(req.file.path);

    res.json({ outline: outlineData });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Upload failed.' });
  }
});

app.post('/api/generate-chapter', async (req, res) => {
  try {
    const { title, outline } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Chapter title is required.' });
    }
    if (!serpApiKey) {
      return res.status(500).json({ error: 'SERP_API_KEY is not configured in environment.' });
    }

    const searchResults = await searchWeb(title, serpApiKey);
    const chapter = buildChapterDraft(title, outline || '', searchResults);

    res.json({ chapter });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Chapter generation failed.' });
  }
});

app.listen(port, () => {
  console.log(`Book Generation Automation backend running on http://localhost:${port}`);
});

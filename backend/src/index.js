require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const apiRouter = require('./routes/api');

const app = express();
const port = process.env.PORT || 4000;
const exportDir = path.resolve(__dirname, '../exports');

fs.mkdirSync(exportDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Book Generation Automation backend running on http://localhost:${port}`);
});

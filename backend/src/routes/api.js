const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const outlineController = require('../controllers/outlineController');
const chapterController = require('../controllers/chapterController');
const finalController = require('../controllers/finalController');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));
router.post('/outline/upload', upload.single('outline'), outlineController.uploadOutline);
router.post('/outline/generate', outlineController.generateOutline);
router.post('/outline/:outlineId/regenerate', outlineController.regenerateOutline);
router.get('/outline/:outlineId', outlineController.getOutline);

router.post('/chapters/generate', chapterController.generateChapter);
router.post('/chapters/:chapterId/accept', chapterController.acceptChapter);

router.post('/final/compile', finalController.compileFinal);

module.exports = router;

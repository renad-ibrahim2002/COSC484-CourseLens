const multer = require('multer');
const env = require('../config/env');
const { HttpError } = require('../utils/http');

const ALLOWED = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/**
 * Detects the real format from the file's first bytes ("magic numbers") instead of trusting the
 * file name or the browser's Content-Type, so a renamed executable is rejected.
 */
function detectFormat(buf) {
  if (!buf || buf.length < 8) return null;
  if (buf.slice(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // DOCX is a ZIP archive whose entries include word/document.xml and [Content_Types].xml.
    const head = buf.toString('latin1');
    if (head.includes('word/') && head.includes('[Content_Types].xml')) return 'docx';
  }
  return null;
}

/** Rough page count for PDFs, used for the "PDF · 4 pages" detail. */
function countPdfPages(buf) {
  const matches = buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g);
  return matches ? matches.length : undefined;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1, fields: 20 },
});

/** Runs after multer: verifies the file's content and annotates req.file.format. */
function checkFile(req, _res, next) {
  if (!req.file) return next();
  const format = detectFormat(req.file.buffer);
  if (!format) {
    return next(new HttpError(415, 'Only PDF, PNG, JPG or DOCX files are allowed'));
  }
  req.file.format = format;
  req.file.mimetype = ALLOWED[format];
  if (format === 'pdf') req.file.pages = countPdfPages(req.file.buffer);
  return next();
}

module.exports = { upload, checkFile, detectFormat, countPdfPages, ALLOWED };

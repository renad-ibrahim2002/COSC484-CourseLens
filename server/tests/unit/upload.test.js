const { detectFormat, countPdfPages } = require('../../src/middleware/upload');
const { makePdf, makeDocx, makePng } = require('../../src/seed/files');

describe('file type detection by content', () => {
  test('recognises real PDF, DOCX and PNG files', () => {
    expect(detectFormat(makePdf('x', 2))).toBe('pdf');
    expect(detectFormat(makeDocx('x'))).toBe('docx');
    expect(detectFormat(makePng(20, 20))).toBe('png');
    expect(detectFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0]))).toBe('jpg');
  });

  test('rejects executables and scripts even if renamed', () => {
    expect(detectFormat(Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00', 'latin1'))).toBeNull();
    expect(detectFormat(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(detectFormat(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]))).toBeNull(); // plain zip
    expect(detectFormat(Buffer.alloc(3))).toBeNull();
  });

  test('counts PDF pages', () => {
    expect(countPdfPages(makePdf('x', 4))).toBe(4);
  });
});

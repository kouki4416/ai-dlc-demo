import { InvalidFilenameError, sanitizeFilename } from '../sanitize-filename';

describe('sanitizeFilename', () => {
  it('passes through a normal filename', () => {
    expect(sanitizeFilename('photo.png')).toBe('photo.png');
  });

  it('lowercases the extension and accepts uppercase', () => {
    expect(sanitizeFilename('Image.PNG')).toBe('Image.png');
  });

  it('strips path separators', () => {
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('..');
    expect(sanitizeFilename('../../etc/passwd')).not.toContain('/');
  });

  it('replaces forbidden characters with underscore', () => {
    expect(sanitizeFilename('a<b>c:d.png')).toBe('a_b_c_d.png');
  });

  it('replaces whitespace with underscore', () => {
    expect(sanitizeFilename('my file name.png')).toBe('my_file_name.png');
  });

  it('truncates very long basenames to MAX_BASENAME_LENGTH', () => {
    const long = 'a'.repeat(200) + '.jpg';
    const result = sanitizeFilename(long);
    expect(result.endsWith('.jpg')).toBe(true);
    // 80 chars + '.jpg'
    expect(result.length).toBeLessThanOrEqual(80 + 4);
  });

  it('strips disallowed extension', () => {
    expect(sanitizeFilename('script.exe.really_long_extension')).not.toMatch(
      /\.really_long_extension$/,
    );
  });

  it('rejects empty input', () => {
    expect(() => sanitizeFilename('')).toThrow(InvalidFilenameError);
    expect(() => sanitizeFilename('   ')).toThrow(InvalidFilenameError);
  });

  it('rejects non-string input', () => {
    expect(() => sanitizeFilename(undefined as unknown as string)).toThrow(InvalidFilenameError);
  });

  it('escapes Windows-reserved names', () => {
    expect(sanitizeFilename('CON.txt')).toBe('_CON.txt');
    expect(sanitizeFilename('lpt1.png')).toBe('_lpt1.png');
  });
});

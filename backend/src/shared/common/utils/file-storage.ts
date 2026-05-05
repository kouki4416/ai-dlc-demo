import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { sanitizeFilename } from './sanitize-filename';

export interface SavedAttachment {
  storedPath: string;
  filename: string;
  sizeBytes: number;
}

export interface AttachmentInput {
  buffer: Buffer;
  originalFilename: string;
  ideaId: string;
}

/**
 * Persists an upload buffer under `<uploadDir>/<ideaId>/<random>-<safeFilename>`
 * and returns the relative stored path (DB column `storedPath`).
 */
export async function saveAttachment(
  input: AttachmentInput,
  uploadDir: string,
): Promise<SavedAttachment> {
  const baseDir = resolve(uploadDir);
  const ideaDir = join(baseDir, input.ideaId);
  await mkdir(ideaDir, { recursive: true });

  const safeName = sanitizeFilename(input.originalFilename);
  const prefix = randomBytes(8).toString('hex');
  const filename = `${prefix}-${safeName}`;
  const absolute = join(ideaDir, filename);

  // Defense-in-depth: ensure the resolved path stays inside ideaDir.
  if (!absolute.startsWith(ideaDir + (ideaDir.endsWith('/') ? '' : '/'))) {
    throw new Error('Path traversal detected');
  }

  await writeFile(absolute, input.buffer, { flag: 'wx' });

  return {
    storedPath: `${input.ideaId}/${filename}`,
    filename,
    sizeBytes: input.buffer.length,
  };
}

/**
 * POST /api/tend/blob/ { base64 } → { sha, size }. One image per request.
 * At most 4MB decoded, and it must be a JPEG or WebP by its magic bytes
 * (tend-spec, Security 4), carrying no EXIF segment or chunk (review L5).
 * The client re-encodes on a canvas first, so no EXIF should reach here;
 * this is the second guard against GPS, not the first.
 */
import type { APIRoute } from 'astro';
import { guard } from '../../../lib/tend/auth';
import { Refused, fail, json, readJson, refuse } from '../../../lib/tend/http';
import { store } from '../../../lib/tend/store';

export const prerender = false;

const MAX = 4 * 1024 * 1024;

const isJpeg = (b: Buffer) => b.length >= 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isWebp = (b: Buffer) => b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP';

/** Walk the JPEG's segments up to the scan: an APP1 that starts "Exif\0\0" means metadata survived (review L5). */
function jpegHasExif(b: Buffer): boolean {
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return false; // not a marker: a broken file, but not EXIF
    const marker = b[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return false; // end of image / start of scan
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2; // RSTn: no length
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    if (marker === 0xe1 && b.toString('latin1', i + 4, i + 10) === 'Exif\0\0') return true;
    if (len < 2) return false;
    i += 2 + len;
  }
  return false;
}

/** Walk the RIFF chunks: an EXIF chunk means metadata survived. */
function webpHasExif(b: Buffer): boolean {
  let i = 12;
  while (i + 8 <= b.length) {
    const fourcc = b.toString('latin1', i, i + 4);
    const size = b.readUInt32LE(i + 4);
    if (fourcc === 'EXIF') return true;
    i += 8 + size + (size % 2); // chunks are padded to even sizes
  }
  return false;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    guard(request);
    const { base64 } = await readJson(request, Math.ceil((MAX * 4) / 3) + 1024);
    if (typeof base64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Refused(400);
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length === 0 || bytes.length > MAX) throw new Refused(413);
    if (!isJpeg(bytes) && !isWebp(bytes)) throw new Refused(415);
    if ((isJpeg(bytes) && jpegHasExif(bytes)) || (isWebp(bytes) && webpHasExif(bytes))) throw new Refused(415);
    const { sha } = await store().blob(bytes);
    return json({ sha, size: bytes.length });
  } catch (e) {
    return refuse('blob', e);
  }
};

export const ALL: APIRoute = () => fail(405);

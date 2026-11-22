// news-image-20261121 — "Sum up 21 November's world news in one image."
//
// The entry image is entry.png beside this file. This program copies it to
// the output directory — /output in the grader's container, or the directory
// named by MAKEFUN_OUTPUT_DIR when run elsewhere — and then verifies the
// copy: the SHA-256 of the written file must match the source, and the
// image's format and pixel dimensions are read back from its header and
// printed. Any mismatch or unreadable header exits non-zero.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22, standard library only.

import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourcePath = new URL('./entry.png', import.meta.url);
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const destination = join(outputDir, 'entry.png');

mkdirSync(outputDir, { recursive: true });
copyFileSync(sourcePath, destination);

const sourceBytes = readFileSync(sourcePath);
const copiedBytes = readFileSync(destination);

const sha256 = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

const sourceHash = sha256(sourceBytes);
const copiedHash = sha256(copiedBytes);

if (sourceHash !== copiedHash) {
  console.error(
    `verification failed: sha256 mismatch\n  source: ${sourceHash}\n  copy:   ${copiedHash}`,
  );
  process.exit(1);
}

// Read the format and dimensions straight from the image header, so the
// check works for the PNG and JPEG encodings the gate accepts.
function imageInfo(bytes: Buffer): { format: string; width: number; height: number } {
  // PNG: 8-byte signature, then the IHDR chunk with big-endian dimensions.
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, i) => bytes[i] === byte)) {
    return {
      format: 'PNG',
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  // JPEG: SOI marker, then a walk over segments to the first Start Of Frame.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isStartOfFrame) {
        return {
          format: 'JPEG',
          height: bytes.readUInt16BE(offset + 5),
          width: bytes.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + bytes.readUInt16BE(offset + 2);
    }
  }
  throw new Error('unrecognized image format (expected PNG or JPEG)');
}

const info = imageInfo(copiedBytes);

console.log(`copied entry.png -> ${destination}`);
console.log(`sha256: ${copiedHash}`);
console.log('sha256 match: yes');
console.log(`format: ${info.format}`);
console.log(`dimensions: ${info.width}x${info.height}`);
console.log(`bytes: ${copiedBytes.length}`);

const fs = require('fs');
const zlib = require('zlib');

function createPng(width, height) {
  // Generate RGBA buffer
  const scanlines = [];
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.46;
  const rInner = width * 0.28;

  for (let y = 0; y < height; y++) {
    const row = [0]; // Filter byte: 0 = None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Squircle distance check: (|dx|/r)^4 + (|dy|/r)^4 <= 1
      const squircle = Math.pow(Math.abs(dx) / (width * 0.44), 4) + Math.pow(Math.abs(dy) / (height * 0.44), 4);

      if (squircle <= 1.0) {
        // Linear gradient from Indigo (79, 70, 229) to Violet (124, 58, 237)
        const t = (x + y) / (width + height);
        let red = Math.round(79 + t * (124 - 79));
        let green = Math.round(70 + t * (58 - 70));
        let blue = Math.round(229 + t * (237 - 229));
        let alpha = 255;

        // Circle stroke
        if (Math.abs(dist - width * 0.30) < width * 0.02) {
          red = 255; green = 255; blue = 255;
        }

        // Inner currency crossbars & glyph
        const inHBar1 = Math.abs(y - height * 0.39) < width * 0.025 && Math.abs(x - cx) < width * 0.16;
        const inHBar2 = Math.abs(y - height * 0.47) < width * 0.022 && Math.abs(x - cx) < width * 0.13;
        const inVertBar = Math.abs(x - (cx - width * 0.08)) < width * 0.025 && y >= height * 0.38 && y <= height * 0.64;
        const inCurve = Math.abs(Math.sqrt(Math.pow(x - (cx - width * 0.06), 2) + Math.pow(y - height * 0.46, 2)) - width * 0.10) < width * 0.022 && x >= (cx - width * 0.06);
        const inDiag = Math.abs((y - height * 0.54) - 1.1 * (x - cx)) < width * 0.025 && y >= height * 0.54 && y <= height * 0.64;

        if (inHBar1 || inHBar2 || inVertBar || inCurve || inDiag) {
          red = 255; green = 255; blue = 255;
        }

        row.push(red, green, blue, alpha);
      } else {
        // Transparent outside squircle
        row.push(0, 0, 0, 0);
      }
    }
    scanlines.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);

  // PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);

    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);

    return Buffer.concat([len, body, crc]);
  }

  // Standard CRC32
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // 8 bits per channel
  ihdrData[9] = 6;  // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

fs.writeFileSync('public/icon-192.png', createPng(192, 192));
fs.writeFileSync('public/icon-512.png', createPng(512, 512));
console.log('Successfully generated public/icon-192.png and public/icon-512.png');

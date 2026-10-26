import fs from 'fs';
import zlib from 'zlib';

function createSimplePNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(2, 9); // color type 2: RGB
  ihdrData.writeUInt8(0, 10); // compression 0
  ihdrData.writeUInt8(0, 11); // filter 0
  ihdrData.writeUInt8(0, 12); // interlace 0

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    // calculate CRC32 of type + data
    const toCrc = Buffer.concat([typeBuf, data]);
    let crc = 0xffffffff;
    for (let i = 0; i < toCrc.length; i++) {
      crc ^= toCrc[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    crcBuf.writeInt32BE((crc ^ 0xffffffff) | 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) followed by RGB for each line
  const rowLen = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    const offset = y * rowLen;
    rawData[offset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 3;
      // Gradient effect
      const factor = (x + y) / (width + height);
      rawData[pxOffset] = Math.min(255, Math.floor(r * (1 - factor * 0.3)));
      rawData[pxOffset + 1] = Math.min(255, Math.floor(g * (1 - factor * 0.2)));
      rawData[pxOffset + 2] = Math.min(255, Math.floor(b));
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const icon192 = createSimplePNG(192, 192, 26, 115, 232); // Google Blue
const icon512 = createSimplePNG(512, 512, 26, 115, 232);

fs.writeFileSync('public/icon-192.png', icon192);
fs.writeFileSync('public/icon-512.png', icon512);
fs.writeFileSync('public/icon-512-maskable.png', icon512);
fs.writeFileSync('public/apple-touch-icon.png', icon192);
console.log('PNG icons written successfully!');

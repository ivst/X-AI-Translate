import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const outputDir = path.join(root, "dist");
const outputPath = path.join(outputDir, `ai-translate-cws-v${manifest.version}.zip`);

const files = [
  "manifest.json",
  "background.js",
  "content.js",
  "i18n.js",
  "options.html",
  "options.js",
  "popup.html",
  "popup.js",
  "styles.css",
  "icon16.png",
  "icon48.png",
  "icon128.png",
  ...fs.readdirSync(path.join(root, "_locales"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `_locales/${entry.name}/messages.json`)
];

for (const relative of files) {
  if (!fs.existsSync(path.join(root, relative))) {
    throw new Error(`Missing package file: ${relative}`);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  return {
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value & 0xffff);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

const chunks = [];
const central = [];
let offset = 0;
const stamp = dosDateTime();

for (const relative of files) {
  const name = relative.replaceAll(path.sep, "/");
  const nameBuffer = Buffer.from(name, "utf8");
  const data = fs.readFileSync(path.join(root, relative));
  const crc = crc32(data);
  const local = Buffer.concat([
    Buffer.from("PK\x03\x04", "binary"),
    u16(20), u16(0), u16(0), u16(stamp.time), u16(stamp.date),
    u32(crc), u32(data.length), u32(data.length), u16(nameBuffer.length), u16(0),
    nameBuffer, data
  ]);
  chunks.push(local);
  central.push(Buffer.concat([
    Buffer.from("PK\x01\x02", "binary"),
    u16(20), u16(20), u16(0), u16(0), u16(stamp.time), u16(stamp.date),
    u32(crc), u32(data.length), u32(data.length), u16(nameBuffer.length), u16(0),
    u16(0), u16(0), u16(0), u32(0), u32(offset), nameBuffer
  ]));
  offset += local.length;
}

const centralDirectory = Buffer.concat(central);
const end = Buffer.concat([
  Buffer.from("PK\x05\x06", "binary"),
  u16(0), u16(0), u16(files.length), u16(files.length),
  u32(centralDirectory.length), u32(offset), u16(0)
]);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, Buffer.concat([...chunks, centralDirectory, end]));
console.log(`Created ${path.relative(root, outputPath)} (${files.length} files)`);

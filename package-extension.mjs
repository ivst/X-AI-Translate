import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_FILES = [
  "background.js",
  "content.js",
  "i18n.js",
  "icon128.png",
  "icon16.png",
  "icon48.png",
  "manifest.json",
  "options.html",
  "options.js",
  "popup.html",
  "popup.js",
  "styles.css",
  "bridge-instructions.html",
  "bridge-instructions.js"
];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function collectFiles(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath, relativePath));
    } else {
      files.push({ absolutePath, relativePath });
    }
  }
  return files;
}

function localHeader(name, data, checksum) {
  const nameBuffer = Buffer.from(name);
  const header = Buffer.alloc(30 + nameBuffer.length + data.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0x21, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  nameBuffer.copy(header, 30);
  data.copy(header, 30 + nameBuffer.length);
  return header;
}

function centralHeader(name, data, checksum, offset) {
  const nameBuffer = Buffer.from(name);
  const header = Buffer.alloc(46 + nameBuffer.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0x21, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  nameBuffer.copy(header, 46);
  return header;
}

function endOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(ROOT, "manifest.json"), "utf8"));
  const outputPath = path.resolve(
    ROOT,
    process.argv[2] || path.join("dist", `ai-translate-cws-v${manifest.version}.zip`)
  );
  const stagingPath = `${outputPath}.staging`;

  await fs.rm(stagingPath, { recursive: true, force: true });
  await fs.mkdir(stagingPath, { recursive: true });

  for (const relativePath of EXTENSION_FILES) {
    await fs.copyFile(
      path.join(ROOT, relativePath),
      path.join(stagingPath, relativePath)
    );
  }
  await fs.cp(path.join(ROOT, "_locales"), path.join(stagingPath, "_locales"), { recursive: true });

  const files = await collectFiles(stagingPath);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const data = await fs.readFile(file.absolutePath);
    const checksum = crc32(data);
    const local = localHeader(file.relativePath, data, checksum);
    localParts.push(local);
    centralParts.push(centralHeader(file.relativePath, data, checksum, offset));
    offset += local.length;
  }

  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    Buffer.concat([localData, centralData, endOfCentralDirectory(files.length, centralData.length, localData.length)])
  );
  await fs.rm(stagingPath, { recursive: true, force: true });

  console.log(`Created ${path.relative(ROOT, outputPath)}`);
  console.log("The bridge directory is intentionally excluded from this package.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

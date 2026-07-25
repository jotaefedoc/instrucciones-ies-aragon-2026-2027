import fs from "node:fs";
import path from "node:path";

const sourceRoot = process.argv[2];
const outputFile = process.argv[3] ?? "public/search-index.json";

if (!sourceRoot) {
  throw new Error("Indica la carpeta del repositorio documental.");
}

const githubBase =
  "https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027/blob/main/";
const preferredRoots = ["derived", "sections", "templates"];
const standalone = ["README.md", "instrucciones-ies-2026-2027-canonico.md"];

const files = [
  ...preferredRoots.flatMap((directory) =>
    fs
      .readdirSync(path.join(sourceRoot, directory), {
        recursive: true,
        withFileTypes: true,
      })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) =>
        path.relative(
          sourceRoot,
          path.join(entry.parentPath ?? entry.path, entry.name),
        ),
      ),
  ),
  ...standalone,
];

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

const cleanMarkdown = (value) =>
  value
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_>#]/g, " ")
    .replace(/\|/g, " · ")
    .replace(/-{3,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const kindFor = (file) => {
  if (file.includes("programas-educativos")) return "Programa educativo";
  if (file.includes("calendario")) return "Calendario";
  if (file.includes("listas-control")) return "Lista de control";
  if (file.includes("obligaciones")) return "Obligaciones";
  if (file.includes("clasificacion")) return "Clasificación";
  if (file.startsWith("sections/")) return "Instrucciones";
  if (file.startsWith("templates/")) return "Plantilla";
  if (file.includes("canonico")) return "Documento canónico";
  return "Documento";
};

const records = [];

for (const file of [...new Set(files)].sort()) {
  const raw = fs.readFileSync(path.join(sourceRoot, file), "utf8");
  const lines = raw.split(/\r?\n/);
  let documentTitle =
    lines.find((line) => line.startsWith("# "))?.slice(2).trim() ??
    path.basename(file, ".md");
  let sectionTitle = documentTitle;
  let sectionLevel = 1;
  let buffer = [];
  let tableHeaders = [];

  const flush = () => {
    const text = cleanMarkdown(buffer.join("\n"));
    if (text.length < 35) {
      buffer = [];
      return;
    }
    const chunks = text.match(/.{1,900}(?:\s|$)/g) ?? [text];
    chunks.forEach((chunk, chunkIndex) => {
      records.push({
        id: `${file}-${records.length}`,
        kind: kindFor(file),
        document: documentTitle,
        section: sectionTitle,
        text: chunk.trim(),
        url: `${githubBase}${file}#${slugify(sectionTitle)}`,
        path: file,
        level: sectionLevel,
        chunk: chunkIndex + 1,
      });
    });
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flush();
      sectionLevel = heading[1].length;
      sectionTitle = heading[2].trim();
      if (sectionLevel === 1) documentTitle = sectionTitle;
      tableHeaders = [];
      buffer.push(sectionTitle);
    } else {
      if (/^\|.+\|$/.test(line.trim())) {
        const cells = line
          .split("|")
          .slice(1, -1)
          .map((cell) => cleanMarkdown(cell));
        const isSeparator = cells.every((cell) => /^:?-+:?$/.test(cell));
        if (!isSeparator && cells.some(Boolean)) {
          if (!tableHeaders.length) {
            tableHeaders = cells;
          } else {
            const rowText = cells
              .map((cell, index) =>
                tableHeaders[index] ? `${tableHeaders[index]}: ${cell}` : cell,
              )
              .join(". ");
            records.push({
              id: `${file}-row-${records.length}`,
              kind: kindFor(file),
              title: cells[0] || sectionTitle,
              document: documentTitle,
              section: sectionTitle,
              text: rowText,
              url: `${githubBase}${file}#${slugify(sectionTitle)}`,
              path: file,
              level: sectionLevel,
              chunk: 1,
            });
          }
        }
      } else if (line.trim()) {
        tableHeaders = [];
      }
      buffer.push(line);
    }
  }
  flush();
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(
  outputFile,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      documentCount: new Set(records.map((record) => record.path)).size,
      records,
    },
    null,
    2,
  ),
);

console.log(
  `Índice generado: ${records.length} fragmentos de ${
    new Set(records.map((record) => record.path)).size
  } documentos.`,
);

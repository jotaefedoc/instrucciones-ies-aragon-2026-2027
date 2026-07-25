import fs from "node:fs";

const indexFile = process.argv[2] ?? "public/search-index.json";
const calendarFile = process.argv[3] ?? "public/calendar-events.json";
const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
const events = JSON.parse(fs.readFileSync(calendarFile, "utf8"));

const fail = (message) => {
  throw new Error(`Validación del portal: ${message}`);
};

if (!index.generatedAt || Number.isNaN(Date.parse(index.generatedAt))) {
  fail("la fecha de generación del índice no es válida");
}
if (!Array.isArray(index.records) || index.records.length < 1_000) {
  fail("el índice documental está vacío o incompleto");
}
if (new Set(index.records.map((record) => record.path)).size !== index.documentCount) {
  fail("el número declarado de documentos no coincide con el índice");
}
if (!Array.isArray(events) || events.length !== 60) {
  fail(`se esperaban 60 actuaciones y se han obtenido ${events.length}`);
}

const eventIds = events.map((event) => event.id);
if (new Set(eventIds).size !== eventIds.length) {
  fail("hay identificadores de calendario duplicados");
}

for (const event of events) {
  for (const field of ["id", "date", "title", "area", "scope", "responsibility", "source"]) {
    if (!event[field]) fail(`la actuación ${event.id ?? "sin ID"} carece de ${field}`);
  }
  if (Number.isNaN(Date.parse(`${event.date}T00:00:00Z`))) {
    fail(`la actuación ${event.id} contiene una fecha no válida`);
  }
  if (event.endDate && event.endDate < event.date) {
    fail(`la actuación ${event.id} termina antes de comenzar`);
  }
}

console.log(
  `Datos validados: ${index.documentCount} documentos, ${index.records.length} fragmentos y ${events.length} actuaciones.`,
);

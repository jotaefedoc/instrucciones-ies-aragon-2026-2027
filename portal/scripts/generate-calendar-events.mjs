import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const searchIndexFile = process.argv[2] ?? path.join(root, "public/search-index.json");
const outputFile = process.argv[3] ?? path.join(root, "public/calendar-events.json");
const searchIndex = JSON.parse(
  fs.readFileSync(searchIndexFile, "utf8"),
);

const months = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const iso = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

function parsePeriod(label) {
  const normalized = label.toLocaleLowerCase("es");
  let match;

  if ((match = normalized.match(/^([a-záéíóú]+)-([a-záéíóú]+) de (\d{4})$/))) {
    const startMonth = months[match[1]];
    const endMonth = months[match[2]];
    return {
      date: iso(Number(match[3]), startMonth, 1),
      endDate: iso(Number(match[3]), endMonth, lastDay(Number(match[3]), endMonth)),
    };
  }

  if ((match = normalized.match(/^([a-záéíóú]+) de (\d{4})$/))) {
    const month = months[match[1]];
    return {
      date: iso(Number(match[2]), month, 1),
      endDate: iso(Number(match[2]), month, lastDay(Number(match[2]), month)),
    };
  }

  if ((match = normalized.match(/^del (\d{1,2}) al (\d{1,2}) de ([a-záéíóú]+) de (\d{4})$/))) {
    return {
      date: iso(Number(match[4]), months[match[3]], Number(match[1])),
      endDate: iso(Number(match[4]), months[match[3]], Number(match[2])),
    };
  }

  if ((match = normalized.match(/^(?:(?:antes del|hasta el|a partir del|el)\s+)?(\d{1,2}) de ([a-záéíóú]+) de (\d{4})$/))) {
    return { date: iso(Number(match[3]), months[match[2]], Number(match[1])) };
  }

  if ((match = normalized.match(/^(\d{1,2}) de ([a-záéíóú]+) de (\d{4})$/))) {
    return { date: iso(Number(match[3]), months[match[2]], Number(match[1])) };
  }

  const exceptional = {
    "cuarta semana de febrero de 2027": {
      date: "2027-02-22",
      endDate: "2027-02-28",
    },
    "a partir del 18 o del 22 de marzo de 2027": { date: "2027-03-18" },
    "1, 2 y 3 de junio de 2027": {
      date: "2027-06-01",
      endDate: "2027-06-03",
    },
    "29 y 30 de junio y 1 de julio de 2027": {
      date: "2027-06-29",
      endDate: "2027-07-01",
    },
  };

  return exceptional[normalized] ?? null;
}

const extract = (text, field, nextField) => {
  const pattern = new RegExp(
    `${field}: (.*?)(?:\\. ${nextField}:|$)`,
  );
  return text.match(pattern)?.[1]?.trim() ?? "";
};

function areaFor(action, source) {
  const value = `${action} ${source}`.toLocaleLowerCase("es");
  if (/\bdoc\b/u.test(value) || value.includes("documento de organización")) return "DOC";
  if (value.includes("programación general anual") || value.includes("pga")) return "PGA";
  if (
    value.includes("programa") ||
    value.includes("proyecto de innovación") ||
    value.includes("itinerario bilingüe") ||
    value.includes("plan de acción de realidad sostenible") ||
    value.includes("plan de lecturas de leer juntos")
  ) return "Programas";
  if (value.includes("evaluación") || value.includes("pau") || value.includes("reclamacion")) return "Evaluación";
  if (value.includes("fp") || value.includes("ciclo") || value.includes("fct") || value.includes("formación profesional")) return "Formación Profesional";
  if (value.includes("memoria")) return "Final de curso";
  return "Calendario escolar";
}

function teachingsFor(action, scope) {
  const value = `${action} ${scope}`.toLocaleLowerCase("es");
  const teachings = [];
  if (value.includes("eso")) teachings.push("ESO");
  if (value.includes("bachillerato") || value.includes("pau")) teachings.push("Bachillerato");
  if (
    value.includes("fp") ||
    value.includes("ciclo") ||
    value.includes("cfbg") ||
    value.includes("cfgm") ||
    value.includes("cfgs") ||
    value.includes("fct")
  ) teachings.push("Formación Profesional");
  if (value.includes("personas adultas")) teachings.push("Personas adultas");
  if (value.includes("enseñanzas deportivas")) teachings.push("Enseñanzas Deportivas");
  return [...new Set(teachings)];
}

function natureFor(action, dateLabel) {
  const value = `${action} ${dateLabel}`.toLocaleLowerCase("es");
  if (value.includes("recomendad")) return "Recomendación";
  if (
    value.includes("propuesta de modificación") ||
    value.includes("propuesta de horario") ||
    value.includes("preparación de solicitudes")
  ) return "Decisión / preparación";
  if (
    value.includes("inicio de curso") ||
    value.includes("fin de las actividades") ||
    value.includes("pruebas de acceso")
  ) return "Hito informativo";
  return "Obligación / trámite";
}

function coursePeriod(date) {
  const month = Number(date.slice(5, 7));
  if (month <= 8) {
    if (month <= 4) return "Segundo trimestre";
    if (month <= 6) return "Final de curso";
    return "Cierre y preparación";
  }
  if (month === 9) return "Inicio de curso";
  return "Primer trimestre";
}

function programFor(action, area) {
  if (area !== "Programas") return "";
  const value = action.toLocaleLowerCase("es");
  const programs = [
    ["aúna", "Aúna"],
    ["brit", "BRIT"],
    ["leer juntos", "Leer Juntos"],
    ["itinerario bilingüe", "Itinerario Bilingüe"],
    ["realidad sostenible", "Realidad Sostenible"],
    ["proyectos de innovación", "Proyectos de Innovación"],
    ["desarrollo de capacidades", "Desarrollo de Capacidades"],
    ["simulación de empresas", "Simulación de Empresas"],
    ["ciclos a.0", "Ciclos A.0"],
  ];
  return programs.find(([needle]) => value.includes(needle))?.[1] ?? "Programas educativos (general)";
}

const records = searchIndex.records.filter(
  (record) =>
    record.document ===
      "Calendario maestro de actuaciones y plazos. Curso 2026/2027" &&
    record.section.startsWith("1. Calendario cronológico") &&
    record.title,
);

const events = records.map((record, index) => {
  const period = parsePeriod(record.title);
  if (!period) {
    throw new Error(`No se ha podido convertir el periodo: ${record.title}`);
  }

  const action = extract(record.text, "Actuación / hito", "Aplicabilidad").replace(/\.$/, "");
  const scope = extract(record.text, "Aplicabilidad", "Responsable o emisor");
  const responsibility = extract(record.text, "Responsable o emisor", "Destinatario / vía");
  const destination = extract(record.text, "Destinatario / vía", "Referencia");
  const source = extract(record.text, "Referencia", "CAMPO_QUE_NO_EXISTE");
  const area = areaFor(action, source);

  return {
    id: `CAL-${String(index + 1).padStart(3, "0")}`,
    ...period,
    dateLabel: record.title,
    title: action,
    area,
    scope,
    responsibility,
    destination,
    teachings: teachingsFor(action, scope),
    program: programFor(action, area),
    nature: natureFor(action, record.title),
    coursePeriod: coursePeriod(period.date),
    source,
    detail: scope ? `Aplicabilidad: ${scope}.` : "",
    sourceRecord: {
      id: record.id,
      kind: record.kind,
      title: action,
      document: record.document,
      section: record.section,
      text: record.text,
      url: record.url,
      path: record.path,
    },
    priority:
      action.includes("Documento de Organización") ||
      action.includes("Programación General Anual") ||
      action.includes("calendario general de organización de final de curso"),
  };
});

fs.writeFileSync(
  outputFile,
  `${JSON.stringify(events, null, 2)}\n`,
);

console.log(`Calendario generado: ${events.length} actuaciones con fecha.`);

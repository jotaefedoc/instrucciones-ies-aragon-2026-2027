"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import calendarEvents from "../public/calendar-events.json";

type EventItem = {
  id: string;
  date: string;
  endDate?: string;
  dateLabel: string;
  title: string;
  area: string;
  scope: string;
  source: string;
  detail: string;
  responsibility: string;
  destination: string;
  teachings: string[];
  program: string;
  nature: string;
  coursePeriod: string;
  sourceRecord: SearchRecord;
  priority?: boolean;
};

type SearchRecord = {
  id: string;
  kind: string;
  title?: string;
  document: string;
  section: string;
  text: string;
  url: string;
  path: string;
};

type SearchIndex = {
  generatedAt: string;
  documentCount: number;
  records: SearchRecord[];
};

function getExplicitResponsibility(record: SearchRecord) {
  const text = record.text.replace(/\s+/g, " ").trim();
  const labeled = text.match(
    /(?:Responsable operativo|Responsable funcional|Órgano competente|Responsable formal|Responsable de elaboración|Responsable o emisor|Responsable)\s*:\s*([^.;|·]{2,100})/i,
  );
  if (labeled) return labeled[1].trim();

  const clearActors: Array<[RegExp, string]> = [
    [/\bpor parte de la dirección del centro\b/i, "Dirección del centro"],
    [/\bla dirección del centro (?:deberá|remitirá|comunicará|designará|resolverá)\b/i, "Dirección del centro"],
    [/\bel Servicio Provincial (?:deberá|resolverá|comunicará|autorizará)\b/i, "Servicio Provincial"],
    [/\bel equipo directivo (?:deberá|elaborará|remitirá|organizará)\b/i, "Equipo directivo"],
    [/\bel Claustro (?:deberá|aprobará|informará|propondrá)\b/i, "Claustro"],
    [/\bel Consejo Escolar (?:deberá|aprobará|informará|evaluará)\b/i, "Consejo Escolar"],
    [/\bla Comisión de Coordinación Pedagógica (?:deberá|elaborará|propondrá|informará)\b/i, "Comisión de Coordinación Pedagógica"],
  ];
  return clearActors.find(([pattern]) => pattern.test(text))?.[1];
}

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

function highlightedSnippet(text: string, query: string) {
  const terms = normalizeSearch(query)
    .split(/\s+/)
    .filter((term) => term.length > 1);
  const normalized = normalizeSearch(text);
  const positions = terms
    .map((term) => normalized.indexOf(term))
    .filter((position) => position >= 0);
  const first = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, first - 105);
  const end = Math.min(text.length, start + 330);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${
    end < text.length ? "…" : ""
  }`;
}

const fallbackEvents = calendarEvents as EventItem[];
const repositoryDataBase =
  "https://raw.githubusercontent.com/jotaefedoc/instrucciones-ies-aragon-2026-2027/main/portal-data";

type AreaDefinition = {
  id: string;
  title: string;
  description: string;
  timing: string;
  guidance: string;
  keywords: string[];
  eventTerms: string[];
};

type ProgramDefinition = {
  id: string;
  name: string;
  procedure: string;
  applicable: "Sí" | "Condicionado" | "No";
  audience: string;
  preparation: string;
  documentation: string;
  commitments: string;
  specificSection?: string;
};

type ChecklistStatus = "no-iniciada" | "en-preparacion" | "bloqueada" | "terminada";

type ChecklistTask = {
  id: string;
  phase: string;
  title: string;
  timing: string;
  responsibility: string;
  evidence: string;
  applicability: "General" | "Condicionada";
  detail: string;
  reference: string;
  sourceSection: string;
};

type ChecklistSavedState = {
  version: 1;
  updatedAt: string;
  statuses: Record<string, ChecklistStatus>;
  notes: Record<string, string>;
};

type ProcessStep = {
  label: string;
  title: string;
  description: string;
  actor: string;
  evidence: string;
};

type ProcessDiagram = {
  id: string;
  shortTitle: string;
  title: string;
  purpose: string;
  caution: string;
  sourceTerms: string[];
  steps: ProcessStep[];
};

const processDiagrams: ProcessDiagram[] = [
  {
    id: "doc",
    shortTitle: "DOC",
    title: "Elaboración, revisión y remisión del DOC",
    purpose: "Ordena el recorrido del Documento de Organización del Centro desde la preparación de datos hasta su envío y conservación.",
    caution: "El DOC debe reflejar la situación real del centro. Los horarios individuales se incorporan en el formato oficial y las instrucciones concretan la vía y los plazos de remisión.",
    sourceTerms: ["documento de organización del centro", "DOC", "horarios individuales"],
    steps: [
      { label: "1", title: "Preparar datos", description: "Reunir matrícula, grupos, cupo, cargos, tutorías, horarios, espacios y demás datos organizativos.", actor: "Equipo directivo", evidence: "Datos contrastados y coherentes con SIGAD" },
      { label: "2", title: "Elaborar el DOC", description: "Cumplimentar el documento oficial y anexar los horarios individuales en el formato establecido.", actor: "Equipo directivo", evidence: "DOC completo y versión controlada" },
      { label: "3", title: "Revisar coherencia", description: "Comprobar que horarios, grupos, enseñanzas, cargos y recursos coinciden con la realidad del centro.", actor: "Dirección / equipo directivo", evidence: "Revisión interna documentada" },
      { label: "4", title: "Remitir", description: "Enviar por la vía y dentro del plazo indicados en las instrucciones del curso.", actor: "Dirección", evidence: "Justificante de registro o remisión" },
      { label: "5", title: "Subsanar y archivar", description: "Atender posibles requerimientos y conservar la versión definitiva con sus justificantes.", actor: "Dirección / Secretaría", evidence: "DOC definitivo y subsanaciones archivadas" },
    ],
  },
  {
    id: "pga",
    shortTitle: "PGA",
    title: "Elaboración, aprobación y seguimiento de la PGA",
    purpose: "Distingue aportaciones, elaboración, intervención de los órganos colegiados, remisión y evaluación de la Programación General Anual.",
    caution: "Las competencias de Claustro y Consejo Escolar no son intercambiables: cada órgano interviene en los aspectos que legalmente le corresponden.",
    sourceTerms: ["programación general anual", "PGA", "consejo escolar aprobará", "claustro"],
    steps: [
      { label: "1", title: "Recoger aportaciones", description: "Integrar propuestas de órganos de coordinación, departamentos, planes y programas.", actor: "Equipo directivo y órganos de coordinación", evidence: "Propuestas y documentos de partida" },
      { label: "2", title: "Elaborar la PGA", description: "Articular objetivos, organización, planes, actuaciones, calendario, seguimiento y anexos.", actor: "Equipo directivo", evidence: "Borrador completo de PGA" },
      { label: "3", title: "Informar y aprobar", description: "Someter cada contenido a la intervención del Claustro y del Consejo Escolar conforme a sus competencias.", actor: "Claustro / Consejo Escolar", evidence: "Actas y acuerdo de aprobación" },
      { label: "4", title: "Remitir y difundir", description: "Enviar la PGA por la vía prevista y facilitar su conocimiento a la comunidad educativa.", actor: "Dirección", evidence: "Justificante de remisión y copia accesible" },
      { label: "5", title: "Seguir y evaluar", description: "Comprobar su desarrollo durante el curso y recoger conclusiones en la memoria final.", actor: "Equipo directivo y órganos competentes", evidence: "Registros de seguimiento y memoria" },
    ],
  },
  {
    id: "programas",
    shortTitle: "Programas",
    title: "Solicitud y desarrollo de Programas Educativos",
    purpose: "Resume el ciclo administrativo común y señala dónde deben verificarse las particularidades de cada convocatoria.",
    caution: "Cada programa puede añadir destinatarios, requisitos, compromisos, anexos o costes específicos. La ficha individual y la convocatoria prevalecen sobre este esquema común.",
    sourceTerms: ["programas educativos", "solicitud", "subsanación", "memoria", "certificación"],
    steps: [
      { label: "1", title: "Valorar", description: "Comprobar aplicabilidad, requisitos, recursos, compromisos y encaje con las prioridades del centro.", actor: "Equipo directivo / órgano que corresponda", evidence: "Valoración y decisión documentada" },
      { label: "2", title: "Preparar y solicitar", description: "Reunir acuerdos y anexos, cumplimentar el procedimiento y registrar dentro de plazo.", actor: "Dirección / responsable indicado", evidence: "Solicitud y justificante de registro" },
      { label: "3", title: "Comprobar resolución", description: "Revisar subsanaciones, propuesta provisional, alegaciones y resolución definitiva.", actor: "Dirección / coordinación del programa", evidence: "Notificaciones y resolución archivadas" },
      { label: "4", title: "Integrar y desarrollar", description: "Incorporar el programa a la planificación del centro, asignar coordinación y conservar evidencias.", actor: "Centro / coordinación", evidence: "PGA, actuaciones y registros de seguimiento" },
      { label: "5", title: "Memoria y certificación", description: "Evaluar, presentar la memoria cuando proceda y comprobar el reconocimiento de la participación.", actor: "Coordinación / Dirección", evidence: "Memoria, justificante y certificación" },
    ],
  },
  {
    id: "documentos",
    shortTitle: "Documentos",
    title: "Relación entre los documentos institucionales",
    purpose: "Aclara la función de los principales documentos y cómo se conectan sin convertirlos en piezas aisladas.",
    caution: "La denominación, aprobación y contenido exigible de cada documento deben contrastarse con la normativa vigente y con las instrucciones del curso.",
    sourceTerms: ["proyecto educativo", "reglamento de régimen interior", "plan de atención a la diversidad", "plan de orientación y acción tutorial", "memoria final"],
    steps: [
      { label: "Marco", title: "PEC y RRI", description: "El PEC define identidad, objetivos y prioridades; el RRI regula organización, participación, convivencia y funcionamiento.", actor: "Comunidad educativa / órganos competentes", evidence: "Textos vigentes y acuerdos de aprobación" },
      { label: "Planes", title: "PAD, POAT y otros planes", description: "Desarrollan ámbitos específicos y concretan respuestas, procedimientos y actuaciones.", actor: "Órganos de coordinación y gobierno", evidence: "Planes actualizados e integrados" },
      { label: "Curso", title: "PGA", description: "Concreta para el curso objetivos, organización, planes, programas, calendario y mecanismos de seguimiento.", actor: "Equipo directivo y órganos colegiados", evidence: "PGA aprobada y remitida" },
      { label: "Organización", title: "DOC", description: "Describe la organización efectiva: grupos, enseñanzas, horarios, cargos, recursos y demás datos del centro.", actor: "Equipo directivo", evidence: "DOC remitido y coherente con la realidad" },
      { label: "Evaluación", title: "Memoria final", description: "Valora el desarrollo de la PGA y alimenta las propuestas y decisiones del curso siguiente.", actor: "Órganos y responsables de evaluación", evidence: "Memoria y propuestas de mejora" },
    ],
  },
  {
    id: "evaluacion",
    shortTitle: "Evaluación",
    title: "Evaluación, promoción, titulación y reclamaciones",
    purpose: "Separa las decisiones académicas del procedimiento de revisión y reclamación, preservando la trazabilidad.",
    caution: "Los criterios, plazos y órganos varían según la enseñanza y el tipo de decisión. Antes de actuar debe abrirse la referencia específica correspondiente.",
    sourceTerms: ["evaluación", "promoción", "titulación", "reclamación", "revisión"],
    steps: [
      { label: "1", title: "Evaluar", description: "Aplicar los criterios y procedimientos establecidos, reunir información y celebrar la sesión del equipo docente.", actor: "Profesorado / equipo docente", evidence: "Actas, calificaciones e informes" },
      { label: "2", title: "Adoptar decisiones", description: "Resolver promoción, titulación u otras decisiones colegiadas conforme a la regulación aplicable.", actor: "Equipo docente / órgano competente", evidence: "Decisión motivada y reflejada en acta" },
      { label: "3", title: "Comunicar", description: "Facilitar resultados, información sobre criterios y las vías y plazos de revisión.", actor: "Centro / tutoría / jefatura", evidence: "Comunicación y constancia de entrega" },
      { label: "4", title: "Revisar", description: "Tramitar la solicitud de revisión dentro del centro, reunir informes y comunicar la resolución.", actor: "Departamento / jefatura / equipo docente", evidence: "Expediente interno de revisión" },
      { label: "5", title: "Reclamar", description: "Si continúa el desacuerdo, remitir el expediente completo al órgano externo competente dentro de plazo.", actor: "Dirección / Servicio Provincial", evidence: "Expediente, registro y resolución" },
    ],
  },
  {
    id: "curso",
    shortTitle: "Ciclo anual",
    title: "Ciclo operativo completo del curso",
    purpose: "Ofrece una vista de conjunto para entender cómo preparación, apertura, planificación, seguimiento y cierre se alimentan entre sí.",
    caution: "Es una orientación temporal: los plazos exactos y las actuaciones condicionadas deben comprobarse en el calendario maestro.",
    sourceTerms: ["inicio de curso", "programación general anual", "documento de organización", "seguimiento", "memoria final", "final de curso"],
    steps: [
      { label: "Verano", title: "Preparar", description: "Matrícula, cupo, grupos, horarios, espacios, calendario, programas y documentación de partida.", actor: "Equipo directivo / Secretaría", evidence: "Datos y borradores contrastados" },
      { label: "Septiembre", title: "Poner en marcha", description: "Recepción, órganos iniciales, difusión de instrucciones, tutorías, servicios y rutinas.", actor: "Equipo directivo y comunidad educativa", evidence: "Actas, comunicaciones y organización activa" },
      { label: "Primer trimestre", title: "Formalizar", description: "Cerrar DOC y PGA, tramitar programas y completar los procesos institucionales iniciales.", actor: "Dirección y órganos competentes", evidence: "Documentos aprobados, remitidos y archivados" },
      { label: "Curso", title: "Desarrollar y seguir", description: "Ejecutar planes, enseñar, evaluar, coordinar, atender incidencias y verificar plazos.", actor: "Centro", evidence: "Registros de actividad y seguimiento" },
      { label: "Final", title: "Evaluar y mejorar", description: "Cerrar evaluaciones, memorias, certificaciones y propuestas que preparan el curso siguiente.", actor: "Órganos y responsables correspondientes", evidence: "Memoria final y plan de mejora" },
    ],
  },
];

const checklistTasks: ChecklistTask[] = [
  {
    id: "calendario-festividades",
    phase: "Preparación previa",
    title: "Contrastar calendario escolar y festividades locales",
    timing: "Antes del inicio; comunicación local antes del 1 de septiembre",
    responsibility: "Ayuntamiento / Servicio Provincial; comprobación por el centro",
    evidence: "Calendario del centro contrastado con la comunicación oficial",
    applicability: "General",
    detail: "Comprobar días lectivos, festividades locales y posibles sustituciones, e incorporar cualquier comunicación posterior.",
    reference: "Segunda, p. 12",
    sourceSection: "Calendario y organización general",
  },
  {
    id: "difusion-instrucciones",
    phase: "Preparación previa",
    title: "Preparar la difusión de las instrucciones de inicio de curso",
    timing: "Al inicio del curso",
    responsibility: "Dirección",
    evidence: "Punto incluido en convocatorias, actas o documentación informativa",
    applicability: "General",
    detail: "Preparar una comunicación diferenciada para Claustro y Consejo Escolar, conservando constancia documental.",
    reference: "Cierre de las instrucciones, p. 76",
    sourceSection: "Calendario y organización general",
  },
  {
    id: "sigad-cargos",
    phase: "Preparación previa",
    title: "Registrar cargos, jefaturas y tutorías en SIGAD",
    timing: "Lo antes posible",
    responsibility: "Equipo directivo / centro",
    evidence: "Cargos y tutorías visibles y comprobados en SIGAD",
    applicability: "General",
    detail: "Registrar equipo directivo, jefaturas de departamento y tutorías; comprobar especialmente los datos con repercusión en nómina.",
    reference: "Introducción, p. 5",
    sourceSection: "SIGAD, cargos y estructura del centro",
  },
  {
    id: "confirmacion-matricula",
    phase: "Preparación previa",
    title: "Confirmar los datos de matrícula al finalizar los plazos",
    timing: "Al cierre de cada periodo de matrícula",
    responsibility: "Centro",
    evidence: "Matrícula confirmada y revisión de incidencias terminada",
    applicability: "General",
    detail: "Comprobar que la matrícula real y los datos registrados coinciden antes de cerrar la organización de grupos y enseñanzas.",
    reference: "Introducción, p. 5",
    sourceSection: "SIGAD, cargos y estructura del centro",
  },
  {
    id: "horarios-individuales",
    phase: "Preparación previa",
    title: "Preparar y revisar los horarios individuales del profesorado",
    timing: "Antes de cerrar el DOC",
    responsibility: "Equipo directivo",
    evidence: "Horarios completos, coherentes y en el formato oficial",
    applicability: "General",
    detail: "El DOC debe reflejar la realidad del centro y los horarios individuales deben utilizar el formato oficial.",
    reference: "5.11, p. 33",
    sourceSection: "Horarios y documentación preparatoria",
  },
  {
    id: "modificacion-calendario",
    phase: "Preparación previa",
    title: "Valorar si procede solicitar modificación del calendario escolar",
    timing: "Antes del plazo que resulte aplicable",
    responsibility: "Dirección / centro",
    evidence: "Decisión documentada y, si procede, solicitud registrada",
    applicability: "Condicionada",
    detail: "Solo debe activarse cuando exista una causa y un supuesto de modificación admitido por la regulación del calendario.",
    reference: "Segunda, pp. 13–16",
    sourceSection: "Horarios y documentación preparatoria",
  },
  {
    id: "claustro-cuentas",
    phase: "Primeros órganos colegiados",
    title: "Informar del uso obligatorio de cuentas corporativas",
    timing: "Primer Claustro",
    responsibility: "Equipo directivo",
    evidence: "Punto incluido en el orden del día y en el acta",
    applicability: "General",
    detail: "Recordar la utilización de las cuentas @educa.aragon.es en el ámbito profesional.",
    reference: "12.16, pp. 69–70",
    sourceSection: "Primer Claustro",
  },
  {
    id: "claustro-protocolos",
    phase: "Primeros órganos colegiados",
    title: "Informar sobre protocolos frente a violencia de género y MGF",
    timing: "Primeros Claustros",
    responsibility: "Equipo directivo",
    evidence: "Información documentada en convocatoria, materiales o acta",
    applicability: "General",
    detail: "Incluir los protocolos de mutilación genital femenina y de coordinación frente a la violencia de género.",
    reference: "12.27, p. 73",
    sourceSection: "Primer Claustro",
  },
  {
    id: "consejo-instrucciones",
    phase: "Primeros órganos colegiados",
    title: "Difundir las instrucciones al Consejo Escolar",
    timing: "Al inicio del curso",
    responsibility: "Dirección",
    evidence: "Constancia en convocatoria, documentación o acta",
    applicability: "General",
    detail: "Facilitar el conocimiento de las instrucciones de inicio de curso por el Consejo Escolar.",
    reference: "Cierre de las instrucciones, p. 76",
    sourceSection: "Consejo Escolar",
  },
  {
    id: "planificar-autoproteccion",
    phase: "Planificación anual",
    title: "Programar sesión de autoprotección y simulacro",
    timing: "Durante el curso",
    responsibility: "Equipo directivo / centro",
    evidence: "Sesión incorporada a la planificación anual",
    applicability: "General",
    detail: "Programar al menos una sesión de información o formación sobre autoprotección y simulacro.",
    reference: "12.26, p. 73",
    sourceSection: "Formación e información que debe programarse durante el curso",
  },
  {
    id: "planificar-proteccion-datos",
    phase: "Planificación anual",
    title: "Programar sesión sobre protección de datos personales",
    timing: "Durante el curso",
    responsibility: "Equipo directivo / centro",
    evidence: "Sesión incorporada a la planificación anual",
    applicability: "General",
    detail: "Programar al menos una sesión de información o formación en materia de protección de datos.",
    reference: "12.16, pp. 69–70",
    sourceSection: "Formación e información que debe programarse durante el curso",
  },
  {
    id: "programas-valorar",
    phase: "Programas educativos",
    title: "Difundir la convocatoria y valorar programas educativos",
    timing: "Junio–julio; cierre recomendado antes del 1 de septiembre",
    responsibility: "Centro / equipo directivo",
    evidence: "Relación de programas valorados y decisión sobre cada solicitud",
    applicability: "Condicionada",
    detail: "Revisar destinatarios, modalidad, criterios, profesorado, carga, costes, desplazamientos y documentación.",
    reference: "Resolución de convocatoria, Anexo I",
    sourceSection: "Preparación previa a septiembre",
  },
  {
    id: "programas-expedientes",
    phase: "Programas educativos",
    title: "Cerrar el expediente previo de cada programa elegido",
    timing: "Antes del 1 de septiembre",
    responsibility: "Centro",
    evidence: "Documentación complementaria completa y revisada",
    applicability: "Condicionada",
    detail: "Elegir modalidad, confirmar destinatarios y disponer del proyecto, plan o anexos particulares exigidos.",
    reference: "Resolución, apartados Segundo y Tercero; Anexo I",
    sourceSection: "Preparación previa a septiembre",
  },
  {
    id: "programas-solicitudes",
    phase: "Programas educativos",
    title: "Presentar telemáticamente cada solicitud",
    timing: "Del 2 al 18 de septiembre de 2026",
    responsibility: "Centro; firma de la persona autorizada",
    evidence: "Justificante de registro archivado por programa o idioma",
    applicability: "Condicionada",
    detail: "Registrar un trámite por programa; en PALE, realizar un trámite independiente por idioma.",
    reference: "Resolución, apartado Tercero",
    sourceSection: "Presentación y seguimiento",
  },
  {
    id: "programas-seguimiento",
    phase: "Programas educativos",
    title: "Vigilar notificaciones, subsanaciones y resoluciones",
    timing: "Según notificación y calendario de la convocatoria",
    responsibility: "Centro",
    evidence: "Notificaciones atendidas y resoluciones archivadas",
    applicability: "Condicionada",
    detail: "Atender subsanaciones, revisar propuesta provisional, formular alegaciones si procede y archivar la resolución definitiva.",
    reference: "Resolución, apartados Cuarto, Quinto y Séptimo",
    sourceSection: "Presentación y seguimiento",
  },
  {
    id: "documentacion-adscritos",
    phase: "Septiembre",
    title: "Verificar documentación de alumnado de centros privados adscritos",
    timing: "Antes del 15 de septiembre de 2026",
    responsibility: "Centro privado emisor; comprobación por el IES",
    evidence: "Documentación recibida, revisada y archivada",
    applicability: "Condicionada",
    detail: "Aplicable únicamente si el IES tiene centros privados no concertados adscritos.",
    reference: "12.28, p. 73",
    sourceSection: "4. Septiembre de 2026",
  },
  {
    id: "convalidaciones-fp",
    phase: "Septiembre",
    title: "Tramitar solicitudes de convalidación de módulos de FP",
    timing: "Durante septiembre, conforme al procedimiento aplicable",
    responsibility: "Centro / Secretaría",
    evidence: "Solicitudes revisadas, registradas y remitidas cuando proceda",
    applicability: "Condicionada",
    detail: "Aplicable a centros con Formación Profesional y alumnado que solicite convalidaciones.",
    reference: "Instrucciones de FP, curso 2026/2027",
    sourceSection: "4. Septiembre de 2026",
  },
  {
    id: "doc-realidad",
    phase: "DOC",
    title: "Comprobar que el DOC refleja la realidad del centro",
    timing: "Antes de su remisión",
    responsibility: "Dirección / equipo directivo",
    evidence: "Revisión final de datos, grupos, cargos, tutorías, departamentos y horarios",
    applicability: "General",
    detail: "Cruzar el DOC con la matrícula, las enseñanzas autorizadas, la plantilla y la organización efectiva.",
    reference: "5.11, p. 33",
    sourceSection: "Preparación y validación del DOC",
  },
  {
    id: "doc-remision",
    phase: "DOC",
    title: "Remitir el Documento de Organización del Centro",
    timing: "Hasta el 20 de octubre de 2026",
    responsibility: "Dirección / equipo directivo",
    evidence: "Justificante de registro o constancia de entrega",
    applicability: "General",
    detail: "Realizar la remisión por la vía indicada y conservar la versión final y el justificante.",
    reference: "Introducción, p. 5; 5.11, p. 33",
    sourceSection: "Preparación y validación del DOC",
  },
  {
    id: "titulos-octubre",
    phase: "Octubre",
    title: "Realizar el primer envío de propuestas de títulos",
    timing: "Antes del 31 de octubre de 2026",
    responsibility: "Centro / Secretaría",
    evidence: "Relación remitida y justificantes conservados",
    applicability: "Condicionada",
    detail: "Cuando proceda, remitir al Servicio Provincial en papel y soporte digital.",
    reference: "6.3.3, p. 42",
    sourceSection: "Otros controles de octubre",
  },
  {
    id: "pga-contenido",
    phase: "PGA",
    title: "Comprobar el contenido completo de la PGA",
    timing: "Octubre–noviembre de 2026",
    responsibility: "Dirección / equipo directivo, con los órganos correspondientes",
    evidence: "Índice de control y versión completa preparada",
    applicability: "General",
    detail: "Incorporar los documentos, planes, programas y concreciones exigibles, comprobando coherencia con el DOC.",
    reference: "5.4, pp. 27–28",
    sourceSection: "6. Octubre-noviembre de 2026: Programación General Anual",
  },
  {
    id: "pga-organos",
    phase: "PGA",
    title: "Completar intervención de Claustro y Consejo Escolar en la PGA",
    timing: "Antes de su remisión",
    responsibility: "Dirección y órganos colegiados según sus competencias",
    evidence: "Convocatorias, acuerdos e informes reflejados en actas",
    applicability: "General",
    detail: "Documentar la participación, información, evaluación o aprobación que corresponda a cada órgano.",
    reference: "5.4, pp. 27–28",
    sourceSection: "6. Octubre-noviembre de 2026: Programación General Anual",
  },
  {
    id: "pga-remision",
    phase: "PGA",
    title: "Remitir la Programación General Anual",
    timing: "Hasta el 3 de noviembre de 2026",
    responsibility: "Dirección / equipo directivo",
    evidence: "Justificante de remisión conservado",
    applicability: "General",
    detail: "Remitir la versión definitiva por la vía indicada y conservar copia íntegra y justificante.",
    reference: "Introducción, p. 6; 5.4, pp. 27–28",
    sourceSection: "6. Octubre-noviembre de 2026: Programación General Anual",
  },
  {
    id: "itinerario-bilingue",
    phase: "Actuaciones condicionadas",
    title: "Comprobar y remitir el Itinerario Bilingüe",
    timing: "Hasta el 17 de noviembre de 2026",
    responsibility: "Centro",
    evidence: "Aplicabilidad decidida; correo y archivo enviados si procede",
    applicability: "Condicionada",
    detail: "Solo para centros con itinerario bilingüe; remitir a la Dirección General competente.",
    reference: "5.10, pp. 32–33",
    sourceSection: "Itinerario bilingüe",
  },
  {
    id: "proa-aralecto-arcomat",
    phase: "Actuaciones condicionadas",
    title: "Activar seguimiento de PROA+, ARALECTO y ARCOMAT",
    timing: "Según determine la coordinación de cada programa",
    responsibility: "Centro / coordinación del programa",
    evidence: "Aplicabilidad y próximos hitos registrados",
    applicability: "Condicionada",
    detail: "Confirmar participación del centro y registrar el calendario comunicado por cada coordinación.",
    reference: "Introducción, p. 5",
    sourceSection: "Programas PROA+, ARALECTO y ARCOMAT",
  },
  {
    id: "pai-pdc-pdps",
    phase: "Actuaciones condicionadas",
    title: "Preparar propuestas de alumnado para PAI, PDC o PDPS",
    timing: "Según instrucciones específicas",
    responsibility: "Centro / órganos competentes",
    evidence: "Instrucción localizada, alumnado revisado y propuesta tramitada",
    applicability: "Condicionada",
    detail: "No anticipar fechas: activar la tarea cuando la Dirección General publique las instrucciones correspondientes.",
    reference: "Introducción, p. 7",
    sourceSection: "PAI, PDC y PDPS",
  },
  {
    id: "fp-aplicabilidad",
    phase: "Actuaciones condicionadas",
    title: "Determinar modalidades y programas de FP aplicables",
    timing: "Al organizar el curso",
    responsibility: "Equipo directivo / Jefatura de Estudios",
    evidence: "Matriz de aplicabilidad completada",
    applicability: "Condicionada",
    detail: "Comprobar presencial, virtual, semipresencial, formación en empresa, régimen intensivo y programas específicos.",
    reference: "Introducción, pp. 6 y 9; Segunda, pp. 14–15",
    sourceSection: "Formación Profesional",
  },
  {
    id: "fp-doc-modificado",
    phase: "Actuaciones condicionadas",
    title: "Remitir modificaciones del DOC por formación en empresa",
    timing: "Antes del inicio de la formación en empresa",
    responsibility: "Jefatura de Estudios",
    evidence: "Modificación y justificante de remisión",
    applicability: "Condicionada",
    detail: "Remitir al Servicio Provincial las modificaciones derivadas del nuevo horario del profesorado.",
    reference: "5.11, p. 33",
    sourceSection: "Formación Profesional",
  },
  {
    id: "adultos-distancia",
    phase: "Actuaciones condicionadas",
    title: "Gestionar matrícula de Bachillerato para adultos a distancia",
    timing: "Del 1 al 11 de septiembre de 2026",
    responsibility: "Centro autorizado",
    evidence: "Matrícula revisada y plazas disponibles actualizadas",
    applicability: "Condicionada",
    detail: "Solo para centros autorizados; pueden atenderse solicitudes posteriores si existen plazas.",
    reference: "11.2, pp. 57–58",
    sourceSection: "Bachillerato para personas adultas a distancia",
  },
  {
    id: "parte-faltas-profesorado",
    phase: "Rutinas desde septiembre",
    title: "Activar el parte mensual de faltas del profesorado",
    timing: "Disponible antes del día 5 de cada mes",
    responsibility: "Equipo directivo / centro",
    evidence: "Responsable, circuito y ubicación de custodia definidos",
    applicability: "General",
    detail: "El parte y justificantes quedan custodiados en el centro y disponibles para Inspección; no se remiten ordinariamente.",
    reference: "4.2.1, p. 23",
    sourceSection: "8. Rutinas que deben quedar activadas desde septiembre",
  },
  {
    id: "ausencias-retrasos",
    phase: "Rutinas desde septiembre",
    title: "Comunicar el circuito de justificación de ausencias y retrasos",
    timing: "Justificación el mismo día de la reincorporación",
    responsibility: "Jefatura de Estudios / Secretaría",
    evidence: "Procedimiento comunicado al profesorado",
    applicability: "General",
    detail: "Definir recepción, comprobación y custodia de justificantes y comunicar claramente el circuito.",
    reference: "4.2.1, p. 23",
    sourceSection: "8. Rutinas que deben quedar activadas desde septiembre",
  },
];

const checklistStatusLabels: Record<ChecklistStatus, string> = {
  "no-iniciada": "No iniciada",
  "en-preparacion": "En preparación",
  bloqueada: "Bloqueada",
  terminada: "Terminada y verificada",
};

const programs: ProgramDefinition[] = [
  {
    id: "ajedrez",
    name: "Ajedrez en la Escuela",
    procedure: "11796",
    applicable: "Sí",
    audience: "IES y otras enseñanzas admitidas por la convocatoria.",
    preparation: "Concretar materias o áreas de integración y profesorado participante.",
    documentation: "Solicitud específica y documentación complementaria indicada en el procedimiento.",
    commitments: "Reflejar la participación en las programaciones afectadas.",
  },
  {
    id: "emprender",
    name: "Aprendiendo a Emprender",
    procedure: "11805",
    applicable: "No",
    audience: "5.º y 6.º de Primaria y Educación Especial.",
    preparation: "No es aplicable con carácter general a un IES.",
    documentation: "Consultar la ficha solo si el centro imparte alguna enseñanza destinataria.",
    commitments: "Los IES ordinarios deben descartarlo por falta de aplicabilidad.",
  },
  {
    id: "conexion-matematica",
    name: "Conexión Matemática",
    procedure: "11797",
    applicable: "Sí",
    audience: "Centros con las enseñanzas destinatarias previstas en la convocatoria.",
    preparation: "Elegir modalidad y prever la participación del profesorado responsable.",
    documentation: "La modalidad 2 exige adjuntar un Plan de actividades a la solicitud.",
    commitments: "En modalidad 1, participar en las sesiones de coordinación inicial y final.",
    specificSection: "6.3. Conexión Matemática",
  },
  {
    id: "coros",
    name: "Coros Escolares",
    procedure: "11723",
    applicable: "Sí",
    audience: "IES que puedan organizar el coro y asumir los compromisos del programa.",
    preparation: "Definir organización del coro, participantes y profesorado.",
    documentation: "Solicitud específica y anexos exigidos por el procedimiento.",
    commitments: "Participación en actuaciones y formación previstas.",
  },
  {
    id: "leer-juntos",
    name: "Leer Juntos",
    procedure: "11808",
    applicable: "Sí",
    audience: "Comunidad educativa, según modalidad y grupos constituidos.",
    preparation: "Elegir modalidad, grupos y sectores participantes; proponer responsable.",
    documentation: "Solicitud específica; después, Plan de lecturas con calendario, lecturas y participantes.",
    commitments: "Enviar el Plan de lecturas antes del 29 de enero de 2027.",
  },
  {
    id: "mundo-animal",
    name: "Mundo Animal",
    procedure: "11799",
    applicable: "Sí",
    audience: "Niveles admitidos por el programa dentro del centro.",
    preparation: "Determinar niveles participantes y viabilidad del trabajo propuesto.",
    documentation: "Solicitud específica y documentación justificativa requerida.",
    commitments: "Asumir el trabajo adicional alegado, cuando se utilice como criterio de selección.",
  },
  {
    id: "pale-ingles",
    name: "PALE - inglés",
    procedure: "11816",
    applicable: "Condicionado",
    audience: "Alumnado que curse curricularmente inglés y cumpla las condiciones de compatibilidad.",
    preparation: "Proyecto PALE, planes de actuación y profesorado con B2 o especialista.",
    documentation: "Proyecto con un plan por grupo o nivel; trámite independiente para inglés.",
    commitments: "Aplicarlo en materias no lingüísticas, sin alcanzar el 100 % y respetando incompatibilidades.",
    specificSection: "6.2. PALE",
  },
  {
    id: "pale-frances",
    name: "PALE - francés",
    procedure: "11819",
    applicable: "Condicionado",
    audience: "Alumnado que curse curricularmente francés y cumpla las condiciones de compatibilidad.",
    preparation: "Proyecto PALE, planes de actuación y profesorado con B2 o especialista.",
    documentation: "Proyecto con un plan por grupo o nivel; trámite independiente para francés.",
    commitments: "Aplicarlo en materias no lingüísticas, sin alcanzar el 100 % y respetando incompatibilidades.",
    specificSection: "6.2. PALE",
  },
  {
    id: "pale-aleman",
    name: "PALE - alemán",
    procedure: "11820",
    applicable: "Condicionado",
    audience: "Alumnado que curse curricularmente alemán y cumpla las condiciones de compatibilidad.",
    preparation: "Proyecto PALE, planes de actuación y profesorado con B2 o especialista.",
    documentation: "Proyecto con un plan por grupo o nivel; trámite independiente para alemán.",
    commitments: "Aplicarlo en materias no lingüísticas, sin alcanzar el 100 % y respetando incompatibilidades.",
    specificSection: "6.2. PALE",
  },
  {
    id: "perspicaz",
    name: "Perspicaz",
    procedure: "11811",
    applicable: "Sí",
    audience: "Especialmente alumnado de 3.º y 4.º de ESO.",
    preparation: "Confirmar profesorado del Departamento de Lengua y grupos participantes.",
    documentation: "Solicitud específica y documentos indicados en el procedimiento.",
    commitments: "Participar en la formación y desarrollar las actuaciones previstas.",
  },
  {
    id: "piva",
    name: "PIVA",
    procedure: "11798",
    applicable: "No",
    audience: "Infantil, Primaria y Educación Especial.",
    preparation: "No es aplicable con carácter general a un IES.",
    documentation: "Consultar la ficha solo si el centro imparte alguna enseñanza destinataria.",
    commitments: "Los IES ordinarios deben descartarlo por falta de aplicabilidad.",
  },
  {
    id: "poesia",
    name: "Poesía para llevar",
    procedure: "11809",
    applicable: "Sí",
    audience: "IES y otros centros destinatarios de la convocatoria.",
    preparation: "Identificar profesorado responsable y organizar la participación del centro.",
    documentation: "Solicitud mediante el procedimiento 11809 y documentación complementaria.",
    commitments: "Seleccionar, comentar y difundir poemas conforme al funcionamiento del programa.",
  },
  {
    id: "realidad-sostenible",
    name: "Realidad Sostenible",
    procedure: "11724",
    applicable: "Sí",
    audience: "Centros que opten por una de las dos modalidades.",
    preparation: "Elegir modalidad y prever un Comité de Sostenibilidad.",
    documentation: "Solicitud específica; tras la selección, Plan de Acción.",
    commitments: "Comité trimestral, Plan antes del 18 de noviembre y memoria específica.",
    specificSection: "6.4. Realidad Sostenible",
  },
  {
    id: "un-dia-de-cine",
    name: "Un día de cine",
    procedure: "11806",
    applicable: "Sí",
    audience: "Niveles y modalidades admitidos por el programa.",
    preparation: "Elegir niveles y modalidad; valorar sesiones y desplazamientos.",
    documentation: "Solicitud específica y documentación requerida.",
    commitments: "El centro gestiona y asume desplazamientos; en sesiones presenciales, cada alumno abona 1,50 €.",
    specificSection: "6.5. Costes, desplazamientos y compromisos materiales",
  },
  {
    id: "viaje-letras",
    name: "Viaje con las letras",
    procedure: "11807",
    applicable: "Sí",
    audience: "Grupos de 3.º y 4.º de ESO o Bachillerato.",
    preparation: "Proponer hasta seis autores o autoras y prever lectura previa de una obra.",
    documentation: "Solicitud específica; reflexión tras el encuentro y memoria final.",
    commitments: "Enviar la reflexión tras el encuentro y la memoria antes del 15 de julio de 2027.",
  },
  {
    id: "voces-lectoras",
    name: "Voces lectoras",
    procedure: "11794",
    applicable: "No",
    audience: "4.º de Primaria.",
    preparation: "No es aplicable con carácter general a un IES.",
    documentation: "Consultar la ficha solo si el centro imparte la enseñanza destinataria.",
    commitments: "Los IES ordinarios deben descartarlo por falta de aplicabilidad.",
  },
];

const commonProgramTimeline = [
  ["Junio–julio de 2026", "Valorar programas, destinatarios, profesorado, carga, costes y documentos.", "Relación de programas valorados."],
  ["Antes del 1 de septiembre", "Decidir solicitudes, designar responsable provisional y cerrar cada expediente.", "Expediente completo por programa."],
  ["2–18 de septiembre", "Registrar un trámite por programa; en PALE, uno por idioma.", "Justificante de registro."],
  ["Tras la presentación", "Vigilar notificaciones y atender la subsanación en el plazo indicado.", "Subsanación o constancia de no requerimiento."],
  ["Propuesta provisional", "Comprobar selección, exclusión, reserva o desistimiento; alegar en diez días hábiles si procede.", "Revisión y posible justificante de alegación."],
  ["Resolución definitiva", "Archivar la resolución, comunicar el resultado y nombrar responsable formal.", "Resolución y responsables identificados."],
  ["Octubre–noviembre", "Integrar lo concedido en PGA, programaciones, planes y calendario.", "Documentos institucionales actualizados."],
  ["Tercer trimestre", "Cumplimentar el seguimiento si lo remite la Administración.", "Formulario y justificante."],
  ["Final de curso", "Preparar una memoria por programa conforme al Anexo II.", "Memoria y justificante de envío."],
  ["Instrucciones posteriores", "Tramitar la certificación y comprobarla en PADDOC.", "Certificaciones comprobadas."],
] as const;

const areas: AreaDefinition[] = [
  {
    id: "organizacion-horarios",
    title: "Organización y horarios",
    description: "Horarios, cupos, grupos, guardias y organización del tiempo.",
    timing: "Inicio y todo el curso",
    guidance: "Úsalo para preparar el funcionamiento diario y comprobar las reglas que afectan a horarios, jornada, grupos y atención ordinaria.",
    keywords: ["horario", "jornada", "grupo", "guardia", "cupo", "periodo lectivo", "recreo"],
    eventTerms: ["horario", "organización", "inicio de curso"],
  },
  {
    id: "documentos-institucionales",
    title: "Documentos institucionales",
    description: "DOC, PGA, PEC, RRI, planes, programaciones y memoria.",
    timing: "Octubre–noviembre y cierre",
    guidance: "Reúne elaboración, aprobación, remisión, contenido y revisión de los principales documentos del centro.",
    keywords: ["documento de organización", "doc", "programación general anual", "pga", "proyecto educativo", "pec", "rri", "programación didáctica", "memoria"],
    eventTerms: ["doc", "pga", "documentación", "memoria"],
  },
  {
    id: "evaluacion",
    title: "Evaluación y titulación",
    description: "Evaluación, promoción, titulación, reclamaciones y documentos.",
    timing: "Según enseñanza",
    guidance: "Consulta aquí los procesos académicos que afectan a las sesiones, decisiones colegiadas, información a familias y revisión de calificaciones.",
    keywords: ["evaluación", "promoción", "titulación", "reclamación", "calificación", "sesión de evaluación", "acta"],
    eventTerms: ["evaluación", "promoción", "titulación", "reclamación"],
  },
  {
    id: "convivencia-igualdad",
    title: "Convivencia e igualdad",
    description: "Convivencia, igualdad, bienestar, protección y protocolos.",
    timing: "Todo el curso",
    guidance: "Agrupa las obligaciones preventivas, los órganos y los procedimientos vinculados al clima escolar y la protección del alumnado.",
    keywords: ["convivencia", "igualdad", "bienestar", "protección", "acoso", "violencia", "plan de igualdad"],
    eventTerms: ["convivencia", "igualdad", "bienestar"],
  },
  {
    id: "diversidad-inclusion",
    title: "Atención a la diversidad",
    description: "Inclusión, orientación, apoyos y respuesta educativa.",
    timing: "Planificación y seguimiento",
    guidance: "Permite localizar medidas, coordinación, documentación y decisiones relativas a la respuesta educativa inclusiva.",
    keywords: ["atención a la diversidad", "inclusión", "orientación", "apoyo", "acneae", "adaptación", "plan de atención"],
    eventTerms: ["diversidad", "inclusión", "orientación", "apoyo"],
  },
  {
    id: "funcionamiento-ordinario",
    title: "Funcionamiento ordinario",
    description: "Tutoría, coordinación, reuniones, familias y actividad diaria.",
    timing: "Todo el curso",
    guidance: "Es la entrada práctica para las tareas recurrentes del centro que no dependen de una única fecha administrativa.",
    keywords: ["tutoría", "tutor", "coordinación", "reunión", "familias", "departamento", "claustro", "consejo escolar"],
    eventTerms: ["tutor", "familias", "reunión", "coordinación"],
  },
  {
    id: "gestion-administrativa",
    title: "Gestión administrativa",
    description: "Remisiones, plataformas, expedientes, custodia y trámites.",
    timing: "Inicio y durante el curso",
    guidance: "Consulta los procedimientos de envío, registro, archivo y comunicación con la Administración educativa.",
    keywords: ["servicio provincial", "remisión", "plataforma", "expediente", "custodia", "secretaría", "registro", "sigad"],
    eventTerms: ["servicio provincial", "remisión", "plataforma", "expediente"],
  },
  {
    id: "programas-ensenanzas",
    title: "Programas y enseñanzas",
    description: "Programas educativos y enseñanzas con regulación específica.",
    timing: "Preparación desde verano",
    guidance: "Reúne convocatorias, requisitos y actuaciones de programas, además de las modalidades o enseñanzas que solo afectan a determinados centros.",
    keywords: ["programa educativo", "programas educativos", "convocatoria", "espad", "bachillerato en tres", "personas adultas", "aúna", "poesía para llevar"],
    eventTerms: ["programa", "aúna", "poesía", "espad", "bachillerato"],
  },
  {
    id: "calendario-escolar",
    title: "Calendario escolar",
    description: "Comienzo, fin, días lectivos, periodos y fechas comunes.",
    timing: "Curso completo",
    guidance: "Ofrece la información documental relacionada con la ordenación temporal del curso; para una vista diaria utiliza también el calendario maestro.",
    keywords: ["calendario escolar", "día lectivo", "inicio de las actividades", "finalización", "vacaciones", "festivo"],
    eventTerms: ["calendario escolar", "inicio", "finalización", "lectivo"],
  },
  {
    id: "cierre-curso",
    title: "Final y cierre de curso",
    description: "Memorias, evaluaciones finales, documentación y cierre.",
    timing: "Mayo–junio",
    guidance: "Agrupa lo que debe prepararse, aprobarse, remitirse o conservarse al concluir la actividad lectiva y administrativa.",
    keywords: ["final de curso", "fin de curso", "memoria final", "evaluación final", "cierre", "junio", "finalización"],
    eventTerms: ["final de curso", "memoria", "evaluación final", "cierre", "junio"],
  },
];

function Help({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="help">
      <summary aria-label={`Ayuda: ${title}`}>
        <span>?</span>
        {title}
      </summary>
      <div className="help-body">{children}</div>
    </details>
  );
}

function buildIcs(items: EventItem[]) {
  const clean = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
  const dayAfter = (value: string) => {
    const date = new Date(`${value}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10).replaceAll("-", "");
  };
  const body = items
    .map((item) => {
      const day = item.date.replaceAll("-", "");
      return [
        "BEGIN:VEVENT",
        `UID:${day}-${item.title.toLowerCase().replace(/\W+/g, "-")}@ies-aragon`,
        `DTSTART;VALUE=DATE:${day}`,
        ...(item.endDate
          ? [`DTEND;VALUE=DATE:${dayAfter(item.endDate)}`]
          : []),
        `SUMMARY:${clean(item.title)}`,
        `DESCRIPTION:${clean(
          `${item.detail} Responsable o emisor: ${item.responsibility}. Destinatario o vía: ${item.destination}. Referencia: ${item.source}`,
        )}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Guía operativa IES Aragón//ES\r\nCALSCALE:GREGORIAN\r\n${body}\r\nEND:VCALENDAR`;
}

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>(fallbackEvents);
  const [today] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
  });
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("Todos");
  const [teaching, setTeaching] = useState("Todas");
  const [program, setProgram] = useState("Todos");
  const [applicability, setApplicability] = useState("Todas");
  const [nature, setNature] = useState("Todas");
  const [coursePeriod, setCoursePeriod] = useState("Todos");
  const [timeStatus, setTimeStatus] = useState("Todos");
  const [view, setView] = useState<"lista" | "tabla" | "mes">("lista");
  const [calendarMonth, setCalendarMonth] = useState("2026-09");
  const [showIcsHelp, setShowIcsHelp] = useState(false);
  const [showCalendarBuilder, setShowCalendarBuilder] = useState(false);
  const [customCalendarName, setCustomCalendarName] = useState(
    "Calendario IES Aragón 2026-2027",
  );
  const [customTeachings, setCustomTeachings] = useState<string[]>([]);
  const [customAreas, setCustomAreas] = useState<string[]>([]);
  const [customPrograms, setCustomPrograms] = useState<string[]>([]);
  const [customIncludeGeneral, setCustomIncludeGeneral] = useState(true);
  const [customExcludedEvents, setCustomExcludedEvents] = useState<string[]>([]);
  const [documentQuery, setDocumentQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [searchError, setSearchError] = useState(false);
  const [repositorySync, setRepositorySync] = useState<
    "comprobando" | "sincronizado" | "copia-local"
  >("comprobando");
  const [selectedRecord, setSelectedRecord] = useState<SearchRecord | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [programQuery, setProgramQuery] = useState("");
  const [programApplicability, setProgramApplicability] = useState("Aplicables a IES");
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [agendaStart, setAgendaStart] = useState("2026-09-01");
  const [agendaEnd, setAgendaEnd] = useState("2026-09-30");
  const [checklistStatuses, setChecklistStatuses] = useState<Record<string, ChecklistStatus>>({});
  const [checklistNotes, setChecklistNotes] = useState<Record<string, string>>({});
  const [checklistQuery, setChecklistQuery] = useState("");
  const [checklistPhase, setChecklistPhase] = useState("Todas");
  const [checklistStatus, setChecklistStatus] = useState("Todos");
  const [checklistApplicability, setChecklistApplicability] = useState("Todas");
  const [checklistLoaded, setChecklistLoaded] = useState(false);
  const [checklistMessage, setChecklistMessage] = useState("");
  const [expandedChecklistTask, setExpandedChecklistTask] = useState<string | null>(null);
  const [selectedDiagramId, setSelectedDiagramId] = useState("doc");

  useEffect(() => {
    const loadJson = async <T,>(remoteName: string, localPath: string) => {
      try {
        const response = await fetch(`${repositoryDataBase}/${remoteName}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("La copia del repositorio no está disponible");
        return { data: (await response.json()) as T, remote: true };
      } catch {
        const response = await fetch(localPath);
        if (!response.ok) throw new Error("No se pudo cargar la copia local");
        return { data: (await response.json()) as T, remote: false };
      }
    };

    Promise.all([
      loadJson<SearchIndex>("search-index.json", "/search-index.json"),
      loadJson<EventItem[]>("calendar-events.json", "/calendar-events.json"),
    ])
      .then(([indexResult, calendarResult]) => {
        if (!Array.isArray(indexResult.data.records)) {
          throw new Error("Índice documental no válido");
        }
        if (!Array.isArray(calendarResult.data)) {
          throw new Error("Calendario no válido");
        }
        setSearchIndex(indexResult.data);
        setEvents(calendarResult.data);
        setRepositorySync(
          indexResult.remote && calendarResult.remote
            ? "sincronizado"
            : "copia-local",
        );
      })
      .catch(() => {
        setSearchError(true);
        setRepositorySync("copia-local");
      });

    const localStateTimer = window.setTimeout(() => {
      const savedPrograms = window.localStorage.getItem("guia-ies-programas-seleccionados");
      if (savedPrograms) {
        try {
          const parsed = JSON.parse(savedPrograms);
          if (Array.isArray(parsed)) {
            setSelectedPrograms(parsed.filter((id) => programs.some((item) => item.id === id)));
          }
        } catch {
          window.localStorage.removeItem("guia-ies-programas-seleccionados");
        }
      }

      const savedChecklist = window.localStorage.getItem("guia-ies-checklist-inicio-2026-2027");
      if (savedChecklist) {
        try {
          const parsed = JSON.parse(savedChecklist) as ChecklistSavedState;
          if (parsed.version === 1 && parsed.statuses && parsed.notes) {
            const validIds = new Set(checklistTasks.map((task) => task.id));
            setChecklistStatuses(
              Object.fromEntries(
                Object.entries(parsed.statuses).filter(
                  ([id, status]) =>
                    validIds.has(id) && Object.hasOwn(checklistStatusLabels, status),
                ),
              ),
            );
            setChecklistNotes(
              Object.fromEntries(
                Object.entries(parsed.notes).filter(
                  ([id, note]) => validIds.has(id) && typeof note === "string",
                ),
              ),
            );
          }
        } catch {
          window.localStorage.removeItem("guia-ies-checklist-inicio-2026-2027");
        }
      }
      setChecklistLoaded(true);
    }, 0);

    return () => window.clearTimeout(localStateTimer);
  }, []);

  const upcomingHighlights = useMemo(() => {
    if (!today) return [];
    return events
      .filter((event) => (event.endDate ?? event.date) >= today)
      .sort((a, b) => {
        const aActive = a.date <= today && (a.endDate ?? a.date) >= today;
        const bActive = b.date <= today && (b.endDate ?? b.date) >= today;
        if (aActive !== bActive) return aActive ? -1 : 1;
        return a.date.localeCompare(b.date);
      })
      .slice(0, 3);
  }, [events, today]);

  const formattedUpdateDate = useMemo(() => {
    if (!searchIndex?.generatedAt) return null;
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(searchIndex.generatedAt));
  }, [searchIndex]);

  useEffect(() => {
    window.localStorage.setItem(
      "guia-ies-programas-seleccionados",
      JSON.stringify(selectedPrograms),
    );
  }, [selectedPrograms]);

  useEffect(() => {
    if (!checklistLoaded) return;
    const saved: ChecklistSavedState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      statuses: checklistStatuses,
      notes: checklistNotes,
    };
    window.localStorage.setItem(
      "guia-ies-checklist-inicio-2026-2027",
      JSON.stringify(saved),
    );
  }, [checklistLoaded, checklistNotes, checklistStatuses]);

  const documentResults = useMemo(() => {
    const normalized = normalizeSearch(documentQuery.trim());
    if (!normalized || !searchIndex) return [];
    const terms = normalized.split(/\s+/).filter(Boolean);
    return searchIndex.records
      .map((record) => {
        const title = normalizeSearch(
          `${record.title ?? ""} ${record.section} ${record.document} ${record.kind}`,
        );
        const body = normalizeSearch(record.text);
        if (!terms.every((term) => title.includes(term) || body.includes(term))) {
          return null;
        }
        const score = terms.reduce(
          (total, term) =>
            total +
            (normalizeSearch(record.section).includes(term) ? 8 : 0) +
            (normalizeSearch(record.title ?? "").includes(term) ? 12 : 0) +
            (normalizeSearch(record.document).includes(term) ? 4 : 0) +
            (body.includes(term) ? 1 : 0),
          0,
        );
        return { record, score };
      })
      .filter(
        (result): result is { record: SearchRecord; score: number } =>
          result !== null,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
  }, [documentQuery, searchIndex]);

  const selectedArea = areas.find((item) => item.id === selectedAreaId) ?? null;
  const selectedProgram = programs.find((item) => item.id === selectedProgramId) ?? null;
  const selectedDiagram =
    processDiagrams.find((item) => item.id === selectedDiagramId) ?? processDiagrams[0];
  const diagramSources = useMemo(() => {
    if (!searchIndex) return [];
    return searchIndex.records
      .map((record) => {
        const haystack = normalizeSearch(
          `${record.title ?? ""} ${record.section} ${record.document} ${record.text}`,
        );
        const score = selectedDiagram.sourceTerms.reduce(
          (total, term) => total + (haystack.includes(normalizeSearch(term)) ? 1 : 0),
          0,
        );
        return { record, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => item.record);
  }, [searchIndex, selectedDiagram]);

  const filteredChecklistTasks = useMemo(() => {
    const term = normalizeSearch(checklistQuery);
    return checklistTasks.filter((task) => {
      const status = checklistStatuses[task.id] ?? "no-iniciada";
      return (
        (!term ||
          normalizeSearch(
            `${task.title} ${task.phase} ${task.timing} ${task.responsibility} ${task.evidence} ${task.detail} ${task.reference}`,
          ).includes(term)) &&
        (checklistPhase === "Todas" || task.phase === checklistPhase) &&
        (checklistStatus === "Todos" || status === checklistStatus) &&
        (checklistApplicability === "Todas" ||
          task.applicability === checklistApplicability)
      );
    });
  }, [
    checklistApplicability,
    checklistPhase,
    checklistQuery,
    checklistStatus,
    checklistStatuses,
  ]);

  const checklistProgress = useMemo(() => {
    const completed = checklistTasks.filter(
      (task) => checklistStatuses[task.id] === "terminada",
    ).length;
    const preparing = checklistTasks.filter(
      (task) => checklistStatuses[task.id] === "en-preparacion",
    ).length;
    const blocked = checklistTasks.filter(
      (task) => checklistStatuses[task.id] === "bloqueada",
    ).length;
    return {
      completed,
      preparing,
      blocked,
      percentage: Math.round((completed / checklistTasks.length) * 100),
    };
  }, [checklistStatuses]);

  const checklistSourceFor = (task: ChecklistTask) =>
    searchIndex?.records.find(
      (record) =>
        record.kind === "Lista de control" &&
        record.section === task.sourceSection,
    );

  const downloadChecklist = () => {
    const saved: ChecklistSavedState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      statuses: checklistStatuses,
      notes: checklistNotes,
    };
    const blob = new Blob([JSON.stringify(saved, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "checklist-inicio-curso-ies-aragon-2026-2027.json";
    link.click();
    URL.revokeObjectURL(link.href);
    setChecklistMessage("Copia local exportada correctamente.");
  };

  const importChecklist = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ChecklistSavedState;
        if (parsed.version !== 1 || !parsed.statuses || !parsed.notes) {
          throw new Error("Formato no reconocido");
        }
        const validIds = new Set(checklistTasks.map((task) => task.id));
        const statuses = Object.fromEntries(
          Object.entries(parsed.statuses).filter(
            ([id, status]) =>
              validIds.has(id) && Object.hasOwn(checklistStatusLabels, status),
          ),
        );
        const notes = Object.fromEntries(
          Object.entries(parsed.notes).filter(
            ([id, note]) => validIds.has(id) && typeof note === "string",
          ),
        );
        setChecklistStatuses(statuses);
        setChecklistNotes(notes);
        setChecklistMessage("Copia importada. Se han restaurado estados y notas.");
      } catch {
        setChecklistMessage("No se pudo importar: el archivo no es una copia válida de esta checklist.");
      }
    };
    reader.readAsText(file);
  };

  const resetChecklist = () => {
    if (
      !window.confirm(
        "¿Quieres borrar todos los estados y notas guardados en este navegador? Esta acción no se puede deshacer salvo que hayas exportado una copia.",
      )
    ) {
      return;
    }
    setChecklistStatuses({});
    setChecklistNotes({});
    setChecklistMessage("Lista reiniciada.");
  };

  const printChecklist = () => {
    document.body.classList.add("printing-checklist");
    window.addEventListener(
      "afterprint",
      () => document.body.classList.remove("printing-checklist"),
      { once: true },
    );
    window.print();
  };

  const programResults = useMemo(() => {
    const term = normalizeSearch(programQuery);
    return programs.filter((item) => {
      const matchesQuery =
        !term ||
        normalizeSearch(
          `${item.name} ${item.procedure} ${item.audience} ${item.preparation} ${item.commitments}`,
        ).includes(term);
      const matchesApplicability =
        programApplicability === "Todos" ||
        (programApplicability === "Aplicables a IES" && item.applicable !== "No") ||
        item.applicable === programApplicability;
      return matchesQuery && matchesApplicability;
    });
  }, [programApplicability, programQuery]);

  const programSourceRecords = useMemo(() => {
    if (!selectedProgram || !searchIndex) return [];
    const exact = searchIndex.records.filter(
      (record) =>
        record.kind === "Programa educativo" &&
        (record.title === selectedProgram.name ||
          (selectedProgram.specificSection && record.section === selectedProgram.specificSection)),
    );
    const commonSections = new Set([
      "1. Naturaleza y prioridad operativa",
      "3. Calendario común de la convocatoria",
      "4. Circuito de preparación y decisión en el centro",
      "6.1. Solicitud electrónica",
      "8. Contenido mínimo de la memoria final",
      "9. Checklist mínima por cada programa solicitado",
    ]);
    return [...exact, ...searchIndex.records.filter(
      (record) => record.kind === "Programa educativo" && commonSections.has(record.section),
    )].filter(
      (record, index, all) => all.findIndex((candidate) => candidate.id === record.id) === index,
    );
  }, [searchIndex, selectedProgram]);

  const selectedProgramDefinitions = useMemo(
    () => programs.filter((item) => selectedPrograms.includes(item.id)),
    [selectedPrograms],
  );

  const selectedProgramEvents = useMemo(() => {
    if (!selectedPrograms.length) return [];
    const names = selectedProgramDefinitions.map((item) => normalizeSearch(item.name.replace(/ - .+$/, "")));
    return events.filter((event) => {
      const haystack = normalizeSearch(`${event.program} ${event.title} ${event.detail}`);
      return names.some((name) => haystack.includes(name));
    });
  }, [events, selectedProgramDefinitions, selectedPrograms.length]);

  const areaRecords = useMemo(() => {
    if (!selectedArea || !searchIndex) return [];
    return searchIndex.records
      .map((record) => {
        const heading = normalizeSearch(`${record.section} ${record.title ?? ""} ${record.document}`);
        const body = normalizeSearch(record.text);
        const score = selectedArea.keywords.reduce(
          (total, keyword) => {
            const term = normalizeSearch(keyword);
            return total + (heading.includes(term) ? 8 : 0) + (body.includes(term) ? 2 : 0);
          },
          0,
        );
        return { record, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.record);
  }, [searchIndex, selectedArea]);

  const areaTasks = useMemo(() => {
    const preferredKinds = new Set(["Obligaciones", "Lista de control", "Clasificación", "Instrucciones"]);
    const preferred = areaRecords.filter((record) => preferredKinds.has(record.kind));
    return (preferred.length >= 8 ? preferred : areaRecords).slice(0, 12);
  }, [areaRecords]);

  const areaDocuments = useMemo(() => {
    const seen = new Set<string>();
    return areaRecords.filter((record) => {
      if (seen.has(record.document)) return false;
      seen.add(record.document);
      return true;
    }).slice(0, 8);
  }, [areaRecords]);

  const areaEvents = useMemo(() => {
    if (!selectedArea) return [];
    return events.filter((event) => {
      const haystack = normalizeSearch(
        `${event.title} ${event.detail} ${event.area} ${event.scope} ${event.program}`,
      );
      return selectedArea.eventTerms.some((term) => haystack.includes(normalizeSearch(term)));
    }).slice(0, 10);
  }, [events, selectedArea]);

  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query.trim());
    const today = new Date().toISOString().slice(0, 10);
    const statusFor = (event: EventItem) => {
      const end = event.endDate ?? event.date;
      if (end < today) return "Finalizado";
      if (event.date <= today && end >= today) return "Abierto";
      return "Próximo";
    };
    return events.filter(
      (event) =>
        (area === "Todos" || event.area === area) &&
        (teaching === "Todas" || event.teachings.includes(teaching)) &&
        (program === "Todos" || event.program === program) &&
        (applicability === "Todas" ||
          (applicability === "General"
            ? normalizeSearch(event.scope).includes("todos los centros")
            : !normalizeSearch(event.scope).includes("todos los centros"))) &&
        (nature === "Todas" || event.nature === nature) &&
        (coursePeriod === "Todos" || event.coursePeriod === coursePeriod) &&
        (timeStatus === "Todos" || statusFor(event) === timeStatus) &&
        (!normalized ||
          normalizeSearch(
            [
              event.title,
              event.detail,
              event.area,
              event.scope,
              event.source,
              event.dateLabel,
              event.responsibility,
              event.destination,
              ...event.teachings,
            ].join(" "),
          ).includes(normalized)),
    );
  }, [applicability, area, coursePeriod, events, nature, program, query, teaching, timeStatus]);

  const monthItems = useMemo(
    () =>
      filtered.filter((event) => {
        const monthStart = `${calendarMonth}-01`;
        const monthEndDate = new Date(`${monthStart}T00:00:00Z`);
        monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
        monthEndDate.setUTCDate(0);
        const monthEnd = monthEndDate.toISOString().slice(0, 10);
        return event.date <= monthEnd && (event.endDate ?? event.date) >= monthStart;
      }),
    [calendarMonth, filtered],
  );

  const monthDays = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const mondayOffset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    return [
      ...Array.from({ length: mondayOffset }, () => null),
      ...Array.from({ length: days }, (_, index) => index + 1),
    ];
  }, [calendarMonth]);

  const itemsForDay = (day: number) => {
    const date = `${calendarMonth}-${String(day).padStart(2, "0")}`;
    return monthItems.filter(
      (event) => event.date <= date && (event.endDate ?? event.date) >= date,
    );
  };

  const resetCalendarFilters = () => {
    setQuery("");
    setArea("Todos");
    setTeaching("Todas");
    setProgram("Todos");
    setApplicability("Todas");
    setNature("Todas");
    setCoursePeriod("Todos");
    setTimeStatus("Todos");
  };

  const agendaItems = useMemo(() => {
    if (!agendaStart || !agendaEnd || agendaStart > agendaEnd) return [];
    return events
      .filter((event) => {
        const eventEnd = event.endDate ?? event.date;
        return event.date <= agendaEnd && eventEnd >= agendaStart;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [agendaEnd, agendaStart, events]);

  const setUpcomingPeriod = (days: number) => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    const asDateInput = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;
    setAgendaStart(asDateInput(start));
    setAgendaEnd(asDateInput(end));
  };

  const formatSelectedPeriod = (value: string) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));

  const downloadIcs = () => {
    const blob = new Blob([buildIcs(filtered)], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "calendario-ies-aragon-2026-2027.ics";
    link.click();
    URL.revokeObjectURL(link.href);
    setShowIcsHelp(true);
  };

  const customCalendarEvents = useMemo(
    () =>
      events.filter((event) => {
        const teachingMatch =
          customTeachings.length === 0 ||
          event.teachings.some((item) => customTeachings.includes(item)) ||
          (customIncludeGeneral && event.teachings.length === 0);
        const areaMatch =
          customAreas.length === 0 || customAreas.includes(event.area);
        const programMatch =
          customPrograms.length === 0 ||
          (event.program && customPrograms.includes(event.program));
        return (
          teachingMatch &&
          areaMatch &&
          programMatch &&
          !customExcludedEvents.includes(event.id)
        );
      }),
    [
      customAreas,
      customExcludedEvents,
      customIncludeGeneral,
      customPrograms,
      customTeachings,
      events,
    ],
  );

  const toggleCustomValue = (
    value: string,
    selected: string[],
    setSelected: (values: string[]) => void,
  ) =>
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );

  const downloadCustomIcs = () => {
    const safeName =
      customCalendarName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "calendario-personalizado";
    const blob = new Blob([buildIcs(customCalendarEvents)], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${safeName}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
    setShowIcsHelp(true);
  };

  const csvCell = (value: unknown) =>
    `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob(["\ufeff", content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const downloadCsv = (headers: string[], rows: unknown[][], filename: string) =>
    downloadFile(
      [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n"),
      filename,
      "text/csv;charset=utf-8",
    );

  const printSection = (className: string) => {
    document.body.classList.add(className);
    const cleanup = () => document.body.classList.remove(className);
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 800);
  };

  const downloadCalendarCsv = () =>
    downloadCsv(
      ["Fecha inicial", "Fecha final", "Actuación", "Ámbito", "Enseñanzas", "Programa", "Aplicabilidad", "Naturaleza", "Periodo", "Responsable o emisor", "Destinatario o vía", "Detalle", "Referencia"],
      filtered.map((event) => [
        event.date,
        event.endDate ?? event.date,
        event.title,
        event.area,
        event.teachings.join(", "),
        event.program,
        event.scope,
        event.nature,
        event.coursePeriod,
        event.responsibility,
        event.destination,
        event.detail,
        event.source,
      ]),
      "calendario-filtrado-ies-aragon-2026-2027.csv",
    );

  const downloadAgendaCsv = () =>
    downloadCsv(
      ["Fecha inicial", "Fecha final", "Fecha visible", "Actuación", "Ámbito", "Responsable o emisor", "Detalle", "Referencia"],
      agendaItems.map((event) => [
        event.date,
        event.endDate ?? event.date,
        event.dateLabel,
        event.title,
        event.area,
        event.responsibility,
        event.detail,
        event.source,
      ]),
      `agenda-${agendaStart}-${agendaEnd}.csv`,
    );

  const downloadChecklistCsv = () =>
    downloadCsv(
      ["Fase", "Tarea", "Plazo", "Estado", "Aplicabilidad", "Responsable institucional", "Evidencia de cierre", "Qué comprobar", "Referencia", "Notas locales"],
      filteredChecklistTasks.map((task) => [
        task.phase,
        task.title,
        task.timing,
        checklistStatusLabels[checklistStatuses[task.id] ?? "no-iniciada"],
        task.applicability,
        task.responsibility,
        task.evidence,
        task.detail,
        task.reference,
        checklistNotes[task.id] ?? "",
      ]),
      "checklist-filtrada-inicio-curso-ies-aragon-2026-2027.csv",
    );

  const downloadAreaCsv = () => {
    if (!selectedArea) return;
    const taskRows = areaTasks.map((record) => [
      "Tarea o criterio",
      record.kind,
      record.title ?? record.section,
      getExplicitResponsibility(record) ?? "No determinado por la fuente",
      record.document,
      record.section,
      highlightedSnippet(record.text, selectedArea.keywords[0]),
    ]);
    const eventRows = areaEvents.map((event) => [
      "Fecha",
      event.dateLabel,
      event.title,
      event.responsibility,
      event.source,
      event.area,
      event.detail,
    ]);
    downloadCsv(
      ["Tipo", "Clasificación o fecha", "Título", "Responsable u órgano", "Documento o referencia", "Apartado o ámbito", "Contenido"],
      [...taskRows, ...eventRows],
      `ambito-${selectedArea.id}-ies-aragon-2026-2027.csv`,
    );
  };

  const downloadProgramsCsv = () =>
    downloadCsv(
      ["Programa", "Procedimiento", "Aplicabilidad a IES", "Destinatarios", "Preparación", "Documentación", "Compromisos"],
      selectedProgramDefinitions.map((item) => [
        item.name,
        item.procedure,
        item.applicable,
        item.audience,
        item.preparation,
        item.documentation,
        item.commitments,
      ]),
      "programas-seleccionados-ies-aragon-2026-2027.csv",
    );

  const downloadDiagramCsv = () =>
    downloadCsv(
      ["Esquema", "Paso", "Actuación", "Descripción", "Responsable u órgano", "Evidencia"],
      selectedDiagram.steps.map((step) => [
        selectedDiagram.title,
        step.label,
        step.title,
        step.description,
        step.actor,
        step.evidence,
      ]),
      `esquema-${selectedDiagram.id}-ies-aragon-2026-2027.csv`,
    );

  const printSelectedDiagram = () => {
    printSection("printing-diagram");
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Ir al inicio">
          <span className="brand-mark">A</span>
          <span>
            <strong>Guía operativa IES Aragón</strong>
            <small>Curso 2026/2027</small>
          </span>
        </a>
        <nav aria-label="Navegación principal">
          <a href="#consulta">Buscar</a>
          <a href="#calendario">Calendario</a>
          <a href="#ambitos">Ámbitos</a>
          <a href="#checklist">Checklist</a>
          <a href="#programas">Programas</a>
          <a href="#esquemas">Esquemas</a>
          <a href="#uso-y-licencia">Uso y licencia</a>
          <a
            className="source-link"
            href="https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027"
            target="_blank"
            rel="noreferrer"
          >
            Fuentes
          </a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-copy">
          <p className="eyebrow">Una herramienta pública para equipos directivos</p>
          <h1>Todo el curso, más claro y más fácil de organizar.</h1>
          <p className="lead">
            Consulta plazos, obligaciones y actuaciones de las instrucciones de
            inicio de curso de los IES de Aragón desde una única guía cómoda,
            trazable y preparada para el trabajo diario.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#consulta">
              Buscar en toda la guía
            </a>
            <a className="button secondary" href="#ambitos">
              Explorar por ámbitos
            </a>
          </div>
          <Help title="¿Para qué sirve esta guía?">
            <p>
              Ordena la información oficial para localizar rápidamente qué hay
              que hacer, cuándo y dónde comprobarlo. No sustituye a las
              instrucciones ni al PDF oficial: cada actuación conserva su
              referencia de origen.
            </p>
          </Help>
        </div>
        <aside className="priority-card" aria-label="Próximos hitos del calendario">
          <div className="card-heading">
            <span className="status-dot" />
            <span>Próximos hitos</span>
            <small>{today ? "Actualizados hoy" : "Calculando…"}</small>
          </div>
          {upcomingHighlights.map((event) => (
            <button
              className="priority-item priority-button"
              key={event.id}
              onClick={() => setSelectedRecord(event.sourceRecord)}
            >
              <time dateTime={event.date}>{event.dateLabel}</time>
              <span>
                <strong>{event.title}</strong>
                <span>{event.area} · {event.responsibility}</span>
              </span>
            </button>
          ))}
          {!upcomingHighlights.length && (
            <p className="priority-empty">
              {today ? "No quedan hitos fechados en este curso." : "Calculando los próximos hitos…"}
            </p>
          )}
          <a className="verified verified-link" href="#calendario">
            Ver el calendario completo y sus fuentes →
          </a>
        </aside>
      </section>

      <section className="trust-strip" aria-label="Características de la guía">
        <span><b>{searchIndex?.documentCount ?? "…"}</b> documentos públicos indexados</span>
        <span><b>{searchIndex?.records.length.toLocaleString("es-ES") ?? "…"}</b> fragmentos consultables</span>
        <span><b>{events.length}</b> actuaciones fechadas</span>
        <span><b>{formattedUpdateDate ? `Actualizada el ${formattedUpdateDate}` : "Comprobando actualización"}</b></span>
        <span>
          <b>
            {repositorySync === "sincronizado"
              ? "Sincronizada con el repositorio"
              : repositorySync === "copia-local"
                ? "Copia local de respaldo"
                : "Comprobando sincronización"}
          </b>
        </span>
      </section>

      <aside className="official-notice" aria-labelledby="official-notice-title">
        <div>
          <p className="eyebrow">Aviso esencial</p>
          <h2 id="official-notice-title">Comprueba siempre la fuente oficial</h2>
          <p>
            Esta web es un instrumento de apoyo organizativo y puede contener
            errores. No es una publicación oficial ni sustituye las
            Instrucciones de inicio de curso. Antes de aplicar cualquier fecha,
            dato o indicación, contrástalo con el documento oficial y con sus
            posibles modificaciones posteriores.
          </p>
        </div>
        <a
          className="button official-button"
          href="https://educa.aragon.es/documents/20126/6844128/CSVFV61LMW0LZ120XFIL%2BInstrucciones%2Bcurso%2B2026-2027%2Bpara%2Bcentros%2Beducativos._03%2BIES%2B2026-2027%2BV8-%28Instrucciones%29.pdf/ff9b76e8-b92f-291b-b736-6f093187162c?t=1784615539858"
          target="_blank"
          rel="noreferrer"
        >
          Abrir las Instrucciones oficiales (PDF)
        </a>
      </aside>

      <section className="editorial-status" aria-label="Estado y alcance de la guía">
        <div>
          <p className="eyebrow">Estado de la información</p>
          <h2>Una portada que se actualiza con los datos de la guía</h2>
        </div>
        <div className="status-grid">
          <article>
            <strong className="status-badge status-ready">
              {repositorySync === "sincronizado" ? "Sincronizado" : "Disponible"}
            </strong>
            <h3>Índice documental</h3>
            <p>
              {searchError
                ? "El índice no ha podido cargarse en este momento."
                : searchIndex
                  ? `${searchIndex.documentCount} documentos preparados para consulta, con referencia de procedencia. ${
                      repositorySync === "sincronizado"
                        ? "Los datos proceden de la última regeneración automática del repositorio público."
                        : "Se está utilizando la copia estable incluida en esta versión."
                    }`
                  : "Comprobando el índice documental…"}
            </p>
          </article>
          <article>
            <strong className="status-badge status-ready">Operativo</strong>
            <h3>Calendario del curso</h3>
            <p>{events.length} actuaciones estructuradas; los próximos hitos se calculan automáticamente según la fecha.</p>
          </article>
          <article>
            <strong className="status-badge status-caution">Alcance</strong>
            <h3>Guía de apoyo</h3>
            <p>Organiza fuentes públicas y facilita su consulta. No sustituye la normativa, las instrucciones oficiales ni sus posibles actualizaciones.</p>
          </article>
        </div>
        <Help title="¿Cómo interpretar la fecha de actualización?">
          <p>
            Indica cuándo se generó el índice documental que alimenta el buscador
            y las fichas. El repositorio regenera automáticamente el índice y el
            calendario cuando cambian sus documentos; la guía consulta esa
            versión y conserva una copia local de respaldo. Los hitos de la
            portada se recalculan al abrirla para mostrar los siguientes que
            siguen vigentes.
          </p>
        </Help>
      </section>

      <section className="section search-section" id="consulta">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Consulta general</p>
            <h2>Busca en toda la documentación</h2>
            <p>
              Localiza programas, obligaciones, procedimientos, conceptos y
              plazos en el conjunto de documentos públicos, no solo en el
              calendario.
            </p>
          </div>
          <Help title="¿Qué consulta este buscador?">
            <p>
              Revisa las instrucciones organizadas por secciones, los
              calendarios, las obligaciones, las listas de control, los
              programas educativos y las plantillas públicas. Admite búsquedas
              con o sin tilde: «poesia» y «poesía» ofrecen los mismos
              resultados.
            </p>
          </Help>
        </div>

        <div className="document-search">
          <label className="search search-large">
            <span>⌕</span>
            <input
              value={documentQuery}
              onChange={(event) => setDocumentQuery(event.target.value)}
              placeholder="Prueba con «Poesía para llevar», «guardias», «PGA»…"
              aria-label="Buscar en toda la documentación"
            />
          </label>
          {documentQuery && (
            <button className="text-button" onClick={() => setDocumentQuery("")}>
              Borrar
            </button>
          )}
        </div>

        {!documentQuery && (
          <div className="search-welcome">
            <strong>
              {searchIndex
                ? `${searchIndex.documentCount} documentos públicos preparados para consulta`
                : "Preparando el índice documental…"}
            </strong>
            <span>
              Escribe una expresión concreta. Los resultados indicarán qué
              clase de información has encontrado y su documento de origen.
            </span>
          </div>
        )}

        {documentQuery && documentResults.length > 0 && (
          <>
            <p className="document-results-count">
              {documentResults.length} resultados más relevantes
            </p>
            <div className="document-results">
              {documentResults.map(({ record }) => (
                <article className="document-result" key={record.id}>
                  <div className="result-tags">
                    <span>{record.kind}</span>
                    <small>
                      {record.title ? `${record.section} · ` : ""}
                      {record.document}
                    </small>
                  </div>
                  <h3>{record.title ?? record.section}</h3>
                  {getExplicitResponsibility(record) && (
                    <p className="result-responsibility">
                      <strong>Responsable u órgano indicado:</strong>{" "}
                      {getExplicitResponsibility(record)}
                    </p>
                  )}
                  <p>{highlightedSnippet(record.text, documentQuery)}</p>
                  <button
                    className="result-open"
                    onClick={() => setSelectedRecord(record)}
                  >
                    Ver información y fuente <span>→</span>
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {documentQuery && searchIndex && documentResults.length === 0 && (
          <div className="empty">
            No aparece esa expresión en la documentación indexada. Prueba una
            palabra más breve o un término relacionado.
          </div>
        )}

        {searchError && (
          <div className="empty">
            El índice documental no ha podido cargarse. El calendario sigue
            disponible y puedes consultar las fuentes desde el repositorio.
          </div>
        )}
      </section>

      {selectedRecord && (
        <div
          className="source-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedRecord(null);
          }}
        >
          <section
            className="source-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-modal-title"
          >
            <div className="source-modal-heading">
              <div>
                <p className="eyebrow">Información y verificación</p>
                <h2 id="source-modal-title">
                  {selectedRecord.title ?? selectedRecord.section}
                </h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setSelectedRecord(null)}
                aria-label="Cerrar la ficha"
              >
                ×
              </button>
            </div>

            <dl className="source-metadata">
              <div>
                <dt>Documento</dt>
                <dd>{selectedRecord.document}</dd>
              </div>
              <div>
                <dt>Apartado</dt>
                <dd>{selectedRecord.section}</dd>
              </div>
              {getExplicitResponsibility(selectedRecord) && (
                <div className="responsibility-row">
                  <dt>Responsable u órgano indicado</dt>
                  <dd>{getExplicitResponsibility(selectedRecord)}</dd>
                </div>
              )}
            </dl>

            <div className="source-excerpt">
              <strong>Información recogida en la fuente</strong>
              <p>{selectedRecord.text}</p>
            </div>

            <div className="source-modal-actions">
              <button
                className="button primary"
                onClick={() => setSelectedRecord(null)}
              >
                Volver a los resultados
              </button>
              <a
                className="technical-source"
                href={selectedRecord.url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir archivo técnico original (GitHub)
              </a>
            </div>
            <p className="technical-note">
              No necesitas abrir GitHub para consultar esta información. Ese
              enlace se conserva únicamente para quien quiera comprobar el
              archivo exacto y su historial público.
            </p>
          </section>
        </div>
      )}

      <section className="section soft calendar-section" id="calendario">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Calendario maestro</p>
            <h2>Consulta los hitos con fecha</h2>
            <p>
              Esta vista está reservada a las actuaciones que tienen fecha o
              periodo. Para buscar cualquier contenido, utiliza el buscador
              general anterior.
            </p>
          </div>
          <Help title="Cómo usar los filtros">
            <p>
              Escribe, por ejemplo, «DOC», «Bachillerato» o «noviembre». Puedes
              combinar la búsqueda con un ámbito. El botón «Limpiar» devuelve
              la lista completa.
            </p>
          </Help>
        </div>

        <div className="agenda-builder" id="agenda-periodo">
          <div className="agenda-intro">
            <div>
              <p className="eyebrow">Agenda por periodo</p>
              <h3>Genera una tabla sencilla de fechas</h3>
              <p>
                Elige un intervalo o usa uno de los periodos rápidos. La tabla
                reúne únicamente las actuaciones relevantes comprendidas en
                esas fechas.
              </p>
            </div>
            <Help title="¿Para qué puede servirme?">
              <p>
                Puedes consultarla al preparar una reunión, imprimirla como
                recordatorio o copiar sus filas a un documento de trabajo. Los
                periodos de varios días aparecen una sola vez con su intervalo
                completo.
              </p>
            </Help>
          </div>

          <div className="agenda-controls">
            <label>
              <span>Desde</span>
              <input
                type="date"
                value={agendaStart}
                onChange={(event) => setAgendaStart(event.target.value)}
              />
            </label>
            <label>
              <span>Hasta</span>
              <input
                type="date"
                value={agendaEnd}
                min={agendaStart}
                onChange={(event) => setAgendaEnd(event.target.value)}
              />
            </label>
            <div className="quick-periods" aria-label="Periodos rápidos">
              <button onClick={() => setUpcomingPeriod(14)}>
                Próximas 2 semanas
              </button>
              <button onClick={() => setUpcomingPeriod(28)}>
                Próximas 4 semanas
              </button>
            </div>
            <button className="button agenda-print" onClick={() => printSection("printing-agenda")}>
              Imprimir / PDF
            </button>
            <button className="button agenda-print" onClick={downloadAgendaCsv} disabled={!agendaItems.length}>
              Descargar CSV
            </button>
          </div>

          {agendaStart && agendaEnd && agendaStart <= agendaEnd ? (
            <>
              <p className="agenda-summary">
                <strong>{agendaItems.length}</strong>{" "}
                {agendaItems.length === 1 ? "actuación" : "actuaciones"} entre el{" "}
                {formatSelectedPeriod(agendaStart)} y el{" "}
                {formatSelectedPeriod(agendaEnd)}
              </p>
              {agendaItems.length > 0 ? (
                <div className="agenda-table-wrap">
                  <table className="agenda-table">
                    <thead>
                      <tr>
                        <th>Fecha relevante</th>
                        <th>Documento, programa o tarea</th>
                        <th>Ámbito / fuente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendaItems.map((event) => (
                        <tr key={`agenda-${event.date}-${event.title}`}>
                          <td>
                            <time dateTime={event.date}>{event.dateLabel}</time>
                          </td>
                          <td>
                            <strong>{event.title}</strong>
                            <small>{event.detail}</small>
                            <small><b>Responsable:</b> {event.responsibility}</small>
                          </td>
                          <td>
                            <span className="agenda-area">{event.area}</span>
                            <small>{event.source}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty agenda-empty">
                  No hay todavía fechas registradas en este intervalo. Al
                  ampliar el calendario, las nuevas actuaciones aparecerán aquí
                  automáticamente.
                </div>
              )}
            </>
          ) : (
            <div className="empty agenda-empty">
              La fecha final debe ser igual o posterior a la fecha inicial.
            </div>
          )}
        </div>

        <div className="toolbar">
          <label className="search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar una actuación, enseñanza o referencia…"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por ámbito</span>
            <select value={area} onChange={(event) => setArea(event.target.value)}>
              <option>Todos</option>
              {[...new Set(events.map((item) => item.area))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por enseñanza</span>
            <select value={teaching} onChange={(event) => setTeaching(event.target.value)}>
              <option>Todas</option>
              {[...new Set(events.flatMap((item) => item.teachings))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por aplicabilidad</span>
            <select value={applicability} onChange={(event) => setApplicability(event.target.value)}>
              <option>Todas</option>
              <option>General</option>
              <option>Específica / condicional</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por programa</span>
            <select value={program} onChange={(event) => setProgram(event.target.value)}>
              <option>Todos</option>
              {[...new Set(events.map((item) => item.program).filter(Boolean))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por naturaleza</span>
            <select value={nature} onChange={(event) => setNature(event.target.value)}>
              <option>Todas</option>
              {[...new Set(events.map((item) => item.nature))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por periodo del curso</span>
            <select value={coursePeriod} onChange={(event) => setCoursePeriod(event.target.value)}>
              <option>Todos</option>
              {[...new Set(events.map((item) => item.coursePeriod))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por situación temporal</span>
            <select value={timeStatus} onChange={(event) => setTimeStatus(event.target.value)}>
              <option>Todos</option>
              <option>Próximo</option>
              <option>Abierto</option>
              <option>Finalizado</option>
            </select>
          </label>
          <button className="text-button" onClick={resetCalendarFilters}>
            Limpiar
          </button>
          <div className="view-switch" aria-label="Cambiar vista">
            <button
              className={view === "lista" ? "active" : ""}
              onClick={() => setView("lista")}
              aria-pressed={view === "lista"}
            >
              Lista
            </button>
            <button
              className={view === "tabla" ? "active" : ""}
              onClick={() => setView("tabla")}
              aria-pressed={view === "tabla"}
            >
              Tabla
            </button>
            <button
              className={view === "mes" ? "active" : ""}
              onClick={() => setView("mes")}
              aria-pressed={view === "mes"}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="results-meta">
          <span>{filtered.length} actuaciones visibles</span>
          <div className="export-actions">
            <button className="button export" onClick={() => printSection("printing-calendar")}>
              Imprimir filtrado / PDF
            </button>
            <button className="button export" onClick={downloadCalendarCsv}>
              Descargar CSV
            </button>
            <button className="button export" onClick={downloadIcs}>
              Descargar .ics filtrado
            </button>
            <button
              className="button primary"
              onClick={() => setShowCalendarBuilder((current) => !current)}
              aria-expanded={showCalendarBuilder}
            >
              Crear calendario personalizado
            </button>
          </div>
        </div>

        {showCalendarBuilder && (
          <section className="calendar-builder" aria-label="Crear calendario personalizado">
            <div className="calendar-builder-heading">
              <div>
                <p className="eyebrow">Exportación configurable</p>
                <h3>Crea un calendario ajustado a tu centro</h3>
                <p>
                  Puedes combinar varias enseñanzas, ámbitos y programas y,
                  después, excluir actuaciones concretas antes de descargar el
                  archivo compatible con Google Calendar y Outlook.
                </p>
              </div>
              <label className="calendar-name">
                Nombre del calendario
                <input
                  value={customCalendarName}
                  onChange={(event) => setCustomCalendarName(event.target.value)}
                />
              </label>
            </div>

            <div className="calendar-builder-groups">
              <fieldset>
                <legend>Enseñanzas</legend>
                {[...new Set(events.flatMap((item) => item.teachings))].map((value) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={customTeachings.includes(value)}
                      onChange={() =>
                        toggleCustomValue(value, customTeachings, setCustomTeachings)
                      }
                    />
                    {value}
                  </label>
                ))}
                <label>
                  <input
                    type="checkbox"
                    checked={customIncludeGeneral}
                    onChange={(event) => setCustomIncludeGeneral(event.target.checked)}
                  />
                  Incluir actuaciones generales
                </label>
                <small>Sin marcar enseñanzas se incluyen todas.</small>
              </fieldset>

              <fieldset>
                <legend>Ámbitos</legend>
                {[...new Set(events.map((item) => item.area))].map((value) => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={customAreas.includes(value)}
                      onChange={() => toggleCustomValue(value, customAreas, setCustomAreas)}
                    />
                    {value}
                  </label>
                ))}
                <small>Sin marcar ámbitos se incluyen todos.</small>
              </fieldset>

              <fieldset>
                <legend>Programas</legend>
                {[...new Set(events.map((item) => item.program).filter(Boolean))].map(
                  (value) => (
                    <label key={value}>
                      <input
                        type="checkbox"
                        checked={customPrograms.includes(value)}
                        onChange={() =>
                          toggleCustomValue(value, customPrograms, setCustomPrograms)
                        }
                      />
                      {value}
                    </label>
                  ),
                )}
                <small>Sin marcar programas no se aplica este filtro.</small>
              </fieldset>
            </div>

            <details className="calendar-event-picker">
              <summary>
                Revisar y excluir actuaciones concretas ({customCalendarEvents.length} incluidas)
              </summary>
              <div>
                {events
                  .filter((event) => {
                    const teachingMatch =
                      customTeachings.length === 0 ||
                      event.teachings.some((item) => customTeachings.includes(item)) ||
                      (customIncludeGeneral && event.teachings.length === 0);
                    return (
                      teachingMatch &&
                      (customAreas.length === 0 || customAreas.includes(event.area)) &&
                      (customPrograms.length === 0 ||
                        (event.program && customPrograms.includes(event.program)))
                    );
                  })
                  .map((event) => (
                    <label key={event.id}>
                      <input
                        type="checkbox"
                        checked={!customExcludedEvents.includes(event.id)}
                        onChange={() =>
                          setCustomExcludedEvents((current) =>
                            current.includes(event.id)
                              ? current.filter((id) => id !== event.id)
                              : [...current, event.id],
                          )
                        }
                      />
                      <span>
                        <strong>{event.dateLabel}</strong> · {event.title}
                      </span>
                    </label>
                  ))}
              </div>
            </details>

            <div className="calendar-builder-footer">
              <p>
                <strong>{customCalendarEvents.length}</strong> actuaciones se
                incluirán en «{customCalendarName || "Calendario personalizado"}».
              </p>
              <div className="export-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setCustomTeachings([]);
                    setCustomAreas([]);
                    setCustomPrograms([]);
                    setCustomIncludeGeneral(true);
                    setCustomExcludedEvents([]);
                  }}
                >
                  Reiniciar selección
                </button>
                <button
                  className="button primary"
                  onClick={downloadCustomIcs}
                  disabled={!customCalendarEvents.length}
                >
                  Descargar calendario personalizado .ics
                </button>
              </div>
            </div>
          </section>
        )}

        {showIcsHelp && (
          <div className="ics-guide" role="status">
            <div>
              <strong>Ya tienes el archivo del calendario. ¿Y ahora qué?</strong>
              <p>
                En Google Calendar: abre <b>Configuración</b> →{" "}
                <b>Importar y exportar</b> → <b>Seleccionar archivo</b>, elige el
                archivo `.ics`, selecciona el calendario de destino y pulsa{" "}
                <b>Importar</b>.
              </p>
            </div>
            <button onClick={() => setShowIcsHelp(false)} aria-label="Cerrar ayuda">
              ×
            </button>
          </div>
        )}

        {view === "lista" ? (
          <div className="event-list">
            {filtered.map((event) => (
              <article className="event-card" key={`${event.date}-${event.title}`}>
                <time dateTime={event.date}>{event.dateLabel}</time>
                <div className="event-main">
                  <div className="tags">
                    <span>{event.area}</span>
                    {event.priority && <span className="priority-tag">Prioritario</span>}
                  </div>
                  <h3>{event.title}</h3>
                  <p>{event.detail}</p>
                  <p className="event-responsibility">
                    <strong>Responsable o emisor:</strong> {event.responsibility}
                  </p>
                  <button
                    className="result-open"
                    onClick={() => setSelectedRecord(event.sourceRecord)}
                  >
                    Ver ficha y fuente <span>→</span>
                  </button>
                </div>
                <details className="reference">
                  <summary>Ver referencia</summary>
                  <p>{event.source}</p>
                </details>
              </article>
            ))}
          </div>
        ) : view === "tabla" ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Actuación</th>
                  <th>Ámbito</th>
                  <th>Aplicabilidad</th>
                  <th>Responsable</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={`${event.date}-${event.title}`}>
                    <td>{event.dateLabel}</td>
                    <td><strong>{event.title}</strong><small>{event.detail}</small></td>
                    <td>{event.area}</td>
                    <td>{event.scope}</td>
                    <td>{event.responsibility}</td>
                    <td>{event.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="month-view">
            <div className="month-heading">
              <button
                aria-label="Mes anterior"
                onClick={() => {
                  const date = new Date(`${calendarMonth}-01T00:00:00Z`);
                  date.setUTCMonth(date.getUTCMonth() - 1);
                  setCalendarMonth(date.toISOString().slice(0, 7));
                }}
              >
                ←
              </button>
              <label>
                <span className="sr-only">Mes mostrado</span>
                <input
                  type="month"
                  min="2026-06"
                  max="2027-09"
                  value={calendarMonth}
                  onChange={(event) => setCalendarMonth(event.target.value)}
                />
              </label>
              <button
                aria-label="Mes siguiente"
                onClick={() => {
                  const date = new Date(`${calendarMonth}-01T00:00:00Z`);
                  date.setUTCMonth(date.getUTCMonth() + 1);
                  setCalendarMonth(date.toISOString().slice(0, 7));
                }}
              >
                →
              </button>
            </div>
            <div className="month-grid" role="grid">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                <div className="weekday" key={day} role="columnheader">{day}</div>
              ))}
              {monthDays.map((day, index) =>
                day === null ? (
                  <div className="month-day blank" key={`blank-${index}`} />
                ) : (
                  <div className="month-day" key={day} role="gridcell">
                    <strong>{day}</strong>
                    {itemsForDay(day).slice(0, 3).map((event) => (
                      <button
                        key={`${day}-${event.id}`}
                        className="month-event"
                        title={event.title}
                        onClick={() => setSelectedRecord(event.sourceRecord)}
                      >
                        {event.title}
                      </button>
                    ))}
                    {itemsForDay(day).length > 3 && (
                      <small>+{itemsForDay(day).length - 3} más</small>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="empty">
            No hay resultados con estos filtros. Prueba otra palabra o pulsa
            «Limpiar».
          </div>
        )}
      </section>

      <section className="section" id="ambitos">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Explorador por ámbitos</p>
            <h2>Entra por la tarea que tienes delante</h2>
            <p>
              Cada ámbito abre una guía propia con tareas, fechas, responsables,
              documentos y referencias relacionadas.
            </p>
          </div>
          <Help title="¿En qué se diferencia del buscador?">
            <p>
              El buscador sirve cuando ya conoces una palabra concreta. El
              explorador te orienta cuando solo sabes el asunto que necesitas
              organizar. No tienes que abrir archivos técnicos: las fichas se
              muestran dentro de esta misma web.
            </p>
          </Help>
        </div>
        <div className="area-grid">
          {areas.map((item, index) => (
            <button
              className={`area-card ${selectedAreaId === item.id ? "active" : ""}`}
              key={item.id}
              aria-expanded={selectedAreaId === item.id}
              aria-controls="area-explorer-detail"
              onClick={() => {
                setSelectedAreaId(item.id);
                window.setTimeout(
                  () => document.getElementById("area-explorer-detail")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  }),
                  50,
                );
              }}
            >
              <span className="area-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <small>{item.timing}</small>
              <b aria-hidden="true">→</b>
            </button>
          ))}
        </div>

        {selectedArea && (
          <article className="area-explorer-detail" id="area-explorer-detail">
            <header className="area-detail-heading">
              <div>
                <p className="eyebrow">Ámbito seleccionado</p>
                <h3>{selectedArea.title}</h3>
                <p>{selectedArea.guidance}</p>
              </div>
              <div className="detail-export-actions">
                <button className="button secondary" onClick={() => printSection("printing-area")}>Imprimir / PDF</button>
                <button className="button secondary" onClick={downloadAreaCsv}>Descargar CSV</button>
                <button
                  className="modal-close"
                  onClick={() => setSelectedAreaId(null)}
                  aria-label="Cerrar el ámbito"
                >
                  ×
                </button>
              </div>
            </header>

            <div className="area-overview">
              <div>
                <strong>{areaRecords.length}</strong>
                <span>fragmentos relacionados</span>
              </div>
              <div>
                <strong>{areaEvents.length}</strong>
                <span>actuaciones fechadas destacadas</span>
              </div>
              <div>
                <strong>{areaDocuments.length}</strong>
                <span>documentos de consulta</span>
              </div>
            </div>

            <section className="area-subsection">
              <div className="area-subheading">
                <div>
                  <span>1</span>
                  <h4>Tareas, obligaciones y criterios</h4>
                </div>
                <small>Seleccionados por relevancia documental</small>
              </div>
              {areaTasks.length ? (
                <div className="area-task-list">
                  {areaTasks.map((record) => (
                    <button key={`area-task-${record.id}`} onClick={() => setSelectedRecord(record)}>
                      <span className="area-kind">{record.kind}</span>
                      <strong>{record.title ?? record.section}</strong>
                      {getExplicitResponsibility(record) && (
                        <small><b>Responsable u órgano:</b> {getExplicitResponsibility(record)}</small>
                      )}
                      <small>{highlightedSnippet(record.text, selectedArea.keywords[0])}</small>
                      <em>Ver ficha y fuente →</em>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty">No se han encontrado tareas asociadas en el índice.</div>
              )}
            </section>

            <section className="area-subsection">
              <div className="area-subheading">
                <div>
                  <span>2</span>
                  <h4>Fechas relevantes</h4>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery(selectedArea.eventTerms[0]);
                    document.getElementById("calendario")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Abrir en el calendario
                </button>
              </div>
              {areaEvents.length ? (
                <div className="area-date-list">
                  {areaEvents.map((event) => (
                    <div key={`area-event-${event.id}`}>
                      <time>{event.dateLabel}</time>
                      <span>
                        <strong>{event.title}</strong>
                        <small>{event.responsibility}</small>
                      </span>
                      <button onClick={() => setSelectedRecord(event.sourceRecord)}>Ver ficha</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">Este ámbito no tiene todavía actuaciones fechadas específicas.</div>
              )}
            </section>

            <section className="area-subsection">
              <div className="area-subheading">
                <div>
                  <span>3</span>
                  <h4>Documentos y apartados relacionados</h4>
                </div>
                <small>Consulta amigable dentro del portal</small>
              </div>
              <div className="area-document-list">
                {areaDocuments.map((record) => (
                  <button key={`area-document-${record.id}`} onClick={() => setSelectedRecord(record)}>
                    <span>{record.kind}</span>
                    <strong>{record.document}</strong>
                    <small>{record.section}</small>
                    <em>Consultar →</em>
                  </button>
                ))}
              </div>
            </section>

            <Help title="Cómo interpretar este ámbito">
              <p>
                La selección organiza coincidencias del índice público para
                facilitar la consulta. Abre cada ficha para leer el contenido
                relevante y comprobar su documento y apartado. Cuando la fuente
                identifica expresamente un responsable u órgano, se muestra; si
                no lo hace, la guía no lo inventa.
              </p>
            </Help>
          </article>
        )}
      </section>

      <section className="section checklist-hub" id="checklist">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Lista de control interactiva</p>
            <h2>Inicio de curso, tarea por tarea</h2>
            <p>
              Controla las actuaciones verificables desde la preparación previa
              hasta el cierre de la PGA, incluyendo rutinas y tareas
              condicionadas a enseñanzas o programas.
            </p>
          </div>
          <Help title="Qué guarda y dónde">
            <p>
              Los estados y notas se guardan únicamente en este navegador. No
              se envían a la web ni sustituyen actas, registros, expedientes o
              herramientas institucionales. Exporta una copia si quieres
              trasladar el progreso a otro equipo o conservar una copia de
              seguridad.
            </p>
          </Help>
        </div>

        <div className="checklist-dashboard">
          <div className="checklist-progress" aria-label={`Progreso: ${checklistProgress.percentage}%`}>
            <div className="progress-ring" style={{ "--progress": `${checklistProgress.percentage * 3.6}deg` } as CSSProperties}>
              <span>{checklistProgress.percentage}%</span>
            </div>
            <div>
              <strong>{checklistProgress.completed} de {checklistTasks.length} verificadas</strong>
              <p>Solo las tareas terminadas y comprobadas cuentan en el porcentaje.</p>
            </div>
          </div>
          <div className="checklist-stats">
            <div><strong>{checklistProgress.preparing}</strong><span>en preparación</span></div>
            <div><strong>{checklistProgress.blocked}</strong><span>bloqueadas</span></div>
            <div><strong>{checklistTasks.length - checklistProgress.completed - checklistProgress.preparing - checklistProgress.blocked}</strong><span>no iniciadas</span></div>
          </div>
        </div>

        <div className="checklist-toolbar">
          <label className="search">
            <span className="sr-only">Buscar en la checklist</span>
            <input
              type="search"
              value={checklistQuery}
              onChange={(event) => setChecklistQuery(event.target.value)}
              placeholder="Buscar tarea, responsable, evidencia o referencia…"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por fase</span>
            <select value={checklistPhase} onChange={(event) => setChecklistPhase(event.target.value)}>
              <option>Todas</option>
              {[...new Set(checklistTasks.map((task) => task.phase))].map((phase) => (
                <option key={phase}>{phase}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por estado</span>
            <select value={checklistStatus} onChange={(event) => setChecklistStatus(event.target.value)}>
              <option value="Todos">Todos los estados</option>
              {Object.entries(checklistStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar por aplicabilidad</span>
            <select value={checklistApplicability} onChange={(event) => setChecklistApplicability(event.target.value)}>
              <option>Todas</option>
              <option>General</option>
              <option>Condicionada</option>
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setChecklistQuery("");
              setChecklistPhase("Todas");
              setChecklistStatus("Todos");
              setChecklistApplicability("Todas");
            }}
          >
            Limpiar filtros
          </button>
        </div>

        <div className="checklist-actions">
          <span>
            <strong>{filteredChecklistTasks.length}</strong> tareas mostradas
          </span>
          <div>
            <button className="button secondary" onClick={printChecklist}>Imprimir / PDF</button>
            <button className="button secondary" onClick={downloadChecklistCsv}>Descargar CSV</button>
            <button className="button secondary" onClick={downloadChecklist}>Exportar copia JSON</button>
            <label className="button secondary checklist-import">
              Importar copia
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  importChecklist(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button className="button checklist-reset" onClick={resetChecklist}>Reiniciar</button>
          </div>
        </div>

        {checklistMessage && (
          <div className="checklist-message" role="status">
            <span>{checklistMessage}</span>
            <button onClick={() => setChecklistMessage("")} aria-label="Cerrar aviso">×</button>
          </div>
        )}

        <div className="checklist-list">
          {filteredChecklistTasks.map((task) => {
            const status = checklistStatuses[task.id] ?? "no-iniciada";
            const isExpanded = expandedChecklistTask === task.id;
            const source = checklistSourceFor(task);
            return (
              <article className={`checklist-task status-${status}`} key={task.id}>
                <div className="checklist-task-main">
                  <label className="checklist-check">
                    <input
                      type="checkbox"
                      checked={status === "terminada"}
                      onChange={(event) =>
                        setChecklistStatuses((current) => ({
                          ...current,
                          [task.id]: event.target.checked ? "terminada" : "no-iniciada",
                        }))
                      }
                      aria-label={`Marcar ${task.title} como terminada`}
                    />
                    <span aria-hidden="true">✓</span>
                  </label>
                  <div className="checklist-task-copy">
                    <div className="checklist-task-meta">
                      <span>{task.phase}</span>
                      <span className={task.applicability === "Condicionada" ? "conditional" : ""}>
                        {task.applicability}
                      </span>
                    </div>
                    <h3>{task.title}</h3>
                    <p><strong>Cuándo:</strong> {task.timing}</p>
                    <p><strong>Responsable institucional:</strong> {task.responsibility}</p>
                    <p className="checklist-evidence"><strong>Evidencia de cierre:</strong> {task.evidence}</p>
                  </div>
                  <div className="checklist-task-controls">
                    <label>
                      <span>Estado</span>
                      <select
                        value={status}
                        onChange={(event) =>
                          setChecklistStatuses((current) => ({
                            ...current,
                            [task.id]: event.target.value as ChecklistStatus,
                          }))
                        }
                      >
                        {Object.entries(checklistStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="text-button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedChecklistTask(isExpanded ? null : task.id)}
                    >
                      {isExpanded ? "Ocultar instrucciones" : "Ver instrucciones y notas"}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="checklist-task-detail">
                    <div>
                      <span>Qué comprobar</span>
                      <p>{task.detail}</p>
                    </div>
                    <div>
                      <span>Referencia</span>
                      <p>{task.reference}</p>
                      {source && (
                        <button className="result-open" onClick={() => setSelectedRecord(source)}>
                          Ver información y fuente <span>→</span>
                        </button>
                      )}
                    </div>
                    <label>
                      <span>Notas locales</span>
                      <textarea
                        value={checklistNotes[task.id] ?? ""}
                        onChange={(event) =>
                          setChecklistNotes((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        placeholder="Anota una incidencia, una decisión o la ubicación de la evidencia. No introduzcas datos sensibles."
                      />
                    </label>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filteredChecklistTasks.length === 0 && (
          <div className="empty">No hay tareas que coincidan con estos filtros.</div>
        )}

        <div className="checklist-disclaimer">
          <strong>Uso responsable de la lista</strong>
          <p>
            Es una ayuda provisional de organización. «Terminada» significa que
            la evidencia indicada existe y ha sido comprobada. Las tareas
            condicionadas deben marcarse solo después de decidir si resultan
            aplicables al centro. Para decisiones relevantes, abre la ficha y
            contrasta la referencia oficial.
          </p>
        </div>
      </section>

      <section className="section programs-hub" id="programas">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Espacio especializado</p>
            <h2>Programas Educativos 2026/2027</h2>
            <p>
              Compara los programas convocados, comprueba si son aplicables a
              un IES y abre una ficha con todo el recorrido de trabajo.
            </p>
          </div>
          <Help title="Cómo utilizar este espacio">
            <p>
              La ficha electrónica y la resolución oficial siguen siendo la
              referencia. Esta vista reúne lo necesario para decidir, preparar
              y controlar cada solicitud sin salir de la guía.
            </p>
          </Help>
        </div>

        <div className="program-cycle" aria-label="Ciclo común de los programas">
          {[
            ["1", "Preparar", "Junio–agosto"],
            ["2", "Solicitar", "2–18 septiembre"],
            ["3", "Comprobar", "Subsanación y resolución"],
            ["4", "Implantar", "PGA y desarrollo"],
            ["5", "Cerrar", "Seguimiento, memoria y certificación"],
          ].map(([number, title, text]) => (
            <div key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <small>{text}</small>
            </div>
          ))}
        </div>

        <div className="program-toolbar">
          <label className="search">
            <span>⌕</span>
            <input
              value={programQuery}
              onChange={(event) => setProgramQuery(event.target.value)}
              placeholder="Programa, procedimiento, nivel o requisito…"
              aria-label="Buscar programas educativos"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar por aplicabilidad a IES</span>
            <select
              value={programApplicability}
              onChange={(event) => setProgramApplicability(event.target.value)}
            >
              <option>Aplicables a IES</option>
              <option>Todos</option>
              <option>Sí</option>
              <option>Condicionado</option>
              <option>No</option>
            </select>
          </label>
          <span className="program-count">{programResults.length} programas</span>
        </div>

        <div className="program-catalog">
          {programResults.map((item) => {
            const isSelected = selectedPrograms.includes(item.id);
            return (
              <article className="program-card" key={item.id}>
                <div className="program-card-top">
                  <span className={`applicability applicability-${item.applicable.toLowerCase()}`}>
                    {item.applicable === "No" ? "No aplicable a IES" : `IES: ${item.applicable}`}
                  </span>
                  <small>Procedimiento {item.procedure}</small>
                </div>
                <h3>{item.name}</h3>
                <p>{item.preparation}</p>
                <div className="program-card-actions">
                  <button
                    className="result-open"
                    onClick={() => {
                      setSelectedProgramId(item.id);
                      window.setTimeout(
                        () => document.getElementById("program-detail")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                        50,
                      );
                    }}
                  >
                    Ver ficha completa <span>→</span>
                  </button>
                  {item.applicable !== "No" && (
                    <label className="program-select">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          setSelectedPrograms((current) =>
                            isSelected
                              ? current.filter((id) => id !== item.id)
                              : [...current, item.id],
                          )
                        }
                      />
                      Añadir a mi selección
                    </label>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {programResults.length === 0 && (
          <div className="empty">No hay programas que coincidan con esos criterios.</div>
        )}

        {selectedProgram && (
          <article className="program-detail" id="program-detail">
            <header className="program-detail-heading">
              <div>
                <p className="eyebrow">Ficha individual</p>
                <h3>{selectedProgram.name}</h3>
                <p>
                  Procedimiento <strong>{selectedProgram.procedure}</strong> ·
                  Aplicabilidad a IES: <strong>{selectedProgram.applicable}</strong>
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setSelectedProgramId(null)}
                aria-label="Cerrar la ficha del programa"
              >
                ×
              </button>
            </header>

            <div className="program-facts">
              <div>
                <span>Destinatarios</span>
                <p>{selectedProgram.audience}</p>
              </div>
              <div>
                <span>Preparación previa</span>
                <p>{selectedProgram.preparation}</p>
              </div>
              <div>
                <span>Documentación</span>
                <p>{selectedProgram.documentation}</p>
              </div>
              <div>
                <span>Compromisos y desarrollo</span>
                <p>{selectedProgram.commitments}</p>
              </div>
            </div>

            <section className="program-detail-section">
              <div className="area-subheading">
                <div><span>1</span><h4>Circuito completo y evidencias</h4></div>
                <small>Común a todos los programas convocados</small>
              </div>
              <div className="program-timeline">
                {commonProgramTimeline.map(([moment, action, evidence]) => (
                  <div key={moment}>
                    <time>{moment}</time>
                    <p><strong>{action}</strong><small>Evidencia: {evidence}</small></p>
                  </div>
                ))}
              </div>
            </section>

            <section className="program-detail-section">
              <div className="area-subheading">
                <div><span>2</span><h4>Fuentes y requisitos verificables</h4></div>
                <small>Consulta dentro de esta web</small>
              </div>
              <div className="program-source-list">
                {programSourceRecords.map((record) => (
                  <button key={`program-source-${record.id}`} onClick={() => setSelectedRecord(record)}>
                    <span>{record.section}</span>
                    <strong>{record.title || record.document}</strong>
                    <small>{highlightedSnippet(record.text, selectedProgram.name.split(" ")[0])}</small>
                    <em>Ver información y fuente →</em>
                  </button>
                ))}
              </div>
            </section>

            <Help title="Responsables y decisión interna">
              <p>
                La convocatoria no establece un único procedimiento colegiado
                general para decidir qué solicita cada centro. La guía distingue
                la propuesta interna, el análisis de viabilidad, la decisión
                organizativa del centro, la solicitud electrónica y la selección
                administrativa, sin atribuir competencias que la fuente no fija.
              </p>
            </Help>
          </article>
        )}

        <section className="program-selection" aria-labelledby="program-selection-title">
          <div className="program-selection-heading">
            <div>
              <p className="eyebrow">Mi selección local</p>
              <h3 id="program-selection-title">Agenda combinada de programas</h3>
              <p>
                Marca programas en el catálogo para reunir sus hitos. La
                selección se conserva solo en este navegador y no se transmite.
              </p>
            </div>
            {selectedPrograms.length > 0 && (
              <button className="text-button" onClick={() => setSelectedPrograms([])}>
                Borrar selección
              </button>
            )}
          </div>

          {selectedProgramDefinitions.length ? (
            <>
              <div className="selected-program-chips">
                {selectedProgramDefinitions.map((item) => (
                  <button
                    key={`selected-${item.id}`}
                    onClick={() => setSelectedProgramId(item.id)}
                  >
                    {item.name} <span>Ver ficha</span>
                  </button>
                ))}
              </div>
              <div className="program-agenda">
                <div>
                  <time>2–18 SEP 2026</time>
                  <p>
                    <strong>Solicitud de {selectedProgramDefinitions.length === 1 ? "1 programa" : `${selectedProgramDefinitions.length} programas`}</strong>
                    <small>Un trámite y justificante por cada programa; PALE, por idioma.</small>
                  </p>
                </div>
                {selectedProgramEvents.map((event) => (
                  <div key={`selected-program-event-${event.id}`}>
                    <time>{event.dateLabel}</time>
                    <p><strong>{event.title}</strong><small>{event.detail}</small></p>
                    <button onClick={() => setSelectedRecord(event.sourceRecord)}>Ver ficha</button>
                  </div>
                ))}
                <div>
                  <time>FINAL DE CURSO</time>
                  <p>
                    <strong>Memoria y certificación de cada programa desarrollado</strong>
                    <small>Memoria según Anexo II; seguimiento y certificación conforme a instrucciones.</small>
                  </p>
                </div>
              </div>
              <div className="selection-export-actions">
                <button className="button agenda-print" onClick={() => printSection("printing-programs")}>
                  Imprimir selección / PDF
                </button>
                <button className="button agenda-print" onClick={downloadProgramsCsv}>
                  Descargar CSV
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              Aún no has seleccionado programas. Marca los que esté valorando el
              centro para construir esta agenda.
            </div>
          )}
          <p className="local-note">
            Esta selección es una ayuda provisional. No sustituye acuerdos,
            expedientes, justificantes ni herramientas institucionales.
          </p>
        </section>
      </section>

      <section className="section diagrams-hub" id="esquemas">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Comprender antes de actuar</p>
            <h2>Esquemas visuales de los procesos clave</h2>
            <p>
              Seis recorridos explicativos convierten los procedimientos más
              complejos en una secuencia legible. Cada paso identifica quién
              interviene, qué conviene conservar y dónde verificar la fuente.
            </p>
          </div>
          <Help title="Cómo utilizar los esquemas">
            <p>
              Elige un proceso y sigue sus pasos. Son mapas de orientación, no
              sustitutos de la norma: las cautelas y las fuentes integradas
              señalan qué debe comprobarse antes de adoptar una decisión.
            </p>
          </Help>
        </div>

        <div className="diagram-tabs" role="tablist" aria-label="Procesos explicados">
          {processDiagrams.map((diagram) => (
            <button
              key={diagram.id}
              type="button"
              role="tab"
              aria-selected={selectedDiagram.id === diagram.id}
              className={selectedDiagram.id === diagram.id ? "active" : ""}
              onClick={() => setSelectedDiagramId(diagram.id)}
            >
              {diagram.shortTitle}
            </button>
          ))}
        </div>

        <article className="process-panel" aria-live="polite">
          <header className="process-heading">
            <div>
              <p className="eyebrow">Esquema {processDiagrams.findIndex((item) => item.id === selectedDiagram.id) + 1} de {processDiagrams.length}</p>
              <h3>{selectedDiagram.title}</h3>
              <p>{selectedDiagram.purpose}</p>
            </div>
            <button className="button secondary" onClick={printSelectedDiagram}>
              Imprimir esquema
            </button>
            <button className="button secondary" onClick={downloadDiagramCsv}>
              Descargar CSV
            </button>
          </header>

          <div className="process-flow" aria-label={`Secuencia: ${selectedDiagram.title}`}>
            {selectedDiagram.steps.map((step, index) => (
              <div className="process-step-wrap" key={`${selectedDiagram.id}-${step.label}`}>
                <section className="process-step">
                  <span className="process-number">{step.label}</span>
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                  <dl>
                    <div><dt>Interviene</dt><dd>{step.actor}</dd></div>
                    <div><dt>Evidencia</dt><dd>{step.evidence}</dd></div>
                  </dl>
                </section>
                {index < selectedDiagram.steps.length - 1 && (
                  <span className="process-arrow" aria-hidden="true">→</span>
                )}
              </div>
            ))}
          </div>

          <aside className="process-caution">
            <strong>Cautela de aplicación</strong>
            <p>{selectedDiagram.caution}</p>
          </aside>

          <section className="process-sources">
            <div className="area-subheading">
              <div>
                <h4>Información y fuentes relacionadas</h4>
                <p>Se abren dentro de la propia guía para conservar una consulta amable y verificable.</p>
              </div>
              <button className="text-button" onClick={() => setDocumentQuery(selectedDiagram.sourceTerms[0])}>
                Buscar más en toda la guía
              </button>
            </div>
            <div className="process-source-grid">
              {diagramSources.map((record) => (
                <button key={`diagram-${selectedDiagram.id}-${record.id}`} onClick={() => setSelectedRecord(record)}>
                  <span>{record.document}</span>
                  <strong>{record.section}</strong>
                  <small>{highlightedSnippet(record.text, selectedDiagram.sourceTerms[0])}</small>
                  <em>Ver información y fuente →</em>
                </button>
              ))}
              {diagramSources.length === 0 && (
                <div className="empty">Cargando las referencias documentales del esquema…</div>
              )}
            </div>
          </section>
        </article>
      </section>

      <section className="section usage-section" id="uso-y-licencia">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Consulta, validez y reutilización</p>
            <h2>Una guía pública, reutilizable y siempre subordinada a la fuente oficial</h2>
            <p>
              Cualquier centro educativo puede consultar y utilizar gratuitamente
              esta web como apoyo para organizar el curso.
            </p>
          </div>
        </div>

        <div className="usage-grid">
          <article className="usage-card usage-card-caution">
            <span className="usage-number">01</span>
            <h3>Carácter no oficial</h3>
            <p>
              La única referencia válida es el documento oficial de Instrucciones
              de inicio de curso para los IES de Aragón, junto con las normas y
              actualizaciones que resulten aplicables. Esta guía organiza y
              explica información pública, pero puede contener errores de
              transcripción, interpretación o actualización.
            </p>
            <a
              href="https://educa.aragon.es/documents/20126/6844128/CSVFV61LMW0LZ120XFIL%2BInstrucciones%2Bcurso%2B2026-2027%2Bpara%2Bcentros%2Beducativos._03%2BIES%2B2026-2027%2BV8-%28Instrucciones%29.pdf/ff9b76e8-b92f-291b-b736-6f093187162c?t=1784615539858"
              target="_blank"
              rel="noreferrer"
            >
              Consultar el PDF oficial en Educaragón →
            </a>
          </article>

          <article className="usage-card">
            <span className="usage-number">02</span>
            <h3>Licencia abierta</h3>
            <p>
              Los contenidos y datos originales se ofrecen bajo licencia
              Creative Commons Atribución-CompartirIgual 4.0 Internacional
              (CC BY-SA 4.0), con atribución a <strong>@jotaefedoc</strong>. El
              código se publica bajo GPL-3.0-or-later. Se permite copiar,
              adaptar y compartir, manteniendo la atribución y la misma licencia
              en las versiones derivadas que se distribuyan.
            </p>
            <a
              href="https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027#licencias-y-reutilización"
              target="_blank"
              rel="noreferrer"
            >
              Ver licencias y condiciones completas →
            </a>
          </article>

          <article className="usage-card">
            <span className="usage-number">03</span>
            <h3>Adaptaciones de centro</h3>
            <p>
              Un centro puede crear una versión propia, incluso en un entorno
              privado, a partir del repositorio público. Las adaptaciones con
              responsables, decisiones o documentación interna deben mantenerse
              separadas de esta base común. No deben publicarse datos personales,
              credenciales ni información confidencial.
            </p>
            <a
              href="https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027/tree/main/templates/adaptacion-centro"
              target="_blank"
              rel="noreferrer"
            >
              Consultar instrucciones de adaptación →
            </a>
          </article>
        </div>

        <aside className="error-report">
          <div>
            <strong>¿Has detectado una fecha, un dato o una indicación incorrecta?</strong>
            <p>
              Puedes comunicarlo mediante GitHub. El aviso será público: no
              incluyas nombres, datos personales ni información interna de tu
              centro.
            </p>
          </div>
          <a
            className="button secondary"
            href="https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027/issues/new?template=error-en-la-guia.yml"
            target="_blank"
            rel="noreferrer"
          >
            Comunicar un posible error
          </a>
        </aside>
      </section>

      <footer>
        <div>
          <strong>Guía operativa IES Aragón · 2026/2027</strong>
          <p>
            Recurso público de apoyo elaborado por @jotaefedoc. No es una fuente
            oficial: contrasta siempre fechas, datos e instrucciones con el PDF
            oficial y sus posibles actualizaciones.
          </p>
        </div>
        <div className="footer-links">
          <a
            href="https://educa.aragon.es/documents/20126/6844128/CSVFV61LMW0LZ120XFIL%2BInstrucciones%2Bcurso%2B2026-2027%2Bpara%2Bcentros%2Beducativos._03%2BIES%2B2026-2027%2BV8-%28Instrucciones%29.pdf/ff9b76e8-b92f-291b-b736-6f093187162c?t=1784615539858"
            target="_blank"
            rel="noreferrer"
          >
            Fuente oficial
          </a>
          <a
            href="https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027"
            target="_blank"
            rel="noreferrer"
          >
            Repositorio y licencias
          </a>
        </div>
      </footer>
    </main>
  );
}

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import fitz
import pdfplumber


ROOT = Path(__file__).resolve().parent
PDF = ROOT / "upload" / "Instrucciones curso 2026-2027 para centros educativos._03 IES 2026-2027 V8-(Instrucciones).pdf"
OUT = ROOT / "output" / "instrucciones-ies-2026-2027"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean_lines(text: str) -> list[str]:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    return [line for line in lines if line]


def join_block(text: str) -> str:
    lines = clean_lines(text)
    if not lines:
        return ""
    out: list[str] = []
    for line in lines:
        if line in {"•", ""}:
            out.append("-")
        elif line.startswith(("• ", " ")):
            out.append("- " + line[2:].strip())
        elif out and out[-1] == "-":
            out[-1] = "- " + line
        elif out and out[-1].startswith("- ") and not re.match(r"^[•]", line):
            out[-1] += " " + line
        else:
            out.append(line)
    return "\n".join(out)


def heading_level(text: str, size: float, bold: bool) -> int | None:
    one = " ".join(clean_lines(text))
    if not one:
        return None
    if re.match(r"^(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|UNDÉCIMA|DUODÉCIMA)\.", one):
        return 1
    if one in {"INTRODUCCIÓN", "ANEXOS"}:
        return 1
    if re.match(r"^\d+\.\d+\.\d+\.", one):
        return 3
    if re.match(r"^\d+\.\d+\.", one):
        return 3
    if re.match(r"^\d+\.\d+\b", one):
        return 2
    if bold and size >= 11 and len(one) < 180:
        return 3
    return None


def page_blocks(doc: fitz.Document, page_number: int):
    page = doc[page_number - 1]
    blocks = []
    for block in page.get_text("dict", sort=True).get("blocks", []):
        if "lines" not in block:
            continue
        x0, y0, x1, y1 = block["bbox"]
        if x0 < 100 or y0 > 730:
            continue
        spans = [span for line in block["lines"] for span in line.get("spans", [])]
        text = "\n".join(
            "".join(span.get("text", "") for span in line.get("spans", []))
            for line in block["lines"]
        )
        if not clean_lines(text):
            continue
        size = max((float(span.get("size", 0)) for span in spans), default=0)
        bold = any("bold" in span.get("font", "").lower() for span in spans)
        blocks.append({"bbox": [x0, y0, x1, y1], "text": text, "size": size, "bold": bold})
    return blocks


def markdown_table(table: list[list[str | None]]) -> str:
    rows: list[list[str]] = []
    width = max((len(row) for row in table), default=1)
    for row in table:
        cells = []
        for cell in row + [None] * (width - len(row)):
            value = "" if cell is None else cell.strip()
            value = value.replace("|", "\\|").replace("\n", "<br>")
            cells.append(value)
        rows.append(cells)
    if not rows:
        return ""
    return "\n".join(
        ["| " + " | ".join([f"Columna {i+1}" for i in range(width)]) + " |",
         "| " + " | ".join(["---"] * width) + " |"]
        + ["| " + " | ".join(row) + " |" for row in rows]
    )


def extract_tables(pdf: Path) -> dict[int, list[str]]:
    result: dict[int, list[str]] = {}
    with pdfplumber.open(pdf) as source:
        for page_number in range(5, 10):
            page = source.pages[page_number - 1].crop((105, 100, 555, 730))
            result[page_number] = [markdown_table(t) for t in page.extract_tables() if t]
    return result


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pdf_hash = sha256(PDF)
    doc = fitz.open(PDF)
    tables = extract_tables(PDF)
    links = []
    page_records = []
    md: list[str] = [
        "---",
        'title: "Instrucciones para los Institutos de Educación Secundaria de Aragón. Curso 2026/2027"',
        'document_type: "transcripcion-canonica"',
        'source_format: "PDF firmado electrónicamente"',
        f'source_pages: {doc.page_count}',
        f'source_sha256: "{pdf_hash}"',
        'source_signature_date: "2026-07-06"',
        'transcription_status: "extracción estructurada pendiente de cotejo humano final"',
        "---",
        "",
        "# Instrucciones para los Institutos de Educación Secundaria de la Comunidad Autónoma de Aragón en relación con el curso 2026/2027",
        "",
        "> **Naturaleza de este archivo.** Transcripción estructurada del PDF oficial. Las marcas de página y la jerarquía Markdown se añaden para facilitar la navegación, pero no forman parte del texto de las instrucciones. El PDF firmado continúa siendo la referencia jurídica primaria.",
        "",
        "> **Criterio de fidelidad.** No se resume ni se reformula el contenido. La firma lateral repetida, el CSV repetido y la numeración de pie se registran en los metadatos de procedencia, pero no se reiteran en cada página.",
        "",
    ]
    for page_number in range(1, doc.page_count + 1):
        page = doc[page_number - 1]
        page_links = []
        for link in page.get_links():
            uri = link.get("uri")
            if uri:
                item = {"page": page_number, "uri": uri}
                links.append(item)
                page_links.append(uri)
        blocks = page_blocks(doc, page_number)
        page_records.append(
            {
                "page": page_number,
                "blocks": len(blocks),
                "links": page_links,
                "has_extracted_table": page_number in tables,
            }
        )
        md.extend([f'<a id="pagina-{page_number}"></a>', f"<!-- página PDF: {page_number} -->", ""])
        if page_number in range(5, 10):
            cutoff = 500 if page_number == 5 else 125
            for block in blocks:
                if block["bbox"][1] >= cutoff:
                    continue
                text = join_block(block["text"])
                level = heading_level(block["text"], block["size"], block["bold"])
                md.append(("#" * level + " " + " ".join(clean_lines(text))) if level else text)
                md.append("")
            for table in tables[page_number]:
                md.extend([table, ""])
            if page_number == 9:
                md.extend([
                    "*Las posibles variaciones en las formas de envío se comunicarían desde Dirección General",
                    "competente.",
                    "",
                ])
            continue
        for block in blocks:
            text = join_block(block["text"])
            level = heading_level(block["text"], block["size"], block["bold"])
            if level:
                md.append("#" * level + " " + " ".join(clean_lines(text)))
            else:
                md.append(text)
            md.append("")

    master = OUT / "instrucciones-ies-2026-2027-canonico.md"
    master.write_text("\n".join(md).rstrip() + "\n", encoding="utf-8")

    metadata = {
        "schema_version": "1.0",
        "source": {
            "filename": PDF.name,
            "sha256": pdf_hash,
            "pages": doc.page_count,
            "signed_by": "Carmen María Susín Gabarre",
            "signature_date": "2026-07-06",
            "verification_url": "https://mia.aragon.es/documentos",
            "csv": "CSVFV61LMW0LZ120XFIL",
        },
        "canonical_file": master.name,
        "status": "extracted_pending_final_human_collation",
        "pages": page_records,
        "links": links,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    readme = f"""# Base operativa de las instrucciones IES 2026/2027

## Archivos

- `instrucciones-ies-2026-2027-canonico.md`: transcripción maestra.
- `manifest.json`: procedencia, huella SHA-256, páginas y enlaces.
- `source/`: ubicación recomendada para el PDF oficial, sin modificar.
- `sections/`: archivos generados automáticamente a partir del documento maestro.
- `derived/`: calendarios, listas de control, resúmenes, HTML y otros productos interpretativos.
- `scripts/`: utilidades reproducibles para validar, dividir y exportar.

## Regla esencial

El archivo canónico no se edita para incorporar resúmenes, decisiones del centro ni interpretaciones. Todo producto operativo debe indicar la sección y página de origen y guardarse en `derived/`.

## Flujo recomendado

1. Conservar el PDF firmado y registrar su SHA-256: `{pdf_hash}`.
2. Cotejar la transcripción maestra con el PDF, especialmente tablas, listas, superíndices y enlaces.
3. Etiquetar una versión (`v1.0-fiel`) cuando concluya el cotejo.
4. Generar los archivos de `sections/` mediante un script, no mediante copia y pega.
5. Crear HTML, calendarios y herramientas únicamente desde la versión etiquetada.

## GitHub

Es una ubicación adecuada para esta base porque conserva historial, permite enlazar una versión exacta y facilita el consumo de archivos mediante URL. Conviene usar un repositorio público solo si todos los archivos derivados siguen siendo públicos y no contienen datos del centro o personales. Para trabajo interno, usar repositorio privado o separar la base pública de los derivados internos.
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")


if __name__ == "__main__":
    main()

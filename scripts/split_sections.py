from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BASE = ROOT / "output" / "instrucciones-ies-2026-2027"
MASTER = BASE / "instrucciones-ies-2026-2027-canonico.md"
SECTIONS = BASE / "sections"


SLUGS = {
    "INTRODUCCIÓN": "00-introduccion",
    "PRIMERA.": "01-prioridades-educativas",
    "SEGUNDA.": "02-calendario-escolar",
    "TERCERA.": "03-horario",
    "CUARTA.": "04-organizacion-y-funcionamiento",
    "QUINTA.": "05-documentacion-institucional",
    "SEXTA.": "06-evaluacion-promocion-titulacion",
    "SÉPTIMA.": "07-convivencia-e-igualdad",
    "OCTAVA.": "08-atencion-a-la-diversidad",
    "NOVENA.": "09-espad",
    "DÉCIMA.": "10-bachillerato-tres-cursos",
    "UNDÉCIMA.": "11-bachillerato-personas-adultas",
    "DUODÉCIMA.": "12-otras-cuestiones",
    "ANEXOS": "13-anexos",
}


def section_slug(heading: str) -> str | None:
    for prefix, slug in SLUGS.items():
        if heading.startswith(prefix):
            return slug
    return None


def main() -> None:
    SECTIONS.mkdir(parents=True, exist_ok=True)
    text = MASTER.read_text(encoding="utf-8")
    body_start = text.find('<a id="pagina-5"></a>')
    body = text[body_start:]
    matches = list(re.finditer(r"(?m)^# ([^#\n].+)$", body))
    written = []
    for index, match in enumerate(matches):
        title = match.group(1).strip()
        slug = section_slug(title)
        if slug is None:
            continue
        start = match.start()
        later = [m for m in matches[index + 1 :] if section_slug(m.group(1).strip())]
        end = later[0].start() if later else len(body)
        content = body[start:end].strip() + "\n"
        path = SECTIONS / f"{slug}.md"
        header = (
            "---\n"
            f'title: "{title.replace(chr(34), chr(39))}"\n'
            'derived_from: "../instrucciones-ies-2026-2027-canonico.md"\n'
            'derivation: "corte automático sin reformulación"\n'
            "---\n\n"
        )
        path.write_text(header + content, encoding="utf-8")
        written.append(path.name)
    (SECTIONS / "README.md").write_text(
        "# Secciones generadas\n\n"
        "Estos archivos son cortes automáticos del documento canónico. "
        "No deben editarse manualmente; se regeneran ejecutando `split_sections.py`.\n\n"
        + "\n".join(f"- `{name}`" for name in written)
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

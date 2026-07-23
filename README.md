# Base operativa de las instrucciones IES 2026/2027

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

1. Conservar el PDF firmado y registrar su SHA-256: `8d7a19a5e1413076e0c5934a0188bf5466a1a40e87163f8bf46d8a4a58dd1a51`.
2. Cotejar la transcripción maestra con el PDF, especialmente tablas, listas, superíndices y enlaces.
3. Etiquetar una versión (`v1.0-fiel`) cuando concluya el cotejo.
4. Generar los archivos de `sections/` mediante un script, no mediante copia y pega.
5. Crear HTML, calendarios y herramientas únicamente desde la versión etiquetada.

## GitHub

Es una ubicación adecuada para esta base porque conserva historial, permite enlazar una versión exacta y facilita el consumo de archivos mediante URL. Conviene usar un repositorio público solo si todos los archivos derivados siguen siendo públicos y no contienen datos del centro o personales. Para trabajo interno, usar repositorio privado o separar la base pública de los derivados internos.

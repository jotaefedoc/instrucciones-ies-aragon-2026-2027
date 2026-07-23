# Base operativa de las instrucciones IES 2026/2027

## Estado de la versión

La transcripción estructurada se considera cerrada como **`v1.0-fiel`** tras el cotejo humano final, incluida la reconstrucción específica de las tablas de las páginas 5–9 y 13–15.

El PDF oficial firmado continúa siendo la referencia jurídica primaria. Para decisiones de especial importancia se recomienda consultar también directamente esa copia oficial.

## Archivos

- `instrucciones-ies-2026-2027-canonico.md`: transcripción maestra cerrada.
- `manifest.json`: versión, estado de revisión, procedencia, huella SHA-256, páginas y enlaces.
- `source/`: PDF oficial, sin modificar.
- `sections/`: archivos generados automáticamente a partir del documento maestro.
- `derived/`: calendarios, listas de control, resúmenes, HTML y otros productos interpretativos.
- `scripts/`: utilidades reproducibles para validar, dividir y exportar.

## Regla esencial

El archivo canónico no se edita para incorporar resúmenes, decisiones del centro ni interpretaciones. Todo producto operativo debe indicar la sección y página de origen y guardarse en `derived/`.

Si en el futuro se detecta un posible error de transcripción, deberá contrastarse con el PDF oficial y corregirse mediante una nueva versión documentada, nunca silenciosamente.

## Flujo de trabajo desde v1.0-fiel

1. Mantener el PDF firmado y su SHA-256: `8d7a19a5e1413076e0c5934a0188bf5466a1a40e87163f8bf46d8a4a58dd1a51`.
2. Usar la versión canónica cerrada como fuente de los productos derivados.
3. Regenerar los archivos de `sections/` mediante script, no mediante copia y pega.
4. Crear HTML, calendarios, listas de control y herramientas dentro de `derived/`.
5. Citar siempre apartado y página de origen en cada producto operativo.
6. Mantener fuera del repositorio público cualquier dato personal o decisión interna del IES Pablo Gargallo.

## GitHub

Este repositorio público conserva el historial y permite enlazar una versión exacta de la fuente. Los derivados públicos pueden mantenerse aquí. Los documentos adaptados al IES Pablo Gargallo que contengan decisiones internas o datos personales deben guardarse en un entorno privado separado.

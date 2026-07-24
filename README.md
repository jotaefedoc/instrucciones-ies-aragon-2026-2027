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
- `templates/`: modelos públicos vacíos para crear copias de trabajo en entornos privados.

## Regla esencial

El archivo canónico no se edita para incorporar resúmenes, decisiones del centro ni interpretaciones. Todo producto operativo debe indicar la sección y página de origen y guardarse en `derived/`.

Si en el futuro se detecta un posible error de transcripción, deberá contrastarse con el PDF oficial y corregirse mediante una nueva versión documentada, nunca silenciosamente.

## Flujo de trabajo desde v1.0-fiel

1. Mantener el PDF firmado y su SHA-256: `8d7a19a5e1413076e0c5934a0188bf5466a1a40e87163f8bf46d8a4a58dd1a51`.
2. Usar la versión canónica cerrada como fuente de los productos derivados.
3. Regenerar los archivos de `sections/` mediante script, no mediante copia y pega.
4. Crear HTML, calendarios, listas de control y herramientas dentro de `derived/`.
5. Citar siempre apartado y página de origen en cada producto operativo.
6. Mantener fuera del repositorio público cualquier dato personal o decisión interna de un centro.

## Plantilla pública de adaptación

La [plantilla genérica de adaptación para centros](templates/adaptacion-centro/plantilla-generica-adaptacion-centro.md) permite crear, en un espacio privado independiente, una copia operativa con responsables, fechas internas, estados, decisiones y referencias controladas a evidencias.

La plantilla pública debe permanecer vacía. Una copia cumplimentada no debe volver a este repositorio. Los datos personales y documentos reales deben conservarse fuera de GitHub, en el almacenamiento institucional autorizado.

## GitHub

Este repositorio público conserva el historial y permite enlazar una versión exacta de la fuente. Los derivados y modelos genéricos públicos pueden mantenerse aquí. Las adaptaciones cumplimentadas que contengan decisiones internas deben guardarse en un entorno privado separado; los datos personales y documentos confidenciales deben permanecer fuera de GitHub.

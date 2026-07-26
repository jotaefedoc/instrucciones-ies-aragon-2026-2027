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
- `portal/`: código, generadores y documentación del portal público.
- `portal-data/`: índice documental y calendario regenerados automáticamente.

## Portal público

La [Guía operativa IES Aragón 2026/2027](https://jotaefedoc.github.io/instrucciones-ies-aragon-2026-2027/) organiza estos documentos como calendario, buscador, explorador por ámbitos, catálogo de programas, lista de control, esquemas y herramientas de exportación.

Cuando cambia contenido o código en `main`, GitHub Actions regenera y valida los JSON de `portal-data/`, construye la web y la publica en GitHub Pages. La web consulta esos datos al abrirse y mantiene una copia local de respaldo. El proceso completo está documentado en [`portal/README.md`](portal/README.md).

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


## Consulta pública y validez de la información

Cualquier centro educativo puede consultar y utilizar gratuitamente la guía pública como instrumento de apoyo organizativo.

La guía **no es una publicación oficial** y puede contener errores de transcripción, interpretación o actualización. Antes de aplicar cualquier fecha, dato o indicación debe contrastarse con las [Instrucciones oficiales de inicio de curso 2026/2027 para los IES de Aragón](https://educa.aragon.es/documents/20126/6844128/CSVFV61LMW0LZ120XFIL%2BInstrucciones%2Bcurso%2B2026-2027%2Bpara%2Bcentros%2Beducativos._03%2BIES%2B2026-2027%2BV8-%28Instrucciones%29.pdf/ff9b76e8-b92f-291b-b736-6f093187162c?t=1784615539858), así como con la normativa y las modificaciones posteriores que resulten aplicables.

## Licencias y reutilización

Este proyecto utiliza una licencia doble:

- Los **contenidos, datos estructurados, explicaciones, modelos y materiales originales** se ofrecen bajo [Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)](LICENSES.md#contenidos-y-datos-originales), con atribución a **@jotaefedoc**.
- El **código fuente y los scripts** se ofrecen bajo [GNU General Public License v3.0 or later (GPL-3.0-or-later)](LICENSES.md#código-fuente).

Se permite usar, copiar, adaptar y compartir el material. Las versiones derivadas que se distribuyan deben reconocer la autoría de **@jotaefedoc**, enlazar este repositorio, indicar los cambios realizados y mantenerse bajo la licencia correspondiente.

Las disposiciones oficiales, los documentos normativos y los materiales de terceros conservan su autoría y régimen jurídico propios y **no quedan relicenciados** por este repositorio.

## Adaptaciones privadas de centros

Un centro puede crear una adaptación propia en un repositorio privado o en otro entorno institucional autorizado. Debe partir de una copia separada y mantener fuera del repositorio público responsables nominales, decisiones internas, actas, evidencias, credenciales, datos personales y documentación confidencial.

Las instrucciones se recogen en [templates/adaptacion-centro/README.md](templates/adaptacion-centro/README.md).

## Comunicación de errores

Los posibles errores pueden comunicarse mediante la plantilla [Comunicar un posible error](https://github.com/jotaefedoc/instrucciones-ies-aragon-2026-2027/issues/new?template=error-en-la-guia.yml).

Las incidencias de GitHub son públicas. No deben incluir nombres, datos personales ni información interna o confidencial de ningún centro.

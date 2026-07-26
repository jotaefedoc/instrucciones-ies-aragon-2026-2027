# Portal público de la Guía operativa IES Aragón 2026/2027

Esta carpeta conserva el código y el proceso reproducible del portal público:

- `site/`: interfaz publicada automáticamente en GitHub Pages.
- `scripts/`: generación y validación del índice documental y del calendario.
- `../portal-data/`: JSON públicos consumidos por la web.
- `../.github/workflows/deploy-pages.yml`: regeneración, validación y publicación automática.

## Flujo automático

1. Una modificación de los Markdown o del manifiesto en la rama `main` activa GitHub Actions. El flujo también puede iniciarse manualmente desde la sección de acciones del repositorio.
2. La acción vuelve a leer los documentos públicos y regenera:
   - `portal-data/search-index.json`;
   - `portal-data/calendar-events.json`.
3. La validación comprueba el número de documentos, fragmentos, actuaciones, campos obligatorios, identificadores y fechas.
4. Si el resultado es válido y ha cambiado, la acción conserva los nuevos JSON en el repositorio.
5. La misma acción construye la interfaz estática y la publica en GitHub Pages.
6. El portal consulta los datos públicos del repositorio y utiliza la copia incluida en la publicación si esa consulta no estuviera disponible.

Este flujo mantiene una única fuente documental pública y evita mantener manualmente una segunda copia del calendario.

## Alcance

Las modificaciones documentales se reflejan automáticamente en el buscador, las fichas, los ámbitos, los programas, el calendario y los próximos hitos. Los cambios de diseño o funcionalidad también se publican automáticamente cuando quedan incorporados a `main`.

La web sigue siendo una guía de apoyo. No sustituye la normativa, las instrucciones oficiales ni los sistemas institucionales.

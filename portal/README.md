# Portal público de la Guía operativa IES Aragón 2026/2027

Esta carpeta conserva el código y el proceso reproducible del portal público:

- `site/`: interfaz publicada en ChatGPT Sites.
- `scripts/`: generación y validación del índice documental y del calendario.
- `../portal-data/`: JSON públicos consumidos por la web.
- `../.github/workflows/update-portal-data.yml`: regeneración automática.

## Flujo automático

1. Una modificación de los Markdown o del manifiesto en la rama `main` activa GitHub Actions. El flujo también puede iniciarse manualmente desde la sección de acciones del repositorio.
2. La acción vuelve a leer los documentos públicos y regenera:
   - `portal-data/search-index.json`;
   - `portal-data/calendar-events.json`.
3. La validación comprueba el número de documentos, fragmentos, actuaciones, campos obligatorios, identificadores y fechas.
4. Si el resultado es válido y ha cambiado, la acción publica los nuevos JSON en el repositorio.
5. El portal consulta esos archivos al abrirse, sin exigir una nueva publicación de la interfaz.
6. Si GitHub no está disponible temporalmente, utiliza la copia estable incluida en la última versión publicada.

Este flujo mantiene una única fuente documental pública y evita mantener manualmente una segunda copia del calendario.

## Alcance

Las modificaciones documentales se reflejan automáticamente en el buscador, las fichas, los ámbitos, los programas, el calendario y los próximos hitos. Los cambios de diseño o de funcionalidad de la propia interfaz requieren crear una nueva versión del sitio, porque pertenecen al código y no al contenido documental.

La web sigue siendo una guía de apoyo. No sustituye la normativa, las instrucciones oficiales ni los sistemas institucionales.

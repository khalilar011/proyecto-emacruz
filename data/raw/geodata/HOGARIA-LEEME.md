# Geografía de Bolivia, de Hogaria. Versión 2026-10

Todo Bolivia, de los departamentos a los barrios: los límites de los 339
municipios, sus distritos, los barrios, zonas y unidades vecinales con su
contorno y las localidades del Censo 2024, con los códigos del INE y de
Wikidata para unirlos con otros datos. Es la geografía con la que Hogaria
ubica cada anuncio, y la que muestra en https://hogaria.com/geo.

Gratis, para cualquier uso, también comercial, bajo la Open Database License
(ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/

## Archivos

| Archivo | Qué tiene |
| --- | --- |
| `bolivia.gpkg` | Todas las capas en un GeoPackage, con toda la precisión (QGIS, ArcGIS, GDAL, R, Python) |
| `<capa>.geojson` | Una capa por archivo, GeoJSON (RFC 7946), 6 decimales |
| `geojson.zip` | Todos los GeoJSON |
| `csv.zip` | Cada capa en CSV, sin geometría, con `latitud` y `longitud` de un punto dentro del lugar |
| `SHA256SUMS` | Sumas de verificación |

Descargas: https://hogaria.com/geo/datos/<archivo> es siempre la versión más
nueva; https://hogaria.com/geo/datos/2026-10/<archivo>, esta versión.
Coordenadas en WGS 84 (EPSG:4326).

## Capas

| Capa | Filas | Código |
| --- | --- | --- |
| `departamentos` | 9 | `codigo_ine` |
| `provincias` | 112 | `codigo_ine` |
| `municipios` | 339 | `codigo_ine` |
| `areas_metropolitanas` | 2 | `codigo` |
| `distritos` | 103 | `codigo` |
| `barrios` | 3.821 | `codigo` |
| `barrios_puntos` | 779 | `codigo` |
| `localidades` | 23.817 | `codigo_censo` |

**departamentos**: `codigo_ine`, `iso_3166_2` (BO-S), `nombre`, `wikidata`,
`poblacion` (Censo 2024). El contorno es la unión de sus municipios.

**provincias**: `codigo_ine`, `nombre`, `departamento_ine`, `wikidata`,
`poblacion`. El contorno es la unión de sus municipios.

**municipios**: `codigo_ine` (6 dígitos), `nombre`, `nombre_oficial`,
`provincia_ine`, `departamento_ine`, `area_metropolitana` (su `codigo`, si
está en una), `wikidata`, `osm_relacion` (la relación de OpenStreetMap),
`poblacion`.

**areas_metropolitanas**: las que crea una ley (Santa Cruz, Ley Departamental
187; Kanata, Cochabamba, Ley 533). `codigo`, `nombre`, `base_legal`,
`municipios_ine` (separados por comas).

**distritos**: distritos municipales. `codigo` (municipio + distrito:
`070101-distrito-5`), `municipio_ine`, `codigo_distrito` (el del municipio),
`nombre`, `fuente`.

**barrios**: barrios, zonas, unidades vecinales, juntas vecinales,
urbanizaciones y localidades, con su contorno. Cada punto de un municipio
dibujado cae en uno solo. `codigo`, `nombre`, `tipo` (uv, zona, barrio,
urbanizacion, condominio, localidad), `fuente`, `municipio_ine`,
`distrito_codigo` (el `codigo` de su distrito), `localidad_codigo` (la
localidad del Censo 2024 donde vive la mayoría de su gente), `poblacion` y
`viviendas` (Censo 2024: las manzanas cuyo centro cae adentro).

**barrios_puntos**: barrios que conocemos por un punto y no por un contorno
(los nombres de OpenStreetMap que ningún contorno cubre). Mismos campos que
`barrios`, sin cifras del censo.

**localidades**: las localidades del Censo 2024, urbanas y rurales.
`codigo_censo`, `nombre`, `municipio_ine`, `urbana`, `poblacion`, `viviendas`.

El `codigo` de un barrio es el `codigo_ine` de su municipio más su nombre
(`030101-cala-cala`); si el municipio repite el nombre, más su tipo y el
código de su fuente (la unidad vecinal 2 de Santa Cruz: `070101-centro-uv-2`)
o un número. No cambia
entre versiones mientras no cambie el nombre.

## Fuentes (`fuente`)

| Valor | Fuente |
| --- | --- |
| `gamscs` | Gobierno Autónomo Municipal de Santa Cruz de la Sierra, Guía Urbana: unidades vecinales y distritos |
| `gamlp` | Gobierno Autónomo Municipal de La Paz, Sistema de Información Territorial: zonas; distritos de El Alto |
| `gadch` | Gobierno Autónomo Departamental de Chuquisaca, GeoServer: juntas vecinales de Sucre |
| `arcgis_cochabamba` | Barrios de Cochabamba, mapa en ArcGIS Online (item b0d73d4c8da54804b274ce2c214cf538) |
| `arcgis_oruro` | Distritos de Oruro, mapa en ArcGIS Online (item 87a1ff4338fc4b6896b853cc7269e70a) |
| `ciudatoslab` | Ciudatos Lab: distritos de la región metropolitana de Cochabamba |
| `census_osm` | Manzanas del Censo 2024 y áreas residenciales de OpenStreetMap, divididas alrededor de los barrios con nombre |
| `osm` | OpenStreetMap |

Además: los límites municipales de geoBoundaries y GeoBolivia; los municipios,
localidades, manzanas, población y viviendas del Censo de Población y
Vivienda 2024 del INE, en las capas abiertas de umayakuy (QGISCenso2024); los
identificadores de Wikidata. Datos de OpenStreetMap © OpenStreetMap
contributors, ODbL (https://www.openstreetmap.org/copyright).

Gracias a todos los que abren sus datos.

## Licencia

Open Database License (ODbL) 1.0. Podés copiar, distribuir, usar y adaptar
estos datos para cualquier fin, también comercial, si:

- citás a Hogaria y a OpenStreetMap (ver abajo);
- compartís bajo la misma licencia una base de datos que derive de esta y que
  redistribuyas.

## Cómo citarlo

> Hogaria (2026). Geografía de Bolivia: departamentos, municipios y
> barrios. Versión 2026-10. https://hogaria.com/geo. ODbL 1.0. Con datos
> de © OpenStreetMap contributors.

## In English

Bolivia's geography from departments down to neighborhoods: the boundaries
of all 339 municipalities, municipal districts, neighborhood polygons and
points, and the 2024 census localities, keyed by INE codes and Wikidata ids.
Free for any use, including commercial, under the ODbL 1.0: credit Hogaria
and OpenStreetMap, and share derived databases you redistribute under the
same license. Field names are in Spanish; the tables above describe them.
Cite as: Hogaria (2026). Geografía de Bolivia. Version 2026-10.
https://hogaria.com/geo. ODbL 1.0.

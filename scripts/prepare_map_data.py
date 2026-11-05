"""Prepara el límite y las 15 UV verificables del Distrito Municipal N.º 2."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data/raw/geodata"
DISTRICTS = RAW_DIR / "hogaria-2026-10-distritos.geojson"
NEIGHBORHOODS = RAW_DIR / "hogaria-2026-10-barrios.geojson"
PROCESSED = ROOT / "data/processed/geodata/distrito-2-uv.geojson"

EXPECTED_HASHES = {
    DISTRICTS: "5390f1fa43377c15424ca6a2d85784f8d01f2ca22b7d9cc0450d3b731c991f82",
    NEIGHBORHOODS: "442084e4e3c79e1340be4e40b0e250176f7363bfd0671c21c93cbfaa19c822b5",
}

# Las 15 entidades son las UV del DM-2 en la capa municipal. Algunos nombres de
# origen son barrios de referencia; la correspondencia numérica se contrasta con
# las páginas 15-16 de la Guía Urbana y el mapa suministrado al proyecto.
UV_BY_SOURCE_CODE = {
    "070101-centro-uv-15": 15,
    "070101-petrolero-norte": 16,
    "070101-los-tusequis-uv-17": 17,
    "070101-18": 18,
    "070101-villarroel": 19,
    "070101-centro-uv-20": 20,
    "070101-21": 21,
    "070101-ende-uv-22": 22,
    "070101-bancruz": 37,
    "070101-hamacas": 38,
    "070101-39": 39,
    "070101-gil-reyes": 40,
    "070101-conavi": 41,
    "070101-centro-uv-42": 42,
    "070101-totai-uv-43": 43,
}


class MapDataError(ValueError):
    pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise MapDataError(f"No existe la fuente {path.relative_to(ROOT)}")
    observed = sha256(path)
    expected = EXPECTED_HASHES[path]
    if observed != expected:
        raise MapDataError(
            f"SHA-256 inesperado para {path.name}: {observed}; se esperaba {expected}"
        )
    with path.open(encoding="utf-8") as stream:
        return json.load(stream)


def feature_copy(feature: dict[str, Any], properties: dict[str, Any]) -> dict[str, Any]:
    geometry = feature.get("geometry")
    if not geometry or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
        raise MapDataError(f"Geometría ausente o no poligonal para {properties}")
    return {"type": "Feature", "properties": properties, "geometry": geometry}


def build() -> dict[str, Any]:
    districts = load(DISTRICTS)
    neighborhoods = load(NEIGHBORHOODS)
    district_candidates = [
        feature
        for feature in districts.get("features", [])
        if feature.get("properties", {}).get("codigo") == "070101-distrito-2"
    ]
    if len(district_candidates) != 1:
        raise MapDataError(
            f"Se esperaba un límite para 070101-distrito-2; se hallaron {len(district_candidates)}"
        )

    source_features = {
        feature.get("properties", {}).get("codigo"): feature
        for feature in neighborhoods.get("features", [])
        if feature.get("properties", {}).get("distrito_codigo")
        == "070101-distrito-2"
    }
    missing = set(UV_BY_SOURCE_CODE) - set(source_features)
    if missing:
        raise MapDataError("Faltan UV fuente: " + ", ".join(sorted(missing)))

    district = feature_copy(
        district_candidates[0],
        {
            "kind": "district",
            "district_id": "DM-2",
            "name": "Distrito Municipal N.º 2",
            "source_code": "070101-distrito-2",
            "source": "gamscs-hogaria-2026-10",
        },
    )
    uv_features = []
    for source_code, uv in sorted(UV_BY_SOURCE_CODE.items(), key=lambda item: item[1]):
        source = source_features[source_code]
        properties = source["properties"]
        uv_features.append(
            feature_copy(
                source,
                {
                    "kind": "uv",
                    "uv": uv,
                    "name": f"UV {uv}",
                    "source_code": source_code,
                    "source_name": properties.get("nombre"),
                    "source": "gamscs-hogaria-2026-10",
                },
            )
        )

    if len(uv_features) != 15 or len({item["properties"]["uv"] for item in uv_features}) != 15:
        raise MapDataError("La salida no contiene exactamente 15 UV únicas")

    return {
        "type": "FeatureCollection",
        "name": "Distrito Municipal N.º 2 — límite y unidades vecinales",
        "license": "ODbL-1.0",
        "attribution": "Hogaria (2026), GAMSCS y © OpenStreetMap contributors",
        "source_url": "https://hogaria.com/geo",
        "source_version": "2026-10",
        "limitations": "Geometrías de distrito y UV; no son rutas de recolección ni límites exactos de barrios.",
        "features": [district, *uv_features],
    }


def serialize(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verifica la salida sin escribir")
    args = parser.parse_args()
    try:
        result = build()
        expected = serialize(result)
        if args.check:
            stale = [
                str(path.relative_to(ROOT))
                for path in (PROCESSED,)
                if not path.is_file() or path.read_text(encoding="utf-8") != expected
            ]
            if stale:
                raise MapDataError("Archivos ausentes o desactualizados: " + ", ".join(stale))
            print("GeoJSON actualizado: 1 distrito y 15 UV; fuentes sin modificar.")
        else:
            for path in (PROCESSED,):
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(expected, encoding="utf-8")
            print("Generado GeoJSON: 1 distrito y 15 UV verificables.")
        return 0
    except (OSError, json.JSONDecodeError, MapDataError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

"""Genera la migración reproducible del catálogo de barrios y servicios."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "web/data/distrito-2.json"
OUTPUT = ROOT / "supabase/migrations/0002_catalog.sql"


def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build() -> str:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    barrios = data.get("barrios", [])
    servicios = data.get("servicios", [])
    if len(barrios) != 26 or len(servicios) != 104:
        raise ValueError(
            f"Catálogo inesperado: {len(barrios)} barrios y {len(servicios)} servicios"
        )

    lines = [
        "-- Generado por scripts/generate_supabase_catalog.py; no editar a mano.",
        "-- Fuente: web/data/distrito-2.json (derivada del Excel simulado).",
        "",
        "insert into public.neighborhood_catalog (id, name, uv, active) values",
    ]
    lines.extend(
        f"  ({quote(item['id'])}, {quote(item['nombre'])}, {int(item['uv'])}, true){',' if index < len(barrios) - 1 else ''}"
        for index, item in enumerate(barrios)
    )
    lines.extend(
        [
            "on conflict (id) do update set",
            "  name = excluded.name, uv = excluded.uv, active = excluded.active;",
            "",
            "insert into public.service_catalog (",
            "  id, neighborhood_id, truck_id, day_of_week, start_time, end_time, truck_order, active",
            ") values",
        ]
    )
    lines.extend(
        "  (" + ", ".join(
            [
                quote(item["id"]),
                quote(item["barrio_id"]),
                quote(item["camion"]),
                str(int(item["dia_indice"]) + 1),
                quote(item["inicio"]),
                quote(item["fin"]),
                str(int(item["orden_camion"])),
                "true",
            ]
        ) + ")" + ("," if index < len(servicios) - 1 else "")
        for index, item in enumerate(servicios)
    )
    lines.extend(
        [
            "on conflict (id) do update set",
            "  neighborhood_id = excluded.neighborhood_id,",
            "  truck_id = excluded.truck_id,",
            "  day_of_week = excluded.day_of_week,",
            "  start_time = excluded.start_time,",
            "  end_time = excluded.end_time,",
            "  truck_order = excluded.truck_order,",
            "  active = excluded.active;",
            "",
            "do $$",
            "begin",
            "  if (select count(*) from public.neighborhood_catalog where active) <> 26 then",
            "    raise exception 'Se esperaban 26 barrios activos';",
            "  end if;",
            "  if (select count(*) from public.service_catalog where active) <> 104 then",
            "    raise exception 'Se esperaban 104 servicios activos';",
            "  end if;",
            "end;",
            "$$;",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        expected = build()
        if args.check:
            if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != expected:
                raise ValueError("supabase/migrations/0002_catalog.sql está desactualizada")
            print("Catálogo Supabase actualizado: 26 barrios y 104 servicios.")
        else:
            OUTPUT.parent.mkdir(parents=True, exist_ok=True)
            OUTPUT.write_text(expected, encoding="utf-8")
            print("Generada migración Supabase: 26 barrios y 104 servicios.")
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

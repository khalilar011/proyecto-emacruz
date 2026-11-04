"""Valida y exporta la base simulada del Distrito Municipal N.º 2."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import time
from pathlib import Path
from typing import Any, Iterable

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/raw/distrito-2/Distrito_2_horarios_SIMULADOS.xlsx"
PROCESSED = ROOT / "data/processed/distrito-2/Distrito_2_horarios_SIMULADOS.json"
VALIDATION = ROOT / "data/processed/distrito-2/validacion.json"
WEB_DATA = ROOT / "web/data/distrito-2.json"
NOTICE = "SIMULACIÓN ACADÉMICA — NO ES INFORMACIÓN OPERATIVA OFICIAL"

DAYS = [
    ("Lunes", "lunes", 0),
    ("Martes", "martes", 1),
    ("Miércoles", "miercoles", 2),
    ("Jueves", "jueves", 3),
    ("Viernes", "viernes", 4),
    ("Sábado", "sabado", 5),
    ("Domingo", "domingo", 6),
]
DAY_INFO = {source: (key, index) for source, key, index in DAYS}
DAY_KEYS = [key for _, key, _ in DAYS]
SLOTS = {("08:00", "11:00"), ("11:30", "14:30"), ("15:00", "18:00")}


class ValidationError(ValueError):
    pass


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean(value: Any) -> str:
    return "" if value is None else str(value).strip()


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFD", clean(value).casefold())
    return "".join(char for char in text if unicodedata.category(char) != "Mn")


def rows(worksheet: Any, header_row: int = 4) -> Iterable[tuple[int, dict[str, Any]]]:
    headers = [clean(cell.value) for cell in worksheet[header_row]]
    if not all(headers):
        raise ValidationError(f"{worksheet.title}: encabezados incompletos")
    for number, values in enumerate(
        worksheet.iter_rows(min_row=header_row + 1, values_only=True), header_row + 1
    ):
        if any(clean(value) for value in values):
            yield number, dict(zip(headers, values, strict=False))


def require_columns(name: str, data: list[tuple[int, dict[str, Any]]], expected: set[str]) -> None:
    if not data:
        raise ValidationError(f"{name}: no contiene datos")
    missing = expected - set(data[0][1])
    if missing:
        raise ValidationError(f"{name}: faltan columnas {', '.join(sorted(missing))}")


def format_time(value: Any, row: int, field: str) -> str:
    if isinstance(value, time):
        return value.strftime("%H:%M")
    text = clean(value)
    if re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", text):
        return text
    raise ValidationError(f"Agenda_camiones fila {row}: {field} inválido {value!r}")


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"No se encontró {SOURCE}")
    before = sha256(SOURCE)
    workbook = load_workbook(SOURCE, read_only=True, data_only=True)
    needed = {"Consulta_barrios", "Agenda_camiones", "Fuentes", "Diccionario", "Validacion"}
    if missing := needed - set(workbook.sheetnames):
        workbook.close()
        raise ValidationError(f"Faltan hojas: {', '.join(sorted(missing))}")

    catalog_rows = list(rows(workbook["Consulta_barrios"]))
    agenda_rows = list(rows(workbook["Agenda_camiones"]))
    source_rows = list(rows(workbook["Fuentes"]))
    require_columns("Consulta_barrios", catalog_rows, {"Barrio", "UV", "Barrio ID"})
    require_columns(
        "Agenda_camiones",
        agenda_rows,
        {"Día", "Camión", "Orden", "Barrio ID", "Barrio", "Inicio", "Fin"},
    )
    require_columns(
        "Fuentes",
        source_rows,
        {"Barrio ID", "Nombre original", "Nombre en mapa", "Referencia", "Observación"},
    )

    errors: list[str] = []
    warnings = [
        "La fuente no contiene rutas ni trayectorias; se publican servicios y camiones simulados sin inventarlas."
    ]
    barrios: dict[str, dict[str, Any]] = {}
    seen_names: set[str] = set()
    incomplete = 0
    duplicate_count = 0

    for number, row in catalog_rows:
        barrio_id, name = clean(row["Barrio ID"]), clean(row["Barrio"])
        if not barrio_id or not name or row["UV"] in (None, ""):
            incomplete += 1
            errors.append(f"Consulta_barrios fila {number}: dato obligatorio vacío")
            continue
        if barrio_id in barrios or normalize(name) in seen_names:
            duplicate_count += 1
            errors.append(f"Consulta_barrios fila {number}: barrio duplicado {barrio_id} / {name}")
            continue
        seen_names.add(normalize(name))
        try:
            uv = int(row["UV"])
        except (TypeError, ValueError):
            errors.append(f"Consulta_barrios fila {number}: UV inválida")
            continue
        barrios[barrio_id] = {
            "id": barrio_id,
            "nombre": name,
            "uv": uv,
            "fila_origen": number,
            "nombre_mapa": name,
            "referencia_fuente": "",
            "observacion_fuente": None,
            "horarios": {day: None for day in DAY_KEYS},
        }

    referenced: set[str] = set()
    for number, row in source_rows:
        barrio_id = clean(row["Barrio ID"])
        if barrio_id in referenced:
            errors.append(f"Fuentes fila {number}: referencia duplicada {barrio_id}")
        referenced.add(barrio_id)
        if barrio_id not in barrios:
            errors.append(f"Fuentes fila {number}: barrio inexistente {barrio_id}")
            continue
        barrios[barrio_id]["nombre_mapa"] = clean(row["Nombre en mapa"]) or barrios[barrio_id]["nombre"]
        barrios[barrio_id]["referencia_fuente"] = clean(row["Referencia"])
        barrios[barrio_id]["observacion_fuente"] = clean(row["Observación"]) or None
    for barrio_id in sorted(set(barrios) - referenced):
        errors.append(f"Barrio sin referencia de fuente: {barrio_id}")

    services: list[dict[str, Any]] = []
    truck_days: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for number, row in agenda_rows:
        barrio_id, day_name, truck = clean(row["Barrio ID"]), clean(row["Día"]), clean(row["Camión"])
        if barrio_id not in barrios:
            errors.append(f"Agenda_camiones fila {number}: barrio inexistente {barrio_id}")
            continue
        if day_name not in DAY_INFO:
            errors.append(f"Agenda_camiones fila {number}: día inválido {day_name!r}")
            continue
        if not truck:
            incomplete += 1
            errors.append(f"Agenda_camiones fila {number}: camión vacío")
            continue
        if normalize(row["Barrio"]) != normalize(barrios[barrio_id]["nombre"]):
            errors.append(f"Agenda_camiones fila {number}: nombre de barrio no coincide")
        try:
            start = format_time(row["Inicio"], number, "Inicio")
            end = format_time(row["Fin"], number, "Fin")
        except ValidationError as error:
            errors.append(str(error))
            continue
        if start >= end:
            errors.append(f"Agenda_camiones fila {number}: inicio no anterior al fin")
        if (start, end) not in SLOTS:
            errors.append(f"Agenda_camiones fila {number}: franja inesperada {start}–{end}")
        day, day_index = DAY_INFO[day_name]
        if barrios[barrio_id]["horarios"][day] is not None:
            errors.append(f"Servicio duplicado: {barrio_id} {day_name}")
            continue
        service = {
            "id": f"D2-S{len(services) + 1:03d}",
            "dia": day,
            "dia_nombre": day_name,
            "dia_indice": day_index,
            "barrio_id": barrio_id,
            "camion": truck,
            "inicio": start,
            "fin": end,
            "orden_camion": int(row["Orden"]),
            "fila_origen": number,
        }
        services.append(service)
        barrios[barrio_id]["horarios"][day] = {
            key: service[key]
            for key in ("id", "dia", "dia_nombre", "dia_indice", "camion", "inicio", "fin")
        }
        truck_days[(day_name, truck)].append(service)

    for (day_name, truck), assignments in truck_days.items():
        assignments.sort(key=lambda item: item["inicio"])
        for previous, current in zip(assignments, assignments[1:]):
            previous_end = int(previous["fin"][:2]) * 60 + int(previous["fin"][3:])
            current_start = int(current["inicio"][:2]) * 60 + int(current["inicio"][3:])
            if current_start - previous_end < 30:
                errors.append(f"{day_name} {truck}: servicios superpuestos o sin 30 minutos")

    groups: Counter[tuple[str, ...]] = Counter()
    for barrio in barrios.values():
        active = [day for day in DAY_KEYS if barrio["horarios"][day] is not None]
        barrio["dias_recoleccion"] = active
        barrio["frecuencia_semanal"] = len(active)
        groups[tuple(active)] += 1
        if len(active) != 4:
            errors.append(f"{barrio['id']}: frecuencia semanal {len(active)}, esperada 4")
    expected = Counter(
        {
            ("lunes", "miercoles", "viernes", "sabado"): 14,
            ("martes", "jueves", "sabado", "domingo"): 12,
        }
    )
    if groups != expected:
        errors.append(f"Distribución semanal inesperada: {dict(groups)}")
    sunday = [service for service in services if service["dia"] == "domingo"]
    if len(sunday) != 12 or any((item["inicio"], item["fin"]) != ("15:00", "18:00") for item in sunday):
        errors.append("Servicios dominicales distintos de 12 × 15:00–18:00")

    workbook.close()
    after = sha256(SOURCE)
    if before != after:
        errors.append("La fuente cambió durante la lectura")
    validation = {
        "estado": "cumple" if not errors else "no_cumple",
        "fuente": str(SOURCE.relative_to(ROOT)),
        "sha256_antes": before,
        "sha256_despues": after,
        "conteos": {
            "barrios": len(barrios),
            "unidades_vecinales": len({item["uv"] for item in barrios.values()}),
            "servicios": len(services),
            "camiones": len({item["camion"] for item in services}),
            "servicios_dominicales": len(sunday),
            "barrios_duplicados": duplicate_count,
            "referencias_inexistentes": sum("inexistente" in item for item in errors),
            "datos_incompletos": incomplete,
        },
        "errores": errors,
        "advertencias": warnings,
    }
    if errors:
        raise ValidationError("\n".join(errors))
    if (len(barrios), len(services)) != (26, 104):
        raise ValidationError(f"Conteos inesperados: {len(barrios)} barrios, {len(services)} servicios")

    payload = {
        "esquema": 2,
        "distrito": {
            "id": "DM-2",
            "nombre": "Distrito Municipal N.º 2",
            "municipio": "Santa Cruz de la Sierra",
            "zona_horaria": "America/La_Paz",
        },
        "simulacion": True,
        "advertencia": NOTICE,
        "fuente": {
            "archivo": SOURCE.name,
            "sha256": before,
            "hojas": ["Consulta_barrios", "Agenda_camiones", "Fuentes"],
            "vigencia_operativa": "No acreditada",
        },
        "limitaciones": {
            "rutas_operativas": "No disponibles en la fuente",
            "coordenadas": "No disponibles en la fuente",
            "tiempo_real": False,
        },
        "mapas": [
            {"id": "barrios", "titulo": "Barrios del Distrito 2", "archivo": "assets/maps/distrito-2-barrios.webp"},
            {"id": "plano", "titulo": "Plano municipal del Distrito 2", "archivo": "assets/maps/distrito-2-plano-municipal.jpg"},
            {"id": "uv", "titulo": "Unidades vecinales y catálogo de barrios", "archivo": "assets/maps/distrito-2-unidades-vecinales.webp"},
        ],
        "barrios": sorted(barrios.values(), key=lambda item: normalize(item["nombre"])),
        "servicios": services,
    }
    return payload, validation


def serialized(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def write(payload: dict[str, Any], validation: dict[str, Any]) -> None:
    PROCESSED.parent.mkdir(parents=True, exist_ok=True)
    WEB_DATA.parent.mkdir(parents=True, exist_ok=True)
    content = serialized(payload)
    PROCESSED.write_text(content, encoding="utf-8")
    WEB_DATA.write_text(content, encoding="utf-8")
    VALIDATION.write_text(serialized(validation), encoding="utf-8")


def check(payload: dict[str, Any], validation: dict[str, Any]) -> None:
    expected = {PROCESSED: serialized(payload), WEB_DATA: serialized(payload), VALIDATION: serialized(validation)}
    stale = [str(path.relative_to(ROOT)) for path, content in expected.items() if not path.is_file() or path.read_text(encoding="utf-8") != content]
    if stale:
        raise ValidationError("Archivos ausentes o desactualizados: " + ", ".join(stale))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verifica sin escribir")
    args = parser.parse_args()
    try:
        payload, validation = build()
        if args.check:
            check(payload, validation)
            print("Datos y validación actualizados; no se modificó ningún archivo.")
        else:
            write(payload, validation)
            print(f"Exportados {len(payload['barrios'])} barrios y {len(payload['servicios'])} servicios simulados.")
        return 0
    except (FileNotFoundError, ValidationError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

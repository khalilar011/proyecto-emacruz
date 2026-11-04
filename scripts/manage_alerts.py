"""Gestiona incidencias manuales y simuladas de Alerta Ruta desde Ubuntu."""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ALERTS = ROOT / "web/data/incidencias.json"
DEFAULT_CATALOG = ROOT / "web/data/distrito-2.json"
ZONE = ZoneInfo("America/La_Paz")
STATES = ("NORMAL", "DEMORA", "SERVICIO_SUSPENDIDO")
NOTICE = "SIMULACIÓN ACADÉMICA — NO ES UN AVISO OFICIAL"


class AlertError(ValueError):
    pass


def now_local() -> datetime:
    return datetime.now(ZONE).replace(microsecond=0)


def parse_datetime(value: str, field: str) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as error:
        raise AlertError(f"{field} debe ser ISO 8601, por ejemplo 2026-11-04T14:00:00-04:00") from error
    if parsed.tzinfo is None:
        raise AlertError(f"{field} debe incluir zona horaria, por ejemplo -04:00")
    return parsed.astimezone(ZONE).replace(microsecond=0)


def iso(value: datetime) -> str:
    return value.astimezone(ZONE).isoformat(timespec="seconds")


def empty_payload() -> dict[str, Any]:
    return {
        "esquema": 1,
        "zona_horaria": "America/La_Paz",
        "simulacion": True,
        "advertencia": NOTICE,
        "ultima_actualizacion": None,
        "incidencias": [],
    }


def load_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise AlertError(f"No existe {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise AlertError(f"JSON inválido en {path}: {error}") from error
    if not isinstance(value, dict):
        raise AlertError(f"{path} debe contener un objeto JSON")
    return value


def load_alerts(path: Path) -> dict[str, Any]:
    return load_json(path) if path.is_file() else empty_payload()


def catalog_sets(path: Path) -> dict[str, set[str]]:
    data = load_json(path)
    return {
        "barrios": {item["id"] for item in data.get("barrios", [])},
        "camiones": {item["camion"] for item in data.get("servicios", [])},
        "servicios": {item["id"] for item in data.get("servicios", [])},
    }


def targets_from_args(args: argparse.Namespace, previous: dict[str, list[str]] | None = None) -> dict[str, list[str]]:
    provided = any(getattr(args, name, None) is not None for name in ("barrio", "camion", "servicio"))
    if previous is not None and not provided:
        return deepcopy(previous)
    return {
        "barrios": sorted(set(args.barrio or [])),
        "camiones": sorted(set(args.camion or [])),
        "servicios": sorted(set(args.servicio or [])),
    }


def validate_targets(targets: dict[str, list[str]], catalog: dict[str, set[str]]) -> None:
    if not any(targets.values()):
        raise AlertError("Debe indicar al menos un --barrio, --camion o --servicio")
    for kind, values in targets.items():
        unknown = set(values) - catalog[kind]
        if unknown:
            raise AlertError(f"Referencias inexistentes en {kind}: {', '.join(sorted(unknown))}")


def intervals_overlap(first: dict[str, Any], second: dict[str, Any]) -> bool:
    return parse_datetime(first["inicio"], "inicio") < parse_datetime(second["vence"], "vence") and parse_datetime(second["inicio"], "inicio") < parse_datetime(first["vence"], "vence")


def targets_overlap(first: dict[str, list[str]], second: dict[str, list[str]]) -> bool:
    return any(set(first[kind]) & set(second[kind]) for kind in ("barrios", "camiones", "servicios"))


def validate_incident(incident: dict[str, Any], payload: dict[str, Any], catalog: dict[str, set[str]], exclude_id: str | None = None) -> None:
    if incident["estado"] not in STATES:
        raise AlertError(f"Estado inválido: {incident['estado']}")
    start = parse_datetime(incident["inicio"], "inicio")
    end = parse_datetime(incident["vence"], "vence")
    if end <= start:
        raise AlertError("vence debe ser posterior a inicio")
    if not str(incident["motivo"]).strip():
        raise AlertError("motivo no puede estar vacío")
    estimate = incident.get("estimacion_minutos")
    if estimate is not None and (not isinstance(estimate, int) or estimate <= 0):
        raise AlertError("estimacion_minutos debe ser un entero positivo")
    if estimate is not None and incident["estado"] != "DEMORA":
        raise AlertError("La estimación en minutos solo corresponde al estado DEMORA")
    validate_targets(incident["objetivos"], catalog)
    if incident.get("retirada"):
        return
    for other in payload.get("incidencias", []):
        if other.get("id") == exclude_id or other.get("retirada"):
            continue
        if intervals_overlap(incident, other) and targets_overlap(incident["objetivos"], other["objetivos"]):
            raise AlertError(f"Se superpone con {other['id']} para al menos un objetivo")


def save(path: Path, payload: dict[str, Any], timestamp: datetime) -> None:
    payload["ultima_actualizacion"] = iso(timestamp)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def find_incident(payload: dict[str, Any], incident_id: str) -> dict[str, Any]:
    for item in payload.get("incidencias", []):
        if item.get("id") == incident_id:
            return item
    raise AlertError(f"No existe la incidencia {incident_id}")


def create(args: argparse.Namespace, payload: dict[str, Any], catalog: dict[str, set[str]]) -> None:
    timestamp = now_local()
    start, end = parse_datetime(args.inicio, "inicio"), parse_datetime(args.vence, "vence")
    incident_id = f"INC-{timestamp:%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:6].upper()}"
    incident = {
        "id": incident_id,
        "estado": args.estado,
        "motivo": args.motivo.strip(),
        "estimacion_minutos": args.estimacion_minutos,
        "inicio": iso(start),
        "vence": iso(end),
        "actualizada_en": iso(timestamp),
        "actualizada_por": args.responsable.strip(),
        "objetivos": targets_from_args(args),
        "retirada": None,
        "simulacion": True,
        "historial": [{"accion": "creada", "fecha": iso(timestamp), "responsable": args.responsable.strip()}],
    }
    validate_incident(incident, payload, catalog)
    payload.setdefault("incidencias", []).append(incident)
    save(args.archivo, payload, timestamp)
    print(f"Creada {incident_id} ({incident['estado']}).")


def modify(args: argparse.Namespace, payload: dict[str, Any], catalog: dict[str, set[str]]) -> None:
    current = find_incident(payload, args.id)
    if current.get("retirada"):
        raise AlertError("No se puede modificar una incidencia retirada")
    candidate = deepcopy(current)
    for argument, field in (("estado", "estado"), ("motivo", "motivo")):
        value = getattr(args, argument)
        if value is not None:
            candidate[field] = value.strip() if isinstance(value, str) else value
    if args.inicio is not None:
        candidate["inicio"] = iso(parse_datetime(args.inicio, "inicio"))
    if args.vence is not None:
        candidate["vence"] = iso(parse_datetime(args.vence, "vence"))
    if args.quitar_estimacion:
        candidate["estimacion_minutos"] = None
    elif args.estimacion_minutos is not None:
        candidate["estimacion_minutos"] = args.estimacion_minutos
    candidate["objetivos"] = targets_from_args(args, current["objetivos"])
    timestamp = now_local()
    candidate["actualizada_en"] = iso(timestamp)
    candidate["actualizada_por"] = args.responsable.strip()
    candidate.setdefault("historial", []).append({"accion": "modificada", "fecha": iso(timestamp), "responsable": args.responsable.strip()})
    validate_incident(candidate, payload, catalog, exclude_id=args.id)
    current.clear()
    current.update(candidate)
    save(args.archivo, payload, timestamp)
    print(f"Modificada {args.id}.")


def withdraw(args: argparse.Namespace, payload: dict[str, Any]) -> None:
    incident = find_incident(payload, args.id)
    if incident.get("retirada"):
        raise AlertError(f"{args.id} ya estaba retirada")
    timestamp = now_local()
    incident["retirada"] = {"fecha": iso(timestamp), "responsable": args.responsable.strip()}
    incident["actualizada_en"] = iso(timestamp)
    incident["actualizada_por"] = args.responsable.strip()
    incident.setdefault("historial", []).append({"accion": "retirada", "fecha": iso(timestamp), "responsable": args.responsable.strip()})
    save(args.archivo, payload, timestamp)
    print(f"Retirada {args.id}; se conserva en el historial.")


def status(item: dict[str, Any], now: datetime) -> str:
    if item.get("retirada"):
        return "RETIRADA"
    if now < parse_datetime(item["inicio"], "inicio"):
        return "PROGRAMADA"
    if now >= parse_datetime(item["vence"], "vence"):
        return "VENCIDA"
    return "VIGENTE"


def list_alerts(payload: dict[str, Any]) -> None:
    current = now_local()
    items = payload.get("incidencias", [])
    if not items:
        print("No hay incidencias registradas.")
        return
    for item in items:
        targets = ", ".join(value for values in item["objetivos"].values() for value in values)
        print(f"{item['id']} | {status(item, current)} | {item['estado']} | {targets} | vence {item['vence']}")


def validate_file(payload: dict[str, Any], catalog: dict[str, set[str]]) -> None:
    seen: set[str] = set()
    for item in payload.get("incidencias", []):
        if item.get("id") in seen:
            raise AlertError(f"ID duplicado: {item['id']}")
        seen.add(item["id"])
        validate_incident(item, {"incidencias": payload.get("incidencias", [])}, catalog, exclude_id=item["id"])
    print(f"JSON válido: {len(seen)} incidencias, todas simuladas y con referencias existentes.")


def add_targets(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--barrio", action="append", help="Barrio ID; se puede repetir")
    parser.add_argument("--camion", action="append", help="Camión; se puede repetir")
    parser.add_argument("--servicio", action="append", help="Servicio ID; se puede repetir")


def parser() -> argparse.ArgumentParser:
    main = argparse.ArgumentParser(description=__doc__)
    main.add_argument("--archivo", type=Path, default=DEFAULT_ALERTS)
    main.add_argument("--catalogo", type=Path, default=DEFAULT_CATALOG)
    commands = main.add_subparsers(dest="comando", required=True)
    create_parser = commands.add_parser("crear")
    create_parser.add_argument("--estado", choices=STATES, required=True)
    create_parser.add_argument("--motivo", required=True)
    create_parser.add_argument("--estimacion-minutos", type=int)
    create_parser.add_argument("--inicio", required=True)
    create_parser.add_argument("--vence", required=True)
    create_parser.add_argument("--responsable", required=True)
    add_targets(create_parser)
    modify_parser = commands.add_parser("modificar")
    modify_parser.add_argument("id")
    modify_parser.add_argument("--estado", choices=STATES)
    modify_parser.add_argument("--motivo")
    modify_parser.add_argument("--estimacion-minutos", type=int)
    modify_parser.add_argument("--quitar-estimacion", action="store_true")
    modify_parser.add_argument("--inicio")
    modify_parser.add_argument("--vence")
    modify_parser.add_argument("--responsable", required=True)
    add_targets(modify_parser)
    withdraw_parser = commands.add_parser("retirar")
    withdraw_parser.add_argument("id")
    withdraw_parser.add_argument("--responsable", required=True)
    commands.add_parser("listar")
    commands.add_parser("validar")
    return main


def main() -> int:
    args = parser().parse_args()
    try:
        payload = load_alerts(args.archivo)
        catalog = catalog_sets(args.catalogo)
        if args.comando == "crear":
            create(args, payload, catalog)
        elif args.comando == "modificar":
            modify(args, payload, catalog)
        elif args.comando == "retirar":
            withdraw(args, payload)
        elif args.comando == "listar":
            list_alerts(payload)
        else:
            validate_file(payload, catalog)
        return 0
    except AlertError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

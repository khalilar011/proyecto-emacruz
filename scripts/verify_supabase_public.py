"""Verifica la superficie pública de Supabase sin credenciales privadas."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "web/config.js"


def public_config() -> tuple[str, str]:
    text = CONFIG.read_text(encoding="utf-8")
    url = re.search(r'supabaseUrl:\s*"([^"]+)"', text)
    key = re.search(r'supabasePublishableKey:\s*"([^"]+)"', text)
    if not url or not key or not url.group(1) or not key.group(1).startswith("sb_publishable_"):
        raise ValueError("web/config.js no contiene URL y publishable key válidas")
    return url.group(1).rstrip("/"), key.group(1)


def request(
    base_url: str,
    key: str,
    path: str,
    *,
    method: str = "GET",
    payload: dict[str, object] | None = None,
) -> tuple[int, object]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(
        f"{base_url}{path}",
        data=body,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(req, timeout=20) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except HTTPError as error:
        raw = error.read()
        try:
            data: object = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            data = raw.decode("utf-8", errors="replace")
        return error.code, data


def expect_denied(label: str, result: tuple[int, object]) -> None:
    status, _ = result
    if status < 400:
        raise AssertionError(f"{label}: se esperaba denegación y respondió HTTP {status}")


def main() -> int:
    try:
        base_url, key = public_config()
        query = urlencode({"select": "id"})
        status, neighborhoods = request(base_url, key, f"/rest/v1/neighborhood_catalog?{query}")
        if status != 200 or not isinstance(neighborhoods, list) or len(neighborhoods) != 26:
            raise AssertionError(f"Catálogo de barrios inesperado: HTTP {status}")
        status, services = request(base_url, key, f"/rest/v1/service_catalog?{query}")
        if status != 200 or not isinstance(services, list) or len(services) != 104:
            raise AssertionError(f"Catálogo de servicios inesperado: HTTP {status}")
        incident_query = urlencode({
            "select": (
                "id,state,is_simulation,affected_service_ids,"
                "affected_neighborhood_ids,affected_truck_ids"
            )
        })
        status, incidents = request(base_url, key, f"/rest/v1/incidents?{incident_query}")
        if status != 200 or not isinstance(incidents, list):
            raise AssertionError(f"Lectura pública de incidencias inesperada: HTTP {status}")
        for incident in incidents:
            if incident.get("is_simulation") is not True:
                raise AssertionError("Existe una incidencia pública no marcada como simulación")
            if not incident.get("affected_service_ids") or not incident.get("affected_neighborhood_ids"):
                raise AssertionError("Existe una incidencia pública sin alcance explícito")

        expect_denied("Lectura anónima de admin_users", request(base_url, key, "/rest/v1/admin_users?select=user_id"))
        expect_denied(
            "Escritura directa anónima",
            request(base_url, key, "/rest/v1/incidents", method="POST", payload={"state": "DEMORA"}),
        )
        expect_denied(
            "RPC anónima",
            request(
                base_url,
                key,
                "/rest/v1/rpc/create_alerta_ruta_incident",
                method="POST",
                payload={},
            ),
        )
        print(
            "Supabase público verificado: 26 barrios, 104 servicios, "
            f"{len(incidents)} incidencia(s) vigente(s) y escrituras anónimas denegadas."
        )
        return 0
    except (AssertionError, OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

from scripts import validate_supabase_sql


ROOT = Path(__file__).resolve().parents[1]


class LocalReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.references: list[str] = []

    def handle_starttag(self, _tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        for name in ("href", "src"):
            value = values.get(name)
            if value:
                self.references.append(value)


class ExportTests(unittest.TestCase):
    def test_exporter_is_reproducible_and_validated(self) -> None:
        result = subprocess.run(
            [sys.executable, "scripts/export_web_data.py", "--check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads((ROOT / "web/data/distrito-2.json").read_text(encoding="utf-8"))
        validation = json.loads((ROOT / "data/processed/distrito-2/validacion.json").read_text(encoding="utf-8"))
        self.assertEqual(len(data["barrios"]), 26)
        self.assertEqual(len(data["servicios"]), 104)
        self.assertEqual(validation["estado"], "cumple")
        self.assertEqual(validation["sha256_antes"], validation["sha256_despues"])
        self.assertEqual(validation["errores"], [])

    def test_all_neighborhoods_have_four_services_and_known_references(self) -> None:
        data = json.loads((ROOT / "web/data/distrito-2.json").read_text(encoding="utf-8"))
        service_ids = {item["id"] for item in data["servicios"]}
        for barrio in data["barrios"]:
            active = [value for value in barrio["horarios"].values() if value]
            self.assertEqual(len(active), 4, barrio["id"])
            self.assertEqual(barrio["frecuencia_semanal"], 4)
            self.assertTrue(barrio["referencia_fuente"])
            self.assertTrue({item["id"] for item in active} <= service_ids)


class MapAndSupabaseTests(unittest.TestCase):
    def test_map_and_catalog_outputs_are_reproducible(self) -> None:
        for script in ("scripts/prepare_map_data.py", "scripts/generate_supabase_catalog.py", "scripts/validate_supabase_sql.py"):
            result = subprocess.run(
                [sys.executable, script, "--check"], cwd=ROOT,
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
        geodata = json.loads((ROOT / "data/processed/geodata/distrito-2-uv.geojson").read_text(encoding="utf-8"))
        self.assertEqual(len(geodata["features"]), 16)
        self.assertEqual(
            sorted(item["properties"]["uv"] for item in geodata["features"] if item["properties"]["kind"] == "uv"),
            [15, 16, 17, 18, 19, 20, 21, 22, 37, 38, 39, 40, 41, 42, 43],
        )

    def test_supabase_migration_has_rls_rpc_and_no_browser_secret(self) -> None:
        schema = (ROOT / "supabase/migrations/0001_alerta_ruta_schema.sql").read_text(encoding="utf-8")
        for table in ("admin_users", "neighborhood_catalog", "service_catalog", "incidents", "incident_history"):
            self.assertIn(f"alter table public.{table} enable row level security", schema)
        self.assertIn('create policy "Public reads active simulated incidents"', schema)
        self.assertIn("create or replace function public.create_alerta_ruta_incident", schema)
        self.assertIn("create or replace function public.retire_alerta_ruta_incident", schema)
        self.assertIn("affected_service_ids", schema)
        self.assertIn("p_estimated_delay_minutes is null", schema)
        self.assertIn("state <> 'DEMORA' and estimated_delay_minutes is null", schema)
        self.assertIn(
            "revoke all on function public.log_alerta_ruta_incident_change() from public, anon, authenticated",
            schema,
        )
        config = (ROOT / "web/config.js").read_text(encoding="utf-8")
        self.assertNotIn("service_role", config.split("window.ALERTA_RUTA_CONFIG", 1)[1])
        self.assertIn('supabaseUrl: "https://isbjpdslwhpbqfhwxvqr.supabase.co"', config)
        self.assertRegex(config, r'supabasePublishableKey: "sb_publishable_[A-Za-z0-9_-]+"')
        self.assertNotRegex(config, r"sb_secret_|eyJ[A-Za-z0-9_-]{20,}\.")

    def test_catalog_sql_has_closed_service_tuples(self) -> None:
        migration = (ROOT / "supabase/migrations/0002_catalog.sql").read_text(encoding="utf-8")
        service_block = migration.split(") values\n", 2)[2].split("\non conflict", 1)[0]
        rows = [line.strip() for line in service_block.splitlines() if line.strip()]
        self.assertEqual(len(rows), 104)
        self.assertTrue(all(row.endswith("),") for row in rows[:-1]))
        self.assertTrue(rows[-1].endswith(")"))
        self.assertIn("('D2-S001'", rows[0])
        self.assertIn("('D2-S104'", rows[-1])

    def test_remote_admin_flow_is_transactional_and_auth_config_is_safe(self) -> None:
        flow = (ROOT / "supabase/tests/admin_flow_checks.sql").read_text(encoding="utf-8")
        self.assertTrue(flow.lstrip().startswith("-- Prueba remota transaccional"))
        self.assertIn("begin;", flow)
        self.assertTrue(flow.rstrip().endswith("rollback;"))
        for function in (
            "create_alerta_ruta_incident",
            "update_alerta_ruta_incident",
            "retire_alerta_ruta_incident",
        ):
            self.assertIn(function, flow)
        config = (ROOT / "supabase/config.toml").read_text(encoding="utf-8")
        self.assertIn("enable_signup = false", config)
        self.assertIn("enable_anonymous_sign_ins = false", config)
        self.assertIn("minimum_password_length = 8", config)
        self.assertNotIn("sb_secret_", config)
        self.assertNotIn("service_role", config)

    def test_sql_validator_rejects_unclosed_tuple(self) -> None:
        broken = """insert into public.service_catalog (id) values
  ('D2-S001',
  ('D2-S002')
on conflict (id) do nothing;
"""
        with self.assertRaises(validate_supabase_sql.SqlValidationError):
            validate_supabase_sql.insert_rows(broken, "service_catalog")
        with self.assertRaises(validate_supabase_sql.SqlValidationError):
            validate_supabase_sql.validate_balanced("select (1;", "broken.sql")

    def test_public_page_uses_simple_image_viewer(self) -> None:
        page = (ROOT / "web/index.html").read_text(encoding="utf-8")
        self.assertNotIn("leaflet", page.lower())
        self.assertNotIn("interactive-map", page)
        self.assertNotIn("map-truck-filter", page)
        self.assertIn('id="main-map"', page)
        self.assertIn('id="map-dialog"', page)
        self.assertIn('src="map-viewer.js"', page)
        self.assertFalse((ROOT / "web/map.js").exists())
        for item in json.loads((ROOT / "web/data/distrito-2.json").read_text(encoding="utf-8"))["mapas"]:
            self.assertTrue((ROOT / "web" / item["archivo"]).is_file())

    def test_admin_form_exposes_only_delay_and_suspension(self) -> None:
        page = (ROOT / "web/admin/index.html").read_text(encoding="utf-8")
        state_block = page.split('id="incident-state"', 1)[1].split("</select>", 1)[0]
        self.assertIn('value="DEMORA"', state_block)
        self.assertIn('value="SERVICIO_SUSPENDIDO"', state_block)
        self.assertNotIn('value="NORMAL"', state_block)
        for element_id in ("target-coverage", "next-service-window", "now-window", "scope-preview"):
            self.assertIn(f'id="{element_id}"', page)

    def test_public_and_admin_html_have_unique_ids_and_local_resources(self) -> None:
        for relative in ("web/index.html", "web/admin/index.html"):
            page = ROOT / relative
            parser = LocalReferenceParser()
            parser.feed(page.read_text(encoding="utf-8"))
            self.assertEqual(len(parser.ids), len(set(parser.ids)), relative)
            for reference in parser.references:
                parsed = urlsplit(reference)
                if parsed.scheme or parsed.netloc or not parsed.path or parsed.path.startswith("#"):
                    continue
                target = (page.parent / parsed.path).resolve()
                if target.is_dir():
                    target /= "index.html"
                self.assertTrue(target.is_file(), f"{relative}: recurso ausente {reference}")


class AlertCliTests(unittest.TestCase):
    def run_cli(self, alerts: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [
                sys.executable,
                "scripts/manage_alerts.py",
                "--archivo",
                str(alerts),
                "--catalogo",
                str(ROOT / "web/data/distrito-2.json"),
                *arguments,
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )

    def test_create_modify_overlap_and_withdraw(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            alerts = Path(directory) / "incidencias.json"
            created = self.run_cli(
                alerts,
                "crear",
                "--estado",
                "DEMORA",
                "--motivo",
                "Lluvia de prueba",
                "--estimacion-minutos",
                "30",
                "--inicio",
                "2026-11-04T08:00:00-04:00",
                "--vence",
                "2026-11-04T12:00:00-04:00",
                "--responsable",
                "Prueba",
                "--barrio",
                "D2-B11",
            )
            self.assertEqual(created.returncode, 0, created.stderr)
            data = json.loads(alerts.read_text(encoding="utf-8"))
            incident_id = data["incidencias"][0]["id"]
            self.assertTrue(data["incidencias"][0]["simulacion"])
            listed = self.run_cli(alerts, "listar")
            self.assertEqual(listed.returncode, 0, listed.stderr)
            self.assertIn(incident_id, listed.stdout)

            overlapping = self.run_cli(
                alerts,
                "crear",
                "--estado",
                "SERVICIO_SUSPENDIDO",
                "--motivo",
                "Prueba contradictoria",
                "--inicio",
                "2026-11-04T09:00:00-04:00",
                "--vence",
                "2026-11-04T11:00:00-04:00",
                "--responsable",
                "Prueba",
                "--barrio",
                "D2-B11",
            )
            self.assertNotEqual(overlapping.returncode, 0)
            self.assertIn("superpone", overlapping.stderr)
            self.assertEqual(len(json.loads(alerts.read_text(encoding="utf-8"))["incidencias"]), 1)

            modified = self.run_cli(
                alerts,
                "modificar",
                incident_id,
                "--motivo",
                "Lluvia moderada de prueba",
                "--responsable",
                "Prueba admin",
            )
            self.assertEqual(modified.returncode, 0, modified.stderr)
            data = json.loads(alerts.read_text(encoding="utf-8"))
            self.assertEqual(len(data["incidencias"][0]["historial"]), 2)

            withdrawn = self.run_cli(alerts, "retirar", incident_id, "--responsable", "Prueba admin")
            self.assertEqual(withdrawn.returncode, 0, withdrawn.stderr)
            data = json.loads(alerts.read_text(encoding="utf-8"))
            self.assertIsNotNone(data["incidencias"][0]["retirada"])
            self.assertEqual(len(data["incidencias"][0]["historial"]), 3)

            suspended = self.run_cli(
                alerts,
                "crear",
                "--estado",
                "SERVICIO_SUSPENDIDO",
                "--motivo",
                "Falla mecánica de prueba",
                "--inicio",
                "2026-11-05T08:00:00-04:00",
                "--vence",
                "2026-11-05T12:00:00-04:00",
                "--responsable",
                "Prueba admin",
                "--servicio",
                "D2-S001",
            )
            self.assertEqual(suspended.returncode, 0, suspended.stderr)
            data = json.loads(alerts.read_text(encoding="utf-8"))
            self.assertEqual(data["incidencias"][1]["estado"], "SERVICIO_SUSPENDIDO")
            self.assertIsNone(data["incidencias"][1]["estimacion_minutos"])
            self.assertEqual(data["incidencias"][1]["objetivos"]["servicios"], ["D2-S001"])

    def test_rejects_unknown_reference_without_writing(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            alerts = Path(directory) / "incidencias.json"
            result = self.run_cli(
                alerts,
                "crear",
                "--estado",
                "DEMORA",
                "--motivo",
                "Prueba",
                "--inicio",
                "2026-11-04T08:00:00-04:00",
                "--vence",
                "2026-11-04T09:00:00-04:00",
                "--responsable",
                "Prueba",
                "--barrio",
                "D2-INEXISTENTE",
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(alerts.exists())


if __name__ == "__main__":
    unittest.main()

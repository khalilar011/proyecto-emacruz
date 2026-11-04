from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


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

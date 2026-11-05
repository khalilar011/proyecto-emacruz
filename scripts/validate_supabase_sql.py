"""Valida estructura básica y catálogo de las migraciones SQL de Supabase."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase/migrations"
SETUP = ROOT / "supabase/setup"
TESTS = ROOT / "supabase/tests"
CATALOG = MIGRATIONS / "0002_catalog.sql"


class SqlValidationError(ValueError):
    pass


def strip_literals_and_comments(sql: str) -> str:
    """Elimina literales/comentarios para comprobar delimitadores externos."""
    output: list[str] = []
    index = 0
    state = "normal"
    dollar_tag = ""
    while index < len(sql):
        char = sql[index]
        pair = sql[index : index + 2]
        if state == "line_comment":
            if char == "\n":
                state = "normal"
                output.append(char)
            index += 1
            continue
        if state == "block_comment":
            if pair == "*/":
                state = "normal"
                index += 2
            else:
                index += 1
            continue
        if state == "single_quote":
            if pair == "''":
                index += 2
            elif char == "'":
                state = "normal"
                index += 1
            else:
                index += 1
            continue
        if state == "double_quote":
            if pair == '""':
                index += 2
            elif char == '"':
                state = "normal"
                index += 1
            else:
                index += 1
            continue
        if state == "dollar_quote":
            if sql.startswith(dollar_tag, index):
                state = "normal"
                index += len(dollar_tag)
            else:
                index += 1
            continue

        if pair == "--":
            state = "line_comment"
            index += 2
        elif pair == "/*":
            state = "block_comment"
            index += 2
        elif char == "'":
            state = "single_quote"
            index += 1
        elif char == '"':
            state = "double_quote"
            index += 1
        elif char == "$":
            match = re.match(r"\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$", sql[index:])
            if match:
                dollar_tag = match.group(0)
                state = "dollar_quote"
                index += len(dollar_tag)
            else:
                output.append(char)
                index += 1
        else:
            output.append(char)
            index += 1
    if state not in {"normal", "line_comment"}:
        raise SqlValidationError(f"Literal o comentario SQL sin cerrar: {state}")
    return "".join(output)


def validate_balanced(sql: str, name: str) -> None:
    cleaned = strip_literals_and_comments(sql)
    stack: list[tuple[str, int]] = []
    pairs = {")": "(", "]": "["}
    for position, char in enumerate(cleaned):
        if char in "([":
            stack.append((char, position))
        elif char in pairs:
            if not stack or stack[-1][0] != pairs[char]:
                raise SqlValidationError(f"{name}: delimitador {char} inesperado")
            stack.pop()
    if stack:
        char, position = stack[-1]
        raise SqlValidationError(f"{name}: delimitador {char} sin cerrar cerca de {position}")
    if not cleaned.strip().endswith(";"):
        raise SqlValidationError(f"{name}: la migración no termina en punto y coma")


def insert_rows(sql: str, table: str) -> list[str]:
    pattern = re.compile(
        rf"insert into public\.{re.escape(table)}\s*\([^;]+?\) values\n(?P<rows>.*?)\non conflict",
        re.DOTALL,
    )
    match = pattern.search(sql)
    if not match:
        raise SqlValidationError(f"No se encontró INSERT de {table}")
    rows = [line.strip() for line in match.group("rows").splitlines() if line.strip()]
    for index, row in enumerate(rows):
        expected_end = ")," if index < len(rows) - 1 else ")"
        if not row.startswith("(") or not row.endswith(expected_end):
            raise SqlValidationError(
                f"{table}, tupla {index + 1}: se esperaba cierre {expected_end!r}: {row}"
            )
    return rows


def validate_catalog(sql: str) -> None:
    neighborhoods = insert_rows(sql, "neighborhood_catalog")
    services = insert_rows(sql, "service_catalog")
    if len(neighborhoods) != 26:
        raise SqlValidationError(f"Se esperaban 26 barrios; hay {len(neighborhoods)}")
    if len(services) != 104:
        raise SqlValidationError(f"Se esperaban 104 servicios; hay {len(services)}")
    ids = []
    for row in services:
        match = re.match(r"\('(?P<id>D2-S\d{3})',", row)
        if not match:
            raise SqlValidationError(f"Tupla de servicio inválida: {row}")
        ids.append(match.group("id"))
    expected = [f"D2-S{number:03d}" for number in range(1, 105)]
    if ids != expected:
        raise SqlValidationError("Los IDs de servicios no forman la secuencia D2-S001…D2-S104")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true",
        help="Valida sin modificar archivos (comportamiento predeterminado).",
    )
    parser.parse_args()
    try:
        migrations = sorted(MIGRATIONS.glob("*.sql"))
        setup_files = sorted(SETUP.glob("*.sql"))
        test_files = sorted(TESTS.glob("*.sql"))
        if not migrations:
            raise SqlValidationError("No existen migraciones SQL")
        for path in [*migrations, *setup_files, *test_files]:
            validate_balanced(path.read_text(encoding="utf-8"), path.name)
        validate_catalog(CATALOG.read_text(encoding="utf-8"))
        print(
            f"SQL validado: {len(migrations)} migraciones, {len(setup_files)} plantilla(s), "
            f"{len(test_files)} prueba(s), "
            "26 barrios y 104 servicios cerrados."
        )
        return 0
    except (OSError, SqlValidationError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

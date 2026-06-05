from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


DB_NAMES = ("opencode.db", "opencode-prod.db", "opencode-dev.db")


def q(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def parse_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    if not isinstance(value, str):
        return value

    s = value.strip()
    if not s or s[0] not in "[{":
        return value

    try:
        return json.loads(s)
    except Exception:
        return value


def clean_filename(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value).strip("._-")
    return (value or "session")[:100]


def fmt_time(value: Any) -> str:
    if value in (None, ""):
        return ""

    if isinstance(value, str):
        s = value.strip()
        if re.match(r"^\d{4}-\d{2}-\d{2}", s):
            return s
        try:
            value = int(float(s))
        except Exception:
            return s

    try:
        n = int(value)
    except Exception:
        return str(value)

    abs_n = abs(n)

    if abs_n > 10**17:
        sec = n / 1_000_000_000
    elif abs_n > 10**14:
        sec = n / 1_000_000
    elif abs_n > 10**11:
        sec = n / 1_000
    else:
        sec = n

    try:
        return datetime.fromtimestamp(sec).astimezone().strftime("%Y-%m-%d %H:%M:%S %z")
    except Exception:
        return str(value)


def first_key(row: dict[str, Any], names: list[str]) -> str | None:
    lower = {k.lower(): k for k in row.keys()}
    for name in names:
        if name.lower() in lower:
            return lower[name.lower()]
    return None


def get(row: dict[str, Any], names: list[str], default: Any = None) -> Any:
    key = first_key(row, names)
    return row.get(key, default) if key else default


def open_db(path: Path) -> sqlite3.Connection:
    uri = "file:" + path.resolve().as_posix() + "?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def find_dbs(path: str | None) -> list[Path]:
    base = Path(path).expanduser() if path else Path.home() / ".local" / "share" / "opencode"

    if base.is_file():
        return [base]

    found: list[Path] = []

    if base.exists():
        for name in DB_NAMES:
            p = base / name
            if p.exists():
                found.append(p)

        for p in base.glob("*.db"):
            if p not in found:
                found.append(p)

    found.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return found


def tables(conn: sqlite3.Connection) -> dict[str, list[str]]:
    rows = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()

    out: dict[str, list[str]] = {}

    for r in rows:
        name = r["name"]
        cols = conn.execute(f"PRAGMA table_info({q(name)})").fetchall()
        out[name] = [c["name"] for c in cols]

    return out


def has_any(cols: list[str], names: list[str]) -> bool:
    c = {x.lower() for x in cols}
    return any(x.lower() in c for x in names)


def score_table(name: str, cols: list[str], kind: str) -> int:
    n = name.lower()
    score = 0

    if kind == "session":
        if n == "session":
            score += 100
        if "session" in n:
            score += 20
        if has_any(cols, ["id", "session_id", "sessionID"]):
            score += 10
        if has_any(cols, ["title", "name"]):
            score += 10
        if has_any(cols, ["directory", "path", "cwd", "workspace"]):
            score += 10
        if has_any(cols, ["time_created", "created_at", "createdAt", "created"]):
            score += 10
        if has_any(cols, ["message_id", "messageID"]):
            score -= 50

    if kind == "message":
        if n == "message":
            score += 100
        if "message" in n:
            score += 25
        if has_any(cols, ["id", "message_id", "messageID"]):
            score += 10
        if has_any(cols, ["session_id", "sessionID", "session"]):
            score += 30
        if has_any(cols, ["role", "author"]):
            score += 10
        if has_any(cols, ["data", "content", "text", "body"]):
            score += 20

    if kind == "part":
        if n == "part":
            score += 100
        if "part" in n:
            score += 25
        if has_any(cols, ["message_id", "messageID", "message"]):
            score += 35
        if has_any(cols, ["data", "content", "text", "body", "type"]):
            score += 25

    return score


def detect(conn: sqlite3.Connection) -> tuple[dict[str, list[str]], dict[str, str | None]]:
    schema = tables(conn)
    result: dict[str, str | None] = {
        "session": None,
        "message": None,
        "part": None,
    }

    minimum = {
        "session": 35,
        "message": 45,
        "part": 55,
    }

    for kind in result:
        ranked = sorted(
            ((score_table(name, cols, kind), name) for name, cols in schema.items()),
            reverse=True,
        )

        if ranked and ranked[0][0] >= minimum[kind]:
            result[kind] = ranked[0][1]

    return schema, result


def order_by(cols: list[str]) -> str:
    candidates = [
        "time_created",
        "created_at",
        "createdAt",
        "created",
        "timestamp",
        "id",
    ]

    lower = {c.lower(): c for c in cols}

    for c in candidates:
        real = lower.get(c.lower())
        if real:
            return f" ORDER BY {q(real)}"

    return ""


def select_all(
    conn: sqlite3.Connection,
    table: str,
    cols: list[str],
    where: str = "",
    params: tuple[Any, ...] = (),
) -> list[dict[str, Any]]:
    sql = f"SELECT * FROM {q(table)}"

    if where:
        sql += " WHERE " + where

    sql += order_by(cols)

    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def id_col(cols: list[str]) -> str | None:
    return next((c for c in cols if c.lower() == "id"), None)


def session_col(cols: list[str]) -> str | None:
    names = {"session_id", "sessionid", "session"}
    return next((c for c in cols if c.lower() in names), None)


def message_col(cols: list[str]) -> str | None:
    names = {"message_id", "messageid", "message"}
    return next((c for c in cols if c.lower() in names), None)


def summarize_session(row: dict[str, Any]) -> dict[str, Any]:
    data = parse_json(get(row, ["data", "json", "metadata"]))

    if not isinstance(data, dict):
        data = {}

    return {
        "id": get(row, ["id", "session_id", "sessionID"], ""),
        "title": get(row, ["title", "name"], None) or get(data, ["title", "name"], ""),
        "directory": get(row, ["directory", "path", "cwd", "workspace"], None)
        or get(data, ["directory", "path", "cwd", "workspace"], ""),
        "created": fmt_time(get(row, ["time_created", "created_at", "createdAt", "created"])),
        "updated": fmt_time(get(row, ["time_updated", "updated_at", "updatedAt", "updated"])),
        "raw": row,
    }


def extract_text(value: Any, include_tools: bool) -> str:
    value = parse_json(value)

    if value is None:
        return ""

    if isinstance(value, str):
        return value

    if isinstance(value, list):
        return "\n\n".join(
            x for x in (extract_text(v, include_tools).strip() for v in value) if x
        )

    if not isinstance(value, dict):
        return str(value)

    typ = str(value.get("type", "")).lower()

    if typ in {"tool", "tool_call", "tool-call", "tool_result", "tool-result"} and not include_tools:
        return f"[tool omitted: {value.get('tool') or value.get('name') or 'tool'}]"

    for k in ["text", "content", "body", "message", "value"]:
        if isinstance(value.get(k), str):
            return value[k]

    for k in ["parts", "children", "items", "data", "part"]:
        if k in value:
            text = extract_text(value[k], include_tools).strip()
            if text:
                return text

    return json.dumps(value, ensure_ascii=False, indent=2) if include_tools else ""


def row_text(row: dict[str, Any], include_tools: bool) -> str:
    for k in ["text", "content", "body", "data", "json", "metadata"]:
        if k in row:
            text = extract_text(row[k], include_tools).strip()
            if text:
                return text

    return ""


def row_role(row: dict[str, Any]) -> str:
    role = get(row, ["role", "author", "speaker"])

    if role:
        return str(role)

    data = parse_json(get(row, ["data", "json", "metadata"]))

    if isinstance(data, dict):
        role = get(data, ["role", "author", "speaker", "type"])
        if role:
            return str(role)

    return "unknown"


def row_created(row: dict[str, Any]) -> str:
    return fmt_time(get(row, ["time_created", "created_at", "createdAt", "created", "timestamp"]))


def get_sessions(
    conn: sqlite3.Connection,
    schema: dict[str, list[str]],
    detected: dict[str, str | None],
    limit: int,
    search: str,
) -> list[dict[str, Any]]:
    st = detected["session"]

    if not st:
        return []

    rows = select_all(conn, st, schema[st])
    sessions = [summarize_session(r) for r in rows]
    sessions.reverse()

    if search:
        s = search.lower()
        sessions = [
            x
            for x in sessions
            if s in str(x["id"]).lower()
            or s in str(x["title"]).lower()
            or s in str(x["directory"]).lower()
        ]

    return sessions[:limit]


def export_session(
    conn: sqlite3.Connection,
    schema: dict[str, list[str]],
    detected: dict[str, str | None],
    sid: str,
    include_tools: bool,
) -> dict[str, Any]:
    mt = detected["message"]
    pt = detected["part"]

    if not mt:
        raise RuntimeError("No message-like table detected.")

    sessions = get_sessions(conn, schema, detected, 100000, "")
    session = next((s for s in sessions if str(s["id"]) == str(sid)), {"id": sid})

    mcols = schema[mt]
    scol = session_col(mcols)

    if scol:
        messages = select_all(conn, mt, mcols, f"{q(scol)} = ?", (sid,))
    else:
        messages = select_all(conn, mt, mcols)

    mid = id_col(mcols)
    mids = [str(m.get(mid, "")) for m in messages if mid and m.get(mid)]

    parts_by_mid: dict[str, list[dict[str, Any]]] = defaultdict(list)

    if pt:
        pcols = schema[pt]
        pmcol = message_col(pcols)
        pscol = session_col(pcols)

        if pmcol and mids:
            placeholders = ",".join("?" for _ in mids)
            parts = select_all(conn, pt, pcols, f"{q(pmcol)} IN ({placeholders})", tuple(mids))
        elif pscol:
            parts = select_all(conn, pt, pcols, f"{q(pscol)} = ?", (sid,))
        else:
            parts = []

        for p in parts:
            parts_by_mid[str(get(p, ["message_id", "messageID", "message"], ""))].append(p)

    out_messages = []

    for m in messages:
        message_id = str(m.get(mid, "")) if mid else ""
        parts = parts_by_mid.get(message_id, [])

        text = "\n\n".join(
            t for t in (row_text(p, include_tools).strip() for p in parts) if t
        )

        if not text:
            text = row_text(m, include_tools)

        out_messages.append(
            {
                "id": message_id,
                "role": row_role(m),
                "created": row_created(m),
                "text": text,
                "raw_message": m,
                "raw_parts": parts,
            }
        )

    return {
        "detected_tables": detected,
        "session": session,
        "messages": out_messages,
    }


def write_md(export: dict[str, Any], path: Path) -> None:
    s = export["session"]

    lines = [
        "# OpenCode Session Context",
        "",
        f"- Session ID: `{s.get('id', '')}`",
        f"- Title: {s.get('title', '')}",
        f"- Directory: `{s.get('directory', '')}`",
        f"- Created: {s.get('created', '')}",
        f"- Updated: {s.get('updated', '')}",
        "",
        "---",
        "",
    ]

    for m in export["messages"]:
        lines += [
            f"## {str(m.get('role', 'unknown')).upper()} — {m.get('created', '')}",
            "",
            (m.get("text") or "[empty]").strip(),
            "",
            "---",
            "",
        ]

    path.write_text("\n".join(lines), encoding="utf-8")


def write_json(obj: Any, path: Path) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


def cmd_inspect(args: argparse.Namespace) -> None:
    dbs = find_dbs(args.db)

    if not dbs:
        raise SystemExit(
            r"No .db file found. Use --db C:\Users\Dell\.local\share\opencode"
        )

    targets = dbs if args.all_dbs else dbs[:1]

    for db in targets:
        conn = open_db(db)
        schema, detected = detect(conn)

        print(f"\nDB: {db}")
        print("Detected:")
        print(f"  session: {detected['session']}")
        print(f"  message: {detected['message']}")
        print(f"  part   : {detected['part']}")
        print("\nTables:")

        for name, cols in schema.items():
            print(f"  - {name}: {', '.join(cols)}")


def cmd_list(args: argparse.Namespace) -> None:
    dbs = find_dbs(args.db)

    if not dbs:
        raise SystemExit("No DB found.")

    db = dbs[0]
    conn = open_db(db)
    schema, detected = detect(conn)

    sessions = get_sessions(conn, schema, detected, args.limit, args.search)

    print(f"DB: {db}")
    print(f"Detected session table: {detected['session']}\n")

    if not sessions:
        print("No sessions found.")
        return

    for s in sessions:
        print(f"{s['id']} | {s['created'] or s['updated']} | {s['title']}")

        if s["directory"]:
            print(f"  {s['directory']}")


def cmd_export(args: argparse.Namespace) -> None:
    dbs = find_dbs(args.db)

    if not dbs:
        raise SystemExit("No DB found.")

    db = dbs[0]
    conn = open_db(db)
    schema, detected = detect(conn)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    if args.all:
        sessions = get_sessions(conn, schema, detected, args.limit, args.search)
        ids = [str(s["id"]) for s in sessions if s["id"]]
    elif args.session:
        ids = [args.session]
    else:
        raise SystemExit("Use --session SESSION_ID or --all")

    for sid in ids:
        exported = export_session(conn, schema, detected, sid, args.include_tools)
        title = exported["session"].get("title") or ""
        name = clean_filename(f"{sid}_{title}")

        md = out / f"{name}.md"
        js = out / f"{name}.json"

        if args.format in ("md", "both"):
            write_md(exported, md)
            print(f"Wrote {md}")

        if args.format in ("json", "both"):
            write_json(exported, js)
            print(f"Wrote {js}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Identify and export OpenCode SQLite conversation context."
    )

    parser.add_argument(
        "--db",
        help="Path to DB file or OpenCode data directory.",
    )

    parser.add_argument(
        "--all-dbs",
        action="store_true",
        help="Inspect all discovered .db files.",
    )

    sub = parser.add_subparsers(dest="cmd")

    sub.add_parser("inspect")

    p_list = sub.add_parser("list")
    p_list.add_argument("--limit", type=int, default=50)
    p_list.add_argument("--search", default="")

    p_export = sub.add_parser("export")
    p_export.add_argument("--session")
    p_export.add_argument("--all", action="store_true")
    p_export.add_argument("--limit", type=int, default=1000)
    p_export.add_argument("--search", default="")
    p_export.add_argument("--out", default="opencode_exports")
    p_export.add_argument("--format", choices=["md", "json", "both"], default="both")
    p_export.add_argument("--include-tools", action="store_true")

    args = parser.parse_args()

    if not args.cmd:
        args.cmd = "inspect"

    if args.cmd == "inspect":
        cmd_inspect(args)
    elif args.cmd == "list":
        cmd_list(args)
    elif args.cmd == "export":
        cmd_export(args)


if __name__ == "__main__":
    main()
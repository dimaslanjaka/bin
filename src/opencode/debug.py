from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


def parse_json(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    try:
        return json.loads(value)
    except Exception:
        return {"raw": str(value)}


def ms_to_local(value: Any) -> str:
    try:
        return datetime.fromtimestamp(int(value) / 1000).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ""


def connect_readonly(db_path: Path) -> sqlite3.Connection:
    uri = "file:" + db_path.resolve().as_posix() + "?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (name,),
    ).fetchone()
    return row is not None


def list_sessions(conn: sqlite3.Connection, limit: int = 30) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT id, title, directory, path, time_created, time_updated
        FROM session
        ORDER BY COALESCE(time_updated, time_created) DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()


def part_to_text(part: dict[str, Any]) -> str:
    part_type = part.get("type")

    if part_type == "text":
        return part.get("text", "")

    if part_type == "file":
        filename = part.get("filename") or part.get("url") or "attached file"
        mime = part.get("mime", "")
        return f"[file: {filename} {mime}]"

    if part_type == "tool":
        tool = part.get("tool", "tool")
        state = part.get("state", {})
        status = state.get("status", "")
        input_data = state.get("input")
        output = state.get("output") or state.get("error") or ""

        text = f"[tool: {tool}"
        if status:
            text += f" | status: {status}"
        text += "]"

        if input_data not in (None, "", {}):
            text += "\ninput: " + json.dumps(input_data, ensure_ascii=False, indent=2)

        if output:
            output_text = output if isinstance(output, str) else json.dumps(output, ensure_ascii=False, indent=2)
            text += "\noutput: " + output_text

        return text

    if part_type == "reasoning":
        text = part.get("text", "")
        return f"[reasoning]\n{text}" if text else "[reasoning]"

    if part_type:
        return f"[{part_type}]\n" + json.dumps(part, ensure_ascii=False, indent=2)

    return json.dumps(part, ensure_ascii=False, indent=2)


def extract_session(conn: sqlite3.Connection, session_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    session = conn.execute(
        "SELECT * FROM session WHERE id=?",
        (session_id,),
    ).fetchone()

    if not session:
        raise SystemExit(f"Session not found: {session_id}")

    messages = conn.execute(
        """
        SELECT id, session_id, time_created, time_updated, data
        FROM message
        WHERE session_id=?
        ORDER BY time_created, id
        """,
        (session_id,),
    ).fetchall()

    parts = conn.execute(
        """
        SELECT id, message_id, session_id, time_created, time_updated, data
        FROM part
        WHERE session_id=?
        ORDER BY time_created, id
        """,
        (session_id,),
    ).fetchall()

    parts_by_message: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for part in parts:
        parts_by_message[part["message_id"]].append(part)

    result: list[dict[str, Any]] = []

    for msg in messages:
        info = parse_json(msg["data"])
        role = info.get("role", "unknown")

        parsed_parts = []
        text_chunks = []

        for p in parts_by_message[msg["id"]]:
            pdata = parse_json(p["data"])
            parsed_parts.append(
                {
                    "id": p["id"],
                    "created_at": ms_to_local(p["time_created"]),
                    "data": pdata,
                }
            )
            rendered = part_to_text(pdata).strip()
            if rendered:
                text_chunks.append(rendered)

        result.append(
            {
                "id": msg["id"],
                "role": role,
                "created_at": ms_to_local(msg["time_created"]),
                "info": info,
                "parts": parsed_parts,
                "text": "\n\n".join(text_chunks).strip(),
            }
        )

    return dict(session), result


def write_markdown(session: dict[str, Any], messages: list[dict[str, Any]], output: Path) -> None:
    lines = [
        f"# OpenCode Session Export",
        "",
        f"- Session ID: `{session.get('id')}`",
        f"- Title: {session.get('title', '')}",
        f"- Directory: `{session.get('directory', '')}`",
        f"- Created: {ms_to_local(session.get('time_created'))}",
        f"- Updated: {ms_to_local(session.get('time_updated'))}",
        "",
        "---",
        "",
    ]

    for msg in messages:
        role = msg["role"].upper()
        created = msg["created_at"]
        text = msg["text"] or json.dumps(msg["info"], ensure_ascii=False, indent=2)

        lines.append(f"## {role} — {created}")
        lines.append("")
        lines.append(text)
        lines.append("")
        lines.append("---")
        lines.append("")

    output.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    default_db = Path.home() / ".local" / "share" / "opencode" / "opencode.db"

    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=str(default_db), help="Path to opencode SQLite DB")
    parser.add_argument("--session", help="Session id, for example ses_xxx")
    parser.add_argument("--list", action="store_true", help="List recent sessions")
    parser.add_argument("--out", default="opencode-session.md", help="Markdown output path")
    parser.add_argument("--json", default="opencode-session.json", help="JSON output path")
    args = parser.parse_args()

    db_path = Path(args.db)

    if not db_path.exists():
        alt = db_path.with_name("opencode-prod.db")
        if alt.exists():
            db_path = alt
        else:
            raise SystemExit(f"DB not found: {db_path}")

    conn = connect_readonly(db_path)

    for required in ["session", "message", "part"]:
        if not table_exists(conn, required):
            raise SystemExit(f"Table not found: {required}. Check your OpenCode version/schema.")

    if args.list or not args.session:
        print(f"DB: {db_path}")
        print("Recent sessions:\n")
        for row in list_sessions(conn):
            print(
                f"{row['id']} | {ms_to_local(row['time_created'])} | "
                f"{row['title']} | {row['directory']}"
            )

        if not args.session:
            return

    session, messages = extract_session(conn, args.session)

    Path(args.json).write_text(
        json.dumps({"session": session, "messages": messages}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    write_markdown(session, messages, Path(args.out))

    print(f"Exported markdown: {args.out}")
    print(f"Exported JSON: {args.json}")


if __name__ == "__main__":
    main()
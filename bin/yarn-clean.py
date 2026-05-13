from __future__ import annotations

import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import glob
from typing import Union


def delete_dir(path: Path) -> tuple[str, Path]:
    shutil.rmtree(path, ignore_errors=True)
    return ("dir", path)


def delete_file(path: Path) -> tuple[str, Path]:
    path.unlink(missing_ok=True)
    return ("file", path)


def clean(base_dir: Union[str, Path]) -> None:
    root = Path(base_dir).resolve()

    node_modules_dirs: list[Path] = []
    yarn_lock_files: list[Path] = []

    print(f"Scanning: {root}")

    # Collect targets
    for current_root, dirs, files in os.walk(root, topdown=True):
        current = Path(current_root)

        if "node_modules" in dirs:
            node_modules_dirs.append(current / "node_modules")

            # Prevent recursive scan into node_modules
            dirs.remove("node_modules")

        if "yarn.lock" in files:
            yarn_lock_files.append(current / "yarn.lock")

    print(f"Found node_modules: {len(node_modules_dirs)}")
    print(f"Found yarn.lock:   {len(yarn_lock_files)}")
    print()

    deleted_dirs = 0
    deleted_files = 0

    max_workers = min(32, (os.cpu_count() or 1) * 4)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [
            *(executor.submit(delete_dir, path) for path in node_modules_dirs),
            *(executor.submit(delete_file, path) for path in yarn_lock_files),
        ]

        for future in as_completed(futures):
            kind, path = future.result()

            if kind == "dir":
                deleted_dirs += 1
                print(f"[DIR ] Deleted: {path}")
            else:
                deleted_files += 1
                print(f"[FILE] Deleted: {path}")

    print()
    print("Done.")
    print(f"Deleted node_modules: {deleted_dirs}")
    print(f"Deleted yarn.lock:   {deleted_files}")


def collect_workspace_dirs(
    start_root: Union[str, Path],
    include_start_root: bool = False,
) -> list[Path]:
    """Return workspace package directories sorted by longest path first.

    This walks workspace globs declared in each package.json it finds,
    recursively, stopping at directories already visited to avoid cycles.
    """
    visited = set()
    results = set()

    start_root = Path(start_root).resolve()
    stack = [start_root]

    while stack:
        pkg_dir = stack.pop()

        if pkg_dir in visited:
            continue

        visited.add(pkg_dir)

        pkg_file = pkg_dir / "package.json"
        if not pkg_file.is_file():
            continue

        if include_start_root or pkg_dir != start_root:
            results.add(pkg_dir)

        try:
            data = json.loads(pkg_file.read_text(encoding="utf-8"))
        except Exception:
            continue

        ws_field = data.get("workspaces")
        patterns = []

        if isinstance(ws_field, dict):
            patterns = ws_field.get("packages", [])
        elif isinstance(ws_field, list):
            patterns = ws_field

        for pattern in patterns:
            matches = glob.glob(str(pkg_dir / pattern), recursive=True)

            for m in matches:
                p = Path(m)

                # Skip symlinked package directories; do not follow them
                if p.is_symlink():
                    continue

                p_res = p.resolve()

                if p_res.is_dir() and p_res not in visited:
                    stack.append(p_res)

    return sorted(
        results,
        key=lambda p: (len(p.parts), str(p)),
        reverse=True,
    )


if __name__ == "__main__":
    workspace_dirs = collect_workspace_dirs(Path("."))
    for d in workspace_dirs:
        if Path(d / "node_modules").is_dir() or (d / "yarn.lock").is_file():
            print(f"Cleaning workspace package: {d}")
            clean(d)
        else:
            print(f"Skipping workspace package (no node_modules or yarn.lock): {d}")
    shutil.rmtree(Path(".") / "node_modules", ignore_errors=True)
    (Path(".") / "yarn.lock").unlink(missing_ok=True)

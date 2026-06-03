"""MkDocs pre-build hook: copy docs-src/ and rewrite relative links to GitHub URLs.

- Copies docs-src/ -> docs/docs-src/ so README.md links like ./docs-src/foo.md resolve
- Rewrites ../src/, ../bin/, ../scripts/, ../backend/ links to absolute GitHub URLs
- Pre-expands docs/index.md from README.md with rewritten ./build.mjs and ./LICENSE links
"""

import re
import shutil
from pathlib import Path

# Base URL for rewriting relative links that can't resolve inside the docs/ tree
BASE_URL = "https://github.com/dimaslanjaka/bin/blob/master"

# Regex for markdown inline link and reference-style link URLs
# Matches: [text](../src/path)  and  [text]: ../src/path
LINK_RE = re.compile(
    r"""(
        \[[^\]]*\]\s*\(      # [text](  (inline link)
        |
        ^\[[^\]]+\]\s*:\s*   # [text]:  (reference definition, line-start)
        |
        <                     # <autolink>
    )
    \.\./(src|bin|scripts|backend)/""",
    re.MULTILINE | re.VERBOSE,
)


def _rewrite_relative_links(content: str) -> str:
    """Replace ../src/, ../bin/, ../scripts/, ../backend/ with absolute GitHub URLs."""
    return LINK_RE.sub(lambda m: m.group(1) + f"{BASE_URL}/{m.group(2)}/", content)


def _expand_readme_to_index() -> None:
    """Expand README.md into docs/index.md with rewritten unresolvable links.

    Idempotent: skips writing when docs/index.md is already up-to-date,
    avoiding infinite rebuild loops in ``mkdocs serve``.
    """
    # Try uppercase first (Linux convention), fallback to lowercase (git-tracked name)
    readme = Path("README.md")
    if not readme.exists():
        readme = Path("readme.md")
    index_md = Path("docs") / "index.md"

    if not readme.exists():
        return

    content_bytes = readme.read_bytes()
    content = content_bytes.decode("utf-8")

    # Rewrite links that can't resolve inside docs/ tree
    content = _rewrite_relative_links(content)

    # Rewrite specific ./ links in README that point outside docs/
    content = content.replace("](./build.mjs)", f"]({BASE_URL}/build.mjs)")
    content = content.replace("](./LICENSE)", f"]({BASE_URL}/LICENSE)")

    content_bytes_rewritten = content.encode("utf-8")

    # Idempotency: binary comparison (avoids CRLF/LF mismatch from text mode)
    if index_md.exists() and index_md.read_bytes() == content_bytes_rewritten:
        print(f"  -> Skipped README.md expansion (up-to-date)")
        return

    index_md.write_bytes(content_bytes_rewritten)
    print(f"  -> Expanded README.md -> docs/index.md with rewritten links")


def _copy_and_rewrite_docs_src() -> int:
    """Copy docs-src/ -> docs/docs-src/ and rewrite relative links in copied files.

    Idempotent: skips writing when destination is already up-to-date,
    avoiding infinite rebuild loops in ``mkdocs serve``.

    Returns the number of .md files copied (or 0 if skipped as up-to-date).
    """
    src = Path("docs-src")
    dst = Path("docs") / "docs-src"
    count = 0

    if not src.exists() or not src.is_dir():
        return 0

    # Idempotency: if destination exists and all files are identical, skip
    if dst.exists():
        src_file_names = {f.name for f in src.glob("*.md")}
        dst_file_names = {f.name for f in dst.glob("*.md")}
        if src_file_names == dst_file_names:
            # Binary content comparison (avoids CRLF/LF mismatch from text mode)
            all_same = True
            for name in src_file_names:
                source_bytes = (src / name).read_bytes()
                # Apply the same rewriting that would happen after copy
                if name.endswith(".md"):
                    rewritten = _rewrite_relative_links(source_bytes.decode("utf-8"))
                    expected_bytes = rewritten.encode("utf-8")
                else:
                    expected_bytes = source_bytes
                if (dst / name).read_bytes() != expected_bytes:
                    all_same = False
                    break
            if all_same:
                print(f"  -> Skipped docs-src/ copy (up-to-date)")
                return 0
        shutil.rmtree(dst)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)

    shutil.copytree(src, dst)
    for md_file in dst.glob("*.md"):
        original_bytes = md_file.read_bytes()
        original = original_bytes.decode("utf-8")
        rewritten = _rewrite_relative_links(original)
        if rewritten != original:
            md_file.write_bytes(rewritten.encode("utf-8"))
        count += 1

    print(f"  -> Copied docs-src/ -> docs/docs-src/ ({count} files, links rewritten)")
    return count


def on_pre_build(config):
    _copy_and_rewrite_docs_src()
    _expand_readme_to_index()
    return config

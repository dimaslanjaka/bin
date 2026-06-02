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
    """Expand README.md into docs/index.md with rewritten unresolvable links."""
    readme = Path("README.md")
    index_md = Path("docs") / "index.md"

    if not readme.exists():
        return

    content = readme.read_text(encoding="utf-8")

    # Rewrite links that can't resolve inside docs/ tree
    content = _rewrite_relative_links(content)

    # Rewrite specific ./ links in README that point outside docs/
    content = content.replace("](./build.mjs)", f"]({BASE_URL}/build.mjs)")
    content = content.replace("](./LICENSE)", f"]({BASE_URL}/LICENSE)")

    index_md.write_text(content, encoding="utf-8")
    print(f"  -> Expanded README.md -> docs/index.md with rewritten links")


def _copy_and_rewrite_docs_src() -> int:
    """Copy docs-src/ -> docs/docs-src/ and rewrite relative links in copied files.

    Returns the number of .md files copied.
    """
    src = Path("docs-src")
    dst = Path("docs") / "docs-src"

    if dst.exists():
        shutil.rmtree(dst)

    if not src.exists() or not src.is_dir():
        return 0

    shutil.copytree(src, dst)
    count = 0
    for md_file in dst.glob("*.md"):
        original = md_file.read_text(encoding="utf-8")
        rewritten = _rewrite_relative_links(original)
        if rewritten != original:
            md_file.write_text(rewritten, encoding="utf-8")
        count += 1

    print(f"  -> Copied docs-src/ -> docs/docs-src/ ({count} files, links rewritten)")
    return count


def on_pre_build(config):
    _copy_and_rewrite_docs_src()
    _expand_readme_to_index()
    return config

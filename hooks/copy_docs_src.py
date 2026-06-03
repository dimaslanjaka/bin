import re
import shutil
from pathlib import Path

BASE_URL = "https://github.com/dimaslanjaka/bin/blob/master"

# Regex for relative links (already in your script)
LINK_RE = re.compile(
    r"""(
        \[[^\]]*\]\s*\(
        |
        ^\[[^\]]+\]\s*:\s*
        |
        <
    )
    \.\./(src|bin|scripts|backend)/""",
    re.MULTILINE | re.VERBOSE,
)

DETAILS_RE = re.compile(
    r'<details>\s*<summary>(.+?)</summary>\s*(.*?)\s*</details>',
    re.DOTALL,
)

def _rewrite_relative_links(content: str) -> str:
    return LINK_RE.sub(lambda m: m.group(1) + f"{BASE_URL}/{m.group(2)}/", content)

def _convert_details_to_mkdocs(content: str) -> str:
    """Convert <details> HTML blocks to MkDocs Material collapsible syntax"""
    def _replacer(m: re.Match) -> str:
        title = m.group(1).strip()
        inner = m.group(2).strip()
        indented = '\n'.join(
            '    ' + line if line.strip() else ''
            for line in inner.split('\n')
        )
        return f'??? "{title}"\n{indented}\n'

    return DETAILS_RE.sub(_replacer, content)

def _process_markdown_file(md_path: Path) -> None:
    """Rewrite links and convert <details> in a Markdown file"""
    if not md_path.exists():
        return
    content = md_path.read_text(encoding="utf-8")
    content = _rewrite_relative_links(content)
    content = _convert_details_to_mkdocs(content)
    md_path.write_text(content, encoding="utf-8")
    print(f"  -> Processed {md_path}")

def _copy_and_process_docs_src() -> int:
    """Copy docs-src/ -> docs/docs-src/ and process Markdown files"""
    src = Path("docs-src")
    dst = Path("docs") / "docs-src"
    count = 0

    if not src.exists() or not src.is_dir():
        return 0

    if dst.exists():
        shutil.rmtree(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst)

    for md_file in dst.glob("*.md"):
        _process_markdown_file(md_file)
        count += 1

    print(f"  -> Copied and processed docs-src/ ({count} files)")
    return count

def _expand_readme_to_index() -> None:
    """Expand README.md into docs/index.md with collapsible sections fixed"""
    readme = Path("README.md")
    if not readme.exists():
        readme = Path("readme.md")
    index_md = Path("docs") / "index.md"
    if not readme.exists():
        return

    content = readme.read_text(encoding="utf-8")
    content = _rewrite_relative_links(content)
    content = content.replace("](./build.mjs)", f"]({BASE_URL}/build.mjs)")
    content = content.replace("](./LICENSE)", f"]({BASE_URL}/LICENSE)")
    content = _convert_details_to_mkdocs(content)

    if index_md.exists() and index_md.read_text(encoding="utf-8") == content:
        print(f"  -> Skipped README.md expansion (up-to-date)")
        return

    index_md.write_text(content, encoding="utf-8")
    print(f"  -> Expanded README.md -> docs/index.md with collapsible sections fixed")

def on_pre_build(config):
    _copy_and_process_docs_src()
    _expand_readme_to_index()
    return config
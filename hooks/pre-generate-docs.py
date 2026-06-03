#!/usr/bin/env python3
"""Standalone script to pre-generate docs before mkdocs validation.

This runs the copy-docs-src hook functions directly so that docs/index.md
and docs/docs-src/ exist before mkdocs validates the nav configuration.
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import the hook module
sys.path.insert(0, str(Path(__file__).parent))

from copy_docs_src import _copy_and_process_docs_src, _expand_readme_to_index

if __name__ == "__main__":
    print("Pre-generating docs...")
    _copy_and_process_docs_src()
    _expand_readme_to_index()
    print("Docs pre-generation complete!")

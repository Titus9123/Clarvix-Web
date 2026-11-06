#!/usr/bin/env python3
"""Build the public GitHub Pages artifact into ./_site from an explicit allowlist.

Only files that the public website needs are copied. Everything else in the repository
(operations/, _review/, tests/, scripts/, server/, docs, CI files, ...) never enters the artifact.
Usage: python3 scripts/build_site.py [output_dir]
"""
import fnmatch
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Root-level files (glob patterns) and directories that make up the public site.
ALLOW_ROOT_FILES = ["*.html", "*.css", "*.js", "robots.txt", "sitemap.xml", "llms.txt", "CNAME", ".nojekyll", "ads.txt"]
ALLOW_DIRS = {"fonts": {".woff2", ".woff"}, "images": {".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".gif"}}

# Defence in depth: these can never be published, even if added to the allowlists by mistake.
FORBIDDEN_DIRS = {"operations", "_review", "tests", "scripts", "server", ".github", ".git", "node_modules", "docs", "__pycache__"}
FORBIDDEN_SUFFIXES = {".md", ".csv", ".py", ".mjs", ".ts", ".yml", ".yaml", ".env", ".pem", ".key", ".log", ".patch", ".sh", ".service", ".conf", ".bak", ".tmp", ".json", ".map"}
FORBIDDEN_NAMES = {"package.json", "package-lock.json", "readme.md", ".gitignore", ".env", "dockerfile"}


def is_forbidden(rel: Path) -> bool:
    parts = rel.parts
    if any(p in FORBIDDEN_DIRS for p in parts[:-1]):
        return True
    name = parts[-1].lower()
    if name in FORBIDDEN_NAMES or name.startswith(".env"):
        return True
    return rel.suffix.lower() in FORBIDDEN_SUFFIXES


def collect(root: Path = ROOT):
    files = []
    for pattern in ALLOW_ROOT_FILES:
        files += [p.relative_to(root) for p in root.glob(pattern) if p.is_file()]
    for directory, suffixes in ALLOW_DIRS.items():
        base = root / directory
        if base.is_dir():
            files += [p.relative_to(root) for p in base.rglob("*") if p.is_file() and p.suffix.lower() in suffixes]
    unique = sorted(set(files))
    blocked = [str(p) for p in unique if is_forbidden(p)]
    if blocked:
        raise SystemExit(f"Refusing to publish forbidden files: {blocked}")
    return unique


def build(out: Path, root: Path = ROOT):
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    files = collect(root)
    for rel in files:
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / rel, dest)
    return files


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "_site"
    built = build(target)
    print(f"Built {len(built)} files into {target}")

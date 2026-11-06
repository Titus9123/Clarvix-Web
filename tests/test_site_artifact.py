"""The GitHub Pages artifact must contain the public site and nothing internal."""
import re
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True  # never leave __pycache__ behind
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_site  # noqa: E402

INTERNAL_PARTS = {"operations", "_review", "tests", "scripts", "server", ".github", ".git", "docs", "node_modules"}
BASE = "https://web.clarvix.net/"


class ArtifactTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name) / "_site"
        cls.files = build_site.build(cls.out)
        cls.published = {p.relative_to(cls.out).as_posix() for p in cls.out.rglob("*") if p.is_file()}

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_no_internal_file_is_published(self):
        for path in self.published:
            parts = path.split("/")
            self.assertFalse(INTERNAL_PARTS & set(parts[:-1]), path)
            self.assertFalse(build_site.is_forbidden(Path(path)), path)
        for leaked in ("operations/crm-template.csv", "operations/consent-log.csv", "operations/contract-core-b2b-he.md",
                       "_review/QA-REPORT-2026-11.md", "README.md", "tests/validate-seo.py", "scripts/build_site.py"):
            self.assertNotIn(leaked, self.published)

    def test_every_published_file_is_on_the_allowlist(self):
        import fnmatch
        for path in self.published:
            top = path.split("/")[0]
            ok = (top in build_site.ALLOW_DIRS and Path(path).suffix.lower() in build_site.ALLOW_DIRS[top]) or (
                "/" not in path and any(fnmatch.fnmatch(path, p) for p in build_site.ALLOW_ROOT_FILES))
            self.assertTrue(ok, path)

    def test_forbidden_files_are_refused_even_inside_allowed_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "images").mkdir()
            (root / "index.html").write_text("<!doctype html>")
            for leak in ("images/export.csv", "images/notes.md", "images/.env", "images/key.pem", "images/data.json"):
                (root / leak).write_text("secret")
            (root / "operations").mkdir()
            (root / "operations" / "crm.csv").write_text("secret")
            (root / ".env").write_text("SMTP_PASSWORD=secret")
            (root / "secret.pem").write_text("secret")
            (root / "images" / "ok.png").write_bytes(b"\x89PNG")
            got = {p.as_posix() for p in build_site.collect(root)}
            self.assertEqual(got, {"index.html", "images/ok.png"})
        self.assertTrue(build_site.is_forbidden(Path("operations/x.html")))
        self.assertTrue(build_site.is_forbidden(Path("fonts/extra/readme.md")))
        self.assertTrue(build_site.is_forbidden(Path(".env.production")))

    def test_site_essentials_are_present(self):
        for must in ("index.html", "contact.html", "privacy.html", "terms.html", "cancellation.html", "accessibility.html",
                     "404.html", "robots.txt", "sitemap.xml", "llms.txt", "script.js", "style.css", "offer.css", "fonts.css",
                     "images/clarvix-web-logo.webp", "fonts/heebo-hebrew.woff2", "google-business-profile.html",
                     "business-websites.html", "inquiries-and-bookings.html"):
            self.assertIn(must, self.published)
        self.assertEqual((self.out / "CNAME").read_text().strip(), "web.clarvix.net")

    def test_every_local_reference_resolves_inside_the_artifact(self):
        missing = []
        for page in [p for p in self.published if p.endswith((".html", ".css", ".js"))]:
            text = (self.out / page).read_text(encoding="utf-8", errors="ignore")
            refs = re.findall(r'(?:href|src)="([^"#?]+)', text) if page.endswith(".html") else []
            refs += re.findall(r"url\(['\"]?([^)'\"#?]+)", text) if page.endswith((".css", ".html")) else []
            refs += re.findall(r"""['"]((?:images|fonts)/[\w./-]+)['"]""", text) if page.endswith(".js") else []
            for ref in refs:
                u = urlsplit(ref)
                if u.scheme or ref.startswith(("data:", "mailto:", "tel:", "//", "javascript:")):
                    if u.netloc == "web.clarvix.net":
                        ref = u.path
                    else:
                        continue
                target = unquote(urlsplit(ref).path)
                base = Path(page).parent if not target.startswith("/") else Path("")
                resolved = (base / target.lstrip("/")).as_posix()
                resolved = str(Path(resolved)) if resolved else "index.html"
                if resolved in ("", "."):
                    resolved = "index.html"
                if resolved not in self.published:
                    missing.append((page, ref))
        self.assertEqual(missing, [])

    def test_sitemap_urls_are_published_pages(self):
        urls = [e.text for e in ET.parse(self.out / "sitemap.xml").iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
        self.assertGreater(len(urls), 5)
        for url in urls:
            self.assertTrue(url.startswith(BASE), url)
            self.assertIn(url[len(BASE):] or "index.html", self.published, url)

    def test_no_generated_files_are_tracked_and_ignore_rules_exist(self):
        import subprocess
        tracked = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True).stdout.split("\n")
        self.assertEqual([f for f in tracked if "__pycache__" in f or f.endswith((".pyc", ".pyo"))], [])
        ignore = (ROOT / ".gitignore").read_text()
        for rule in ("__pycache__/", "*.py[cod]", ".env", "*.pem", "_site/"):
            self.assertIn(rule, ignore)

    def test_workflow_has_least_privilege_permissions(self):
        import re as _re
        wf = (ROOT / ".github/workflows/pages.yml").read_text()
        top = wf.split("jobs:")[0]
        self.assertRegex(top, r"permissions:\s*\n\s+contents: read")
        self.assertNotIn("pages: write", top)       # only the deploy job may write Pages
        self.assertNotIn("id-token", top)
        deploy = wf.split("  deploy:")[1]
        self.assertIn("pages: write", deploy)
        self.assertIn("id-token: write", deploy)
        build = wf.split("  deploy:")[0]
        self.assertNotIn("pages: write", build)
        self.assertNotIn("configure-pages", wf)     # not needed for a plain static artifact
        self.assertEqual(len(_re.findall(r"uses: [^@\s]+@v\d+", wf)), 3)  # checkout, upload-pages-artifact, deploy-pages (all pinned to a major version)

    def test_workflow_publishes_only_the_built_artifact(self):
        wf = (ROOT / ".github/workflows/pages.yml").read_text()
        self.assertIn("python3 scripts/build_site.py _site", wf)
        self.assertRegex(wf, r"upload-pages-artifact@\w+")
        self.assertRegex(wf, r"path:\s*_site")
        self.assertRegex(wf, r"deploy-pages@\w+")
        self.assertNotRegex(wf, r"path:\s*\.\s*$")
        self.assertIn("github.ref == 'refs/heads/main'", wf)


if __name__ == "__main__":
    unittest.main()

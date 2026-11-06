import email
import json
import socketserver
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

import receiver

ORIGIN = "https://web.clarvix.net"


class FakeSMTP(socketserver.StreamRequestHandler):
    """Tiny SMTP server: records messages, requires AUTH PLAIN, can be told to reject."""

    def handle(self):
        store = self.server.store
        w = lambda s: (self.wfile.write((s + "\r\n").encode()), self.wfile.flush())
        w("220 fake ESMTP")
        data_mode, buf, authed = False, [], False
        while True:
            raw = self.rfile.readline()
            if not raw:
                return
            line = raw.decode("utf-8", "replace").rstrip("\r\n")
            if data_mode:
                if line == ".":
                    data_mode = False
                    store["messages"].append("\r\n".join(buf))
                    w("554 rejected" if store["reject"] else ("451 try again later" if store.get("tempfail") else "250 queued"))
                    buf = []
                else:
                    buf.append(line[1:] if line.startswith("..") else line)
                continue
            cmd = line.upper()
            if cmd.startswith("EHLO"):
                self.wfile.write(b"250-fake\r\n250 AUTH PLAIN\r\n"); self.wfile.flush()
            elif cmd.startswith("AUTH PLAIN"):
                authed = store["credentials"] in line
                store["auth_attempts"] += 1
                w("235 ok" if authed else "535 bad credentials")
            elif cmd.startswith("MAIL FROM"):
                w("250 ok" if authed else "530 auth required")
            elif cmd.startswith("RCPT TO"):
                store["rcpt"].append(line)
                w("250 ok")
            elif cmd == "DATA":
                data_mode = True
                w("354 go")
            elif cmd == "QUIT":
                w("221 bye")
                return
            else:
                w("250 ok")


class Base(unittest.TestCase):
    counter = 0

    @classmethod
    def setUpClass(cls):
        import base64
        cls.store = {"messages": [], "rcpt": [], "reject": False, "auth_attempts": 0,
                     "credentials": base64.b64encode(b"\0relay\0s3cret").decode()}
        cls.smtp = socketserver.ThreadingTCPServer(("127.0.0.1", 0), FakeSMTP)
        cls.smtp.store = cls.store
        threading.Thread(target=cls.smtp.serve_forever, daemon=True).start()
        env = {"SMTP_HOST": "127.0.0.1", "SMTP_PORT": str(cls.smtp.server_address[1]), "SMTP_SECURITY": "none",
               "SMTP_USER": "relay", "SMTP_PASSWORD": "s3cret", "MAIL_FROM": "forms@clarvix.net",
               "RATE_PER_IP": "3", "RATE_GLOBAL": "50"}
        cls.config = receiver.load_config(env)
        cls.http = ThreadingHTTPServer(("127.0.0.1", 0), receiver.make_handler(cls.config))
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.http.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown(); cls.smtp.shutdown()

    def setUp(self):
        self.store["messages"].clear(); self.store["rcpt"].clear(); self.store["reject"] = False; self.store["tempfail"] = False

    def post(self, body, headers=None, raw=None, ip=None, path="/v1/contact"):
        data = raw if raw is not None else json.dumps(body).encode()
        Base.counter += 1
        h = {"Content-Type": "application/json", "Origin": ORIGIN, "X-Real-IP": ip or f"203.0.{Base.counter // 250}.{Base.counter % 250 + 1}"}
        h.update(headers or {})
        req = urllib.request.Request(self.url + path, data=data, headers=h, method="POST")
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read()), r.headers
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b"{}"), e.headers


GOOD = {"name": "בדיקה TEST", "phone": "050-000-0000", "email": "test@example.com", "business_type": "other",
        "responder_count": "1", "has_existing_site": "no", "plan": "not_sure", "message": "TEST — ignorar", "company": "",
        "utm_source": "qa", "landing_page": "https://web.clarvix.net/", "source_language": "he"}


class ReceiverTests(Base):
    def test_valid_lead_is_emailed_and_confirmed_only_after_smtp_accepts(self):
        status, body, _ = self.post(GOOD)
        self.assertEqual((status, body["ok"]), (200, True))
        self.assertEqual(len(self.store["messages"]), 1)
        msg = email.message_from_string(self.store["messages"][0])
        self.assertIn("contact@clarvix.net", msg["To"])
        self.assertEqual(msg["Reply-To"], "test@example.com")
        self.assertEqual(msg["From"], "forms@clarvix.net")
        text = msg.get_payload(decode=True).decode("utf-8")
        self.assertIn("TEST — ignorar", text); self.assertIn("utm_source: qa", text)

    def test_smtp_failure_is_reported_not_simulated(self):
        self.store["reject"] = True
        status, body, _ = self.post(GOOD)
        self.assertEqual((status, body["ok"]), (502, False))

    def test_wrong_smtp_credentials_fail_closed(self):
        cfg = dict(self.config, smtp_password="wrong")
        with self.assertRaises(Exception):
            receiver.send_mail(receiver.build_message(receiver.validate(GOOD)[0], cfg), cfg)

    def test_validation_names_fields_without_echoing_values(self):
        status, body, _ = self.post({**GOOD, "email": "not-an-email", "phone": "12", "name": "x"})
        self.assertEqual(status, 422)
        self.assertEqual(set(body["fields"]), {"email", "phone", "name"})
        self.assertNotIn("not-an-email", json.dumps(body))
        self.assertEqual(self.store["messages"], [])

    def test_enums_are_enforced(self):
        for field, value in (("business_type", "x"), ("responder_count", "99"), ("plan", "free"), ("has_existing_site", "maybe")):
            self.assertEqual(self.post({**GOOD, field: value})[0], 422, field)

    def test_honeypot_is_rejected_and_nothing_is_sent(self):
        status, body, _ = self.post({**GOOD, "company": "ACME"})
        self.assertEqual((status, body["ok"]), (400, False)); self.assertEqual(self.store["messages"], [])

    def test_link_spam_is_rejected(self):
        self.assertEqual(self.post({**GOOD, "message": "http://a.com http://b.com http://c.com"})[0], 422)

    def test_header_injection_is_neutralised(self):
        evil = {**GOOD, "name": "Eve\r\nBcc: victim@example.com", "email": "a@b.co\r\nBcc: v@example.com"}
        status, _, _ = self.post(evil)
        self.assertEqual(status, 422)  # CR/LF stripped from email makes it invalid
        status, _, _ = self.post({**GOOD, "name": "Eve\r\nBcc: victim@example.com"})
        self.assertEqual(status, 200)
        raw = self.store["messages"][-1]
        headers = raw.split("\r\n\r\n")[0]
        self.assertNotIn("\nBcc:", headers.replace("\r\n", "\n"))
        self.assertTrue(all("victim@example.com" not in r for r in self.store["rcpt"]))

    def test_origin_and_content_type_and_size_checks(self):
        self.assertEqual(self.post(GOOD, headers={"Origin": "https://evil.example"})[0], 403)
        self.assertEqual(self.post(GOOD, headers={"Content-Type": "text/plain"})[0], 415)
        self.assertEqual(self.post(None, raw=b"x" * 20000)[0], 413)
        self.assertEqual(self.post(None, raw=b"{not json")[0], 400)
        self.assertEqual(self.post(GOOD, path="/other")[0], 404)

    def test_cors_preflight_only_for_allowed_origin(self):
        for origin, allowed in ((ORIGIN, True), ("https://evil.example", False)):
            req = urllib.request.Request(self.url + "/v1/contact", method="OPTIONS", headers={"Origin": origin})
            with urllib.request.urlopen(req) as r:
                self.assertEqual(r.headers.get("Access-Control-Allow-Origin") == origin, allowed)

    def test_rate_limit_per_client(self):
        ip = "198.51.100.77"
        codes = [self.post(GOOD, ip=ip)[0] for _ in range(5)]
        self.assertEqual(codes, [200, 200, 200, 429, 429])
        self.assertEqual(self.post(GOOD, ip="198.51.100.78")[0], 200)

    def test_health(self):
        with urllib.request.urlopen(self.url + "/healthz") as r:
            self.assertEqual(json.loads(r.read()), {"ok": True})

    def test_config_refuses_insecure_remote_smtp(self):
        with self.assertRaises(SystemExit):
            receiver.load_config({"SMTP_HOST": "mail.example.com", "SMTP_SECURITY": "none", "MAIL_FROM": "a@b.co"})
        with self.assertRaises(SystemExit):
            receiver.load_config({"MAIL_FROM": "a@b.co"})


class ResilienceTests(Base):
    def _server(self, config, send=None):
        h = ThreadingHTTPServer(("127.0.0.1", 0), receiver.make_handler(config, send=send or (lambda m, c: receiver.send_mail(m, c, sleep=lambda s: None))))
        threading.Thread(target=h.serve_forever, daemon=True).start()
        self.addCleanup(h.shutdown)
        return f"http://127.0.0.1:{h.server_address[1]}"

    def _post(self, base, body):
        Base.counter += 1
        req = urllib.request.Request(base + "/v1/contact", data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Origin": ORIGIN, "X-Real-IP": f"198.18.0.{Base.counter % 250 + 1}"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read()), r.headers
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read()), e.headers

    def test_smtp_unreachable_returns_503_after_one_retry_and_keeps_serving(self):
        sleeps = []
        dead = dict(self.config, smtp_port=1)  # nothing listens here
        base = self._server(dead, send=lambda m, c: receiver.send_mail(m, c, sleep=sleeps.append))
        status, body, headers = self._post(base, GOOD)
        self.assertEqual((status, body["error"]), (503, "unavailable")); self.assertEqual(sleeps, [1.5]); self.assertTrue(headers["Retry-After"])
        with urllib.request.urlopen(base + "/healthz") as r:
            self.assertEqual(r.status, 200)  # the receiver itself stays healthy

    def test_smtp_4xx_is_transient_and_reported_as_unavailable(self):
        self.store["tempfail"] = True
        status, body, _ = self._post(self._server(self.config), GOOD)
        self.assertEqual((status, body["error"]), (503, "unavailable"))

    def test_permanent_smtp_errors_are_not_retried(self):
        sleeps = []
        calls = {"n": 0}
        orig = receiver._deliver_once
        def counting(msg, cfg):
            calls["n"] += 1
            return orig(msg, cfg)
        receiver._deliver_once = counting
        try:
            self.store["reject"] = True
            status, body, _ = self._post(self._server(self.config, send=lambda m, c: receiver.send_mail(m, c, sleep=sleeps.append)), GOOD)
        finally:
            receiver._deliver_once = orig
        self.assertEqual((status, body["error"]), (502, "delivery")); self.assertEqual(calls["n"], 1); self.assertEqual(sleeps, [])

    def test_failed_delivery_never_reports_success(self):
        self.store["reject"] = True
        self.assertNotEqual(self._post(self._server(self.config), GOOD)[0], 200)


class PersistentLimiterTests(unittest.TestCase):
    def test_limits_survive_a_restart_and_store_no_raw_address(self):
        import os, sqlite3, tempfile
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rl.db")
            t = [1000.0]
            first = receiver.PersistentRateLimiter(path, 2, 600, 10, 3600, clock=lambda: t[0])
            self.assertTrue(first.allow("203.0.113.9")); self.assertTrue(first.allow("203.0.113.9"))
            del first  # "restart"
            second = receiver.PersistentRateLimiter(path, 2, 600, 10, 3600, clock=lambda: t[0])
            self.assertFalse(second.allow("203.0.113.9"))
            self.assertTrue(second.allow("203.0.113.10"))
            t[0] += 601
            self.assertTrue(second.allow("203.0.113.9"))
            dump = " ".join(str(r) for r in sqlite3.connect(path).execute("SELECT * FROM hits").fetchall())
            self.assertNotIn("203.0.113", dump)

    def test_old_rows_are_deleted(self):
        import os, sqlite3, tempfile
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "rl.db"); t = [0.0]
            rl = receiver.PersistentRateLimiter(path, 5, 600, 50, 3600, clock=lambda: t[0])
            rl.allow("a"); t[0] = 4000; rl.allow("b")
            self.assertEqual(sqlite3.connect(path).execute("SELECT COUNT(*) FROM hits WHERE ts < 400").fetchone()[0], 0)


class RateLimiterUnit(unittest.TestCase):
    def test_window_slides_and_global_cap(self):
        t = [0.0]
        rl = receiver.RateLimiter(2, 10, 3, 100, clock=lambda: t[0])
        self.assertTrue(rl.allow("a")); self.assertTrue(rl.allow("a")); self.assertFalse(rl.allow("a"))
        t[0] = 11
        self.assertTrue(rl.allow("a")); self.assertFalse(rl.allow("b"))  # global cap of 3 in 100s reached


if __name__ == "__main__":
    unittest.main()

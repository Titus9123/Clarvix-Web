#!/usr/bin/env python3
"""Clarvix contact-form receiver: validates a lead and emails it to contact@clarvix.net over authenticated SMTP.

Standard library only (Python 3.9+). Runs behind nginx (TLS) on 127.0.0.1. No database, no stored bodies:
the lead exists only in the e-mail and (briefly) in memory while it is processed. Credentials come from
environment variables (see .env.example) and never live in this repository or in the frontend.

POST /v1/contact   application/json  -> 200 {"ok": true}  only after the SMTP server accepted the message
GET  /healthz      -> 200 {"ok": true}
"""
import json
import os
import re
import secrets
import smtplib
import ssl
import sys
import threading
import time
from collections import defaultdict, deque
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_BODY = 16 * 1024
BUSINESS_TYPES = {"technical_service", "moving_transport", "cleaning_maintenance", "events_photo", "classes_training", "beauty", "other"}
RESPONDERS = {"1", "2-3", "4-plus"}
EXISTING_SITE = {"yes", "no"}
PLANS = {"not_sure", "core_monthly", "core_annual"}
PHONE_RE = re.compile(r"^[0-9+\-() ]{7,20}$")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)+$")
URL_RE = re.compile(r"https?://|www\.", re.I)
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f  ]")
ATTRIBUTION = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "landing_page", "original_referrer", "page_url", "referrer", "source_language", "submitted_at"]


def clean(value, limit, multiline=False):
    """Coerce to a bounded string without control characters (blocks header injection and log forging)."""
    text = value if isinstance(value, str) else ("" if value is None else str(value))
    text = CONTROL_RE.sub("", text.replace("\r\n", "\n").replace("\r", "\n"))
    if not multiline:
        text = text.replace("\n", " ")
    return text.strip()[:limit]


def validate(payload):
    """Return (clean_lead, errors). Errors only name fields, never echo values."""
    if not isinstance(payload, dict):
        return None, ["body"]
    errors = []
    lead = {
        "name": clean(payload.get("name"), 100),
        "phone": clean(payload.get("phone"), 20),
        "email": clean(payload.get("email"), 254).lower(),
        "business_type": clean(payload.get("business_type"), 40) or "other",
        "responder_count": clean(payload.get("responder_count"), 10) or "1",
        "has_existing_site": clean(payload.get("has_existing_site"), 5) or "no",
        "plan": clean(payload.get("plan"), 20) or "not_sure",
        "message": clean(payload.get("message"), 2000, multiline=True),
    }
    if len(lead["name"]) < 2:
        errors.append("name")
    if not PHONE_RE.match(lead["phone"]) or sum(c.isdigit() for c in lead["phone"]) < 7:
        errors.append("phone")
    if not EMAIL_RE.match(lead["email"]):
        errors.append("email")
    if lead["business_type"] not in BUSINESS_TYPES:
        errors.append("business_type")
    if lead["responder_count"] not in RESPONDERS:
        errors.append("responder_count")
    if lead["has_existing_site"] not in EXISTING_SITE:
        errors.append("has_existing_site")
    if lead["plan"] not in PLANS:
        errors.append("plan")
    if len(URL_RE.findall(lead["message"] + " " + lead["name"])) > 2:
        errors.append("message")
    for key in ATTRIBUTION:
        lead[key] = clean(payload.get(key), 300)
    return lead, errors


class RateLimiter:
    """Sliding-window limits per client key and globally (in memory; resets on restart)."""

    def __init__(self, per_key, per_key_window, total, total_window, clock=time.monotonic):
        self.per_key, self.per_key_window, self.total, self.total_window, self.clock = per_key, per_key_window, total, total_window, clock
        self.hits = defaultdict(deque)
        self.all = deque()
        self.lock = threading.Lock()

    def allow(self, key):
        now = self.clock()
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > self.per_key_window:
                q.popleft()
            while self.all and now - self.all[0] > self.total_window:
                self.all.popleft()
            if len(q) >= self.per_key or len(self.all) >= self.total:
                return False
            q.append(now)
            self.all.append(now)
            if len(self.hits) > 5000:  # bound memory
                for k in [k for k, v in self.hits.items() if not v]:
                    del self.hits[k]
            return True


def build_message(lead, config):
    labels = [("שם", "name"), ("טלפון", "phone"), ("אימייל", "email"), ("סוג העסק", "business_type"),
              ("כמה אנשים עונים לפניות", "responder_count"), ("אתר קיים", "has_existing_site"), ("מסלול", "plan")]
    lines = [f"{label}: {lead[key]}" for label, key in labels]
    lines += ["", "הודעה:", lead["message"] or "(ללא הערה)", "", "— מקור הפנייה —"]
    lines += [f"{key}: {lead[key]}" for key in ATTRIBUTION if lead.get(key)]
    msg = EmailMessage()
    msg["Subject"] = clean(f"[Clarvix Web] פנייה חדשה מאת {lead['name']}", 200)
    msg["From"] = config["mail_from"]
    msg["To"] = config["mail_to"]
    msg["Reply-To"] = lead["email"]
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain="clarvix.net")
    msg.set_content("\n".join(lines), charset="utf-8", cte="base64")  # pure ASCII on the wire: safe without 8BITMIME
    return msg


def send_mail(msg, config):
    mode = config["smtp_security"]
    timeout = 15
    if mode == "ssl":
        server = smtplib.SMTP_SSL(config["smtp_host"], config["smtp_port"], timeout=timeout, context=ssl.create_default_context())
    else:
        server = smtplib.SMTP(config["smtp_host"], config["smtp_port"], timeout=timeout)
    try:
        server.ehlo()
        if mode == "starttls":
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        if config["smtp_user"]:
            server.login(config["smtp_user"], config["smtp_password"])
        server.send_message(msg)  # raises if the server rejects any recipient
    finally:
        try:
            server.quit()
        except Exception:  # noqa: BLE001
            pass


def load_config(env=None):
    env = os.environ if env is None else env
    config = {
        "smtp_host": env.get("SMTP_HOST", ""),
        "smtp_port": int(env.get("SMTP_PORT", "587")),
        "smtp_security": env.get("SMTP_SECURITY", "starttls").lower(),
        "smtp_user": env.get("SMTP_USER", ""),
        "smtp_password": env.get("SMTP_PASSWORD", ""),
        "mail_from": env.get("MAIL_FROM", env.get("SMTP_USER", "")),
        "mail_to": env.get("MAIL_TO", "contact@clarvix.net"),
        "origins": {o.strip() for o in env.get("ALLOWED_ORIGINS", "https://web.clarvix.net").split(",") if o.strip()},
        "bind": env.get("BIND", "127.0.0.1"),
        "port": int(env.get("PORT", "8787")),
        "trust_proxy": env.get("TRUST_PROXY", "1") == "1",
        "rate_ip": int(env.get("RATE_PER_IP", "5")),
        "rate_ip_window": int(env.get("RATE_PER_IP_WINDOW", "600")),
        "rate_total": int(env.get("RATE_GLOBAL", "60")),
        "rate_total_window": int(env.get("RATE_GLOBAL_WINDOW", "3600")),
    }
    if not config["smtp_host"] or not config["mail_from"]:
        raise SystemExit("SMTP_HOST and MAIL_FROM/SMTP_USER are required")
    if config["smtp_security"] not in ("starttls", "ssl", "none"):
        raise SystemExit("SMTP_SECURITY must be starttls, ssl or none")
    if config["smtp_security"] == "none" and config["smtp_host"] not in ("127.0.0.1", "localhost", "::1"):
        raise SystemExit("SMTP_SECURITY=none is only allowed for localhost")
    return config


def make_handler(config, send=send_mail, limiter=None):
    limiter = limiter or RateLimiter(config["rate_ip"], config["rate_ip_window"], config["rate_total"], config["rate_total_window"])

    class Handler(BaseHTTPRequestHandler):
        server_version = "ClarvixForm"
        sys_version = ""

        def log_message(self, fmt, *args):  # no client data in logs
            pass

        def _client(self):
            if config["trust_proxy"] and self.client_address[0] in ("127.0.0.1", "::1"):
                forwarded = self.headers.get("X-Real-IP") or self.headers.get("X-Forwarded-For", "").split(",")[0].strip()
                if forwarded:
                    return forwarded[:64]
            return self.client_address[0]

        def _cors(self):
            origin = self.headers.get("Origin", "")
            if origin in config["origins"]:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
                self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.send_header("Access-Control-Max-Age", "600")

        def _json(self, status, body, retry_after=None):
            data = json.dumps(body).encode()
            self.send_response(status)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            if retry_after:
                self.send_header("Retry-After", str(retry_after))
            self.end_headers()
            self.wfile.write(data)

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):
            if self.path == "/healthz":
                return self._json(200, {"ok": True})
            self._json(404, {"ok": False, "error": "not_found"})

        def do_POST(self):
            if self.path != "/v1/contact":
                return self._json(404, {"ok": False, "error": "not_found"})
            if self.headers.get("Origin", "") not in config["origins"]:
                return self._json(403, {"ok": False, "error": "origin"})
            if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
                return self._json(415, {"ok": False, "error": "content_type"})
            try:
                length = int(self.headers.get("Content-Length", "-1"))
            except ValueError:
                length = -1
            if length < 0:
                return self._json(411, {"ok": False, "error": "length"})
            if length > MAX_BODY:
                return self._json(413, {"ok": False, "error": "too_large"})
            if not limiter.allow(self._client()):
                return self._json(429, {"ok": False, "error": "rate_limited"}, retry_after=600)
            try:
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
            except (ValueError, UnicodeDecodeError):
                return self._json(400, {"ok": False, "error": "json"})
            if isinstance(payload, dict) and clean(payload.get("company"), 200):  # honeypot: humans never see this field
                return self._json(400, {"ok": False, "error": "rejected"})
            lead, errors = validate(payload)
            if errors:
                return self._json(422, {"ok": False, "error": "validation", "fields": errors})
            try:
                send(build_message(lead, config), config)
            except Exception as exc:  # noqa: BLE001  (log the class only: messages can contain addresses)
                print(f"mail delivery failed: {type(exc).__name__}", file=sys.stderr, flush=True)
                return self._json(502, {"ok": False, "error": "delivery"})
            return self._json(200, {"ok": True, "id": secrets.token_hex(6)})

    return Handler


def main():
    config = load_config()
    server = ThreadingHTTPServer((config["bind"], config["port"]), make_handler(config))
    print(f"clarvix-form listening on {config['bind']}:{config['port']}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

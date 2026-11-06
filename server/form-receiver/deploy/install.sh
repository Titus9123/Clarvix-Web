#!/usr/bin/env bash
# One-shot, idempotent installer for the Clarvix form receiver on the VPS (Debian/Ubuntu, run as root).
#   REF=<commit-sha-or-branch> bash install.sh        # DRY_RUN=1 prints what it would do without changing anything
# It never touches an existing n8n or any other service: if port 443 is held by something other than nginx it stops.
# The SMTP password is typed at the prompt (not echoed) and written only to /etc/clarvix-form/receiver.env (0600).
set -euo pipefail

REPO="https://github.com/Titus9123/Clarvix-Web"
REF="${REF:-claude/form-receiver}"
HOST="forms.clarvix.net"
DRY="${DRY_RUN:-0}"
run() { if [ "$DRY" = 1 ]; then echo "[dry-run] $*"; else "$@"; fi; }
say() { printf '\n== %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || [ "$DRY" = 1 ] || die "run as root (sudo)"
command -v apt-get >/dev/null || die "Debian/Ubuntu only"

say "1/8 Preconditions"
if ! getent hosts "$HOST" >/dev/null; then die "$HOST does not resolve yet: create the DNS A record first (DNS only, not proxied)"; fi
echo "DNS: $HOST -> $(getent hosts "$HOST" | awk '{print $1}' | head -1)"
holder="$(ss -ltnpH 'sport = :443' 2>/dev/null | head -1 || true)"
if [ -n "$holder" ] && ! echo "$holder" | grep -q nginx; then
  echo "$holder"; die "port 443 is used by something other than nginx; not installing a second web server. Add a $HOST proxy rule to that server instead (see nginx-forms.clarvix.net.conf)"
fi

say "2/8 Packages"
need=""
for p in python3 git; do command -v "$p" >/dev/null || need="$need $p"; done
command -v nginx >/dev/null || need="$need nginx"
command -v certbot >/dev/null || need="$need certbot python3-certbot-nginx"
[ -z "$need" ] || run apt-get install -y $need

say "3/8 Code ($REF)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
run git clone -q "$REPO" "$tmp/repo"
run git -C "$tmp/repo" checkout -q "$REF"
SRC="$tmp/repo/server/form-receiver"
run install -d -m 0755 /opt/clarvix-form
run install -m 0644 "$SRC/receiver.py" /opt/clarvix-form/receiver.py

say "4/8 Configuration (secrets stay on this server)"
run install -d -m 0700 /etc/clarvix-form
if [ ! -f /etc/clarvix-form/receiver.env ] && [ "$DRY" != 1 ]; then
  read -r -p "SMTP host [smtp.spacemail.com]: " SMTP_HOST; SMTP_HOST="${SMTP_HOST:-smtp.spacemail.com}"
  read -r -p "SMTP port [465]: " SMTP_PORT; SMTP_PORT="${SMTP_PORT:-465}"
  read -r -p "Sending mailbox (e.g. forms@clarvix.net): " SMTP_USER
  read -r -s -p "SMTP password (not shown): " SMTP_PASSWORD; echo
  sec=starttls; [ "$SMTP_PORT" = 465 ] && sec=ssl
  umask 077
  { echo "SMTP_HOST=$SMTP_HOST"; echo "SMTP_PORT=$SMTP_PORT"; echo "SMTP_SECURITY=$sec"; echo "SMTP_USER=$SMTP_USER";
    echo "SMTP_PASSWORD=$SMTP_PASSWORD"; echo "MAIL_FROM=$SMTP_USER"; echo "MAIL_TO=contact@clarvix.net";
    echo "ALLOWED_ORIGINS=https://web.clarvix.net"; echo "BIND=127.0.0.1"; echo "PORT=8787"; echo "TRUST_PROXY=1"; } > /etc/clarvix-form/receiver.env
  chmod 600 /etc/clarvix-form/receiver.env
else
  echo "keeping existing /etc/clarvix-form/receiver.env"
fi

say "5/8 Service"
run install -m 0644 "$SRC/deploy/clarvix-form.service" /etc/systemd/system/clarvix-form.service
run systemctl daemon-reload
run systemctl enable --now clarvix-form
[ "$DRY" = 1 ] || { sleep 2; systemctl is-active --quiet clarvix-form || { journalctl -u clarvix-form -n 20 --no-pager; die "service failed to start"; }; }

say "6/8 nginx + HTTPS"
if [ ! -d /etc/letsencrypt/live/$HOST ]; then
  run install -m 0644 "$SRC/deploy/nginx-forms.clarvix.net.http.conf" /etc/nginx/sites-available/$HOST
  run ln -sf /etc/nginx/sites-available/$HOST /etc/nginx/sites-enabled/$HOST
  run nginx -t
  run systemctl reload nginx
  run certbot certonly --nginx -d "$HOST" --non-interactive --agree-tos -m contact@clarvix.net
fi
run install -m 0644 "$SRC/deploy/nginx-forms.clarvix.net.conf" /etc/nginx/sites-available/$HOST
run ln -sf /etc/nginx/sites-available/$HOST /etc/nginx/sites-enabled/$HOST
run nginx -t
run systemctl reload nginx
run systemctl enable nginx

say "7/8 Automatic certificate renewal"
run systemctl enable --now certbot.timer 2>/dev/null || true
run certbot renew --dry-run

say "8/8 Verification"
if [ "$DRY" != 1 ]; then
  curl -fsS "https://$HOST/healthz"; echo
  systemctl is-enabled clarvix-form nginx
  read -r -p "Send ONE clearly marked TEST lead to contact@clarvix.net now? [y/N] " ok
  [ "$ok" = y ] && sh "$SRC/deploy/smoke_test.sh" "https://$HOST"
fi
echo "Done. Next: confirm the TEST e-mail arrived, then merge the frontend PR."

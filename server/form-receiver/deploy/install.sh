#!/usr/bin/env bash
# Clarvix form receiver installer. Safe by design:
#  * pinned to an exact commit (full 40-char SHA, verified after checkout)
#  * installs ONLY: /opt/clarvix-form, /etc/clarvix-form, one systemd unit (localhost:8787). Nothing else is overwritten.
#  * installs no packages unless --install-packages is given; needs python3, git, curl
#  * the web server (nginx/Caddy/other) is NOT touched unless --apply-proxy is given; its config is prepared in
#    /etc/clarvix-form/proxy/ and every change is backed up and validated, with automatic rollback
#  * idempotent; reversible with --uninstall; the SMTP password is read from the terminal (never echoed, never in argv)
# Usage: install.sh --ref <sha> [--dry-run] [--proxy auto|nginx|caddy|none] [--apply-proxy] [--upstream host:port]
#                   [--install-packages] [--skip-dns-check] | --uninstall [--purge]
set -euo pipefail

REPO="https://github.com/Titus9123/Clarvix-Web"
HOST="forms.clarvix.net"
REF=""; PROXY="auto"; APPLY=0; DRY=0; PKGS=0; SKIPDNS=0; UNINSTALL=0; PURGE=0; UPSTREAM="127.0.0.1:8787"
while [ $# -gt 0 ]; do case "$1" in
  --ref) REF="$2"; shift 2;; --proxy) PROXY="$2"; shift 2;; --apply-proxy) APPLY=1; shift;; --dry-run) DRY=1; shift;;
  --install-packages) PKGS=1; shift;; --skip-dns-check) SKIPDNS=1; shift;; --upstream) UPSTREAM="$2"; shift 2;;
  --uninstall) UNINSTALL=1; shift;; --purge) PURGE=1; shift;; *) echo "unknown option $1" >&2; exit 2;; esac; done

run() { if [ "$DRY" = 1 ]; then echo "[dry-run] $*"; else "$@"; fi; }
say() { printf '\n== %s\n' "$*"; }
die() { echo "ERROR: $*" >&2; exit 1; }
[ "$DRY" = 1 ] || [ "$(id -u)" = 0 ] || die "run as root"

BACKUP_DIR=/etc/clarvix-form/backups

if [ "$UNINSTALL" = 1 ]; then
  say "Uninstall (reverts only what this installer created)"
  run systemctl disable --now clarvix-form 2>/dev/null || true
  run rm -f /etc/systemd/system/clarvix-form.service
  run systemctl daemon-reload
  run rm -rf /opt/clarvix-form
  # restore proxy configs from the backups made at install time
  for f in "$BACKUP_DIR"/*.orig; do [ -e "$f" ] || continue
    target="$(cat "${f%.orig}.path")"; run cp -a "$f" "$target"; echo "restored $target"; done
  run rm -f /etc/nginx/sites-enabled/$HOST /etc/nginx/sites-available/$HOST
  run rm -rf /etc/clarvix-form/proxy
  if [ "$PURGE" = 1 ]; then run rm -rf /etc/clarvix-form /var/lib/clarvix-form; else echo "kept /etc/clarvix-form (secrets/backups); use --purge to delete"; fi
  [ "$DRY" = 1 ] || { command -v nginx >/dev/null && nginx -t 2>/dev/null && systemctl reload nginx || true; command -v caddy >/dev/null && systemctl reload caddy 2>/dev/null || true; }
  echo "Uninstalled. Existing services were not stopped."; exit 0
fi

[[ "$REF" =~ ^[0-9a-f]{40}$ ]] || die "--ref must be a full 40-character commit SHA (no branch names)"
command -v python3 >/dev/null || die "python3 missing"; command -v git >/dev/null || die "git missing"

say "1/7 Preconditions (read-only)"
[ "$SKIPDNS" = 1 ] || getent hosts "$HOST" >/dev/null || die "$HOST does not resolve yet: create the DNS A record first (DNS only)"
[ -e /opt/clarvix-form ] && [ ! -f /opt/clarvix-form/receiver.py ] && die "/opt/clarvix-form exists but is not ours"
ss -ltnH 'sport = :8787' 2>/dev/null | grep -q . && ! systemctl is-active --quiet clarvix-form && die "port 8787 is used by another process"
holder="$(ss -ltnpH 'sport = :443' 2>/dev/null | head -1 || true)"
detected=none
echo "$holder" | grep -q nginx && detected=nginx
echo "$holder" | grep -q caddy && detected=caddy
echo "$holder" | grep -q -E 'docker-proxy|traefik' && detected=container
[ -z "$holder" ] && detected=free
[ "$PROXY" = auto ] && PROXY="$detected"
echo "port 443 holder: ${holder:-none}  -> proxy mode: $PROXY"

say "2/7 Code (commit $REF)"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
git clone -q --no-checkout "$REPO" "$tmp/repo"; git -C "$tmp/repo" checkout -q "$REF"
[ "$(git -C "$tmp/repo" rev-parse HEAD)" = "$REF" ] || die "checked-out commit does not match --ref"
SRC="$tmp/repo/server/form-receiver"
( cd "$SRC" && sha256sum receiver.py deploy/clarvix-form.service deploy/*.conf )
python3 -c "import ast,sys;ast.parse(open('$SRC/receiver.py').read())"

say "3/7 Receiver files (only ours)"
run install -d -m 0755 /opt/clarvix-form
run install -m 0644 "$SRC/receiver.py" /opt/clarvix-form/receiver.py
run install -d -m 0700 /etc/clarvix-form "$BACKUP_DIR" /etc/clarvix-form/proxy

say "4/7 Configuration (the password stays on this server)"
if [ ! -f /etc/clarvix-form/receiver.env ] && [ "$DRY" != 1 ]; then
  read -r -p "SMTP host [smtp.spacemail.com]: " SMTP_HOST; SMTP_HOST="${SMTP_HOST:-smtp.spacemail.com}"
  read -r -p "SMTP port [465]: " SMTP_PORT; SMTP_PORT="${SMTP_PORT:-465}"
  read -r -p "Sending mailbox (e.g. forms@clarvix.net): " SMTP_USER
  read -r -s -p "SMTP password (not shown): " SMTP_PASSWORD; echo
  sec=starttls; [ "$SMTP_PORT" = 465 ] && sec=ssl
  ( umask 077; { echo "SMTP_HOST=$SMTP_HOST"; echo "SMTP_PORT=$SMTP_PORT"; echo "SMTP_SECURITY=$sec"; echo "SMTP_USER=$SMTP_USER";
    echo "SMTP_PASSWORD=$SMTP_PASSWORD"; echo "MAIL_FROM=$SMTP_USER"; echo "MAIL_TO=contact@clarvix.net";
    echo "ALLOWED_ORIGINS=https://web.clarvix.net"; echo "BIND=127.0.0.1"; echo "PORT=8787"; echo "TRUST_PROXY=1"; } > /etc/clarvix-form/receiver.env )
  chmod 600 /etc/clarvix-form/receiver.env; unset SMTP_PASSWORD
elif [ "$DRY" = 1 ]; then echo "[dry-run] would prompt for SMTP settings if /etc/clarvix-form/receiver.env does not exist"
else echo "keeping existing /etc/clarvix-form/receiver.env"; fi

say "5/7 Service (localhost only)"
run install -m 0644 "$SRC/deploy/clarvix-form.service" /etc/systemd/system/clarvix-form.service
run systemctl daemon-reload
run systemctl enable --now clarvix-form
if [ "$DRY" != 1 ]; then
  for _ in 1 2 3 4 5; do curl -fsS http://127.0.0.1:8787/healthz >/dev/null 2>&1 && break; sleep 1; done
  curl -fsS http://127.0.0.1:8787/healthz || { journalctl -u clarvix-form -n 20 --no-pager; die "receiver not healthy (existing services untouched; run --uninstall to revert)"; }; echo
fi

say "6/7 Reverse proxy ($PROXY) - prepared, applied only with --apply-proxy"
backup() { [ -e "$1" ] || return 0; b="$BACKUP_DIR/$(echo "$1" | tr / _)"; [ -e "$b.orig" ] || { cp -a "$1" "$b.orig"; echo "$1" > "$b.path"; }; }
case "$PROXY" in
  caddy)
    cat > "$tmp/forms.caddy" <<CADDY
$HOST {
	encode zstd gzip
	@api path /v1/contact /healthz
	handle @api {
		reverse_proxy $UPSTREAM
	}
	handle {
		respond 404
	}
}
CADDY
    run install -m 0644 "$tmp/forms.caddy" /etc/clarvix-form/proxy/forms.caddy
    if [ "$APPLY" = 1 ]; then
      CF=/etc/caddy/Caddyfile; [ -f "$CF" ] || die "no /etc/caddy/Caddyfile (Caddy in a container?). Add proxy/forms.caddy to its Caddyfile manually; upstream must reach $UPSTREAM"
      if ! grep -q 'clarvix-form/proxy/forms.caddy' "$CF"; then
        run bash -c "$(declare -f backup); BACKUP_DIR='$BACKUP_DIR'; backup '$CF'"
        run bash -c "printf '\nimport /etc/clarvix-form/proxy/forms.caddy\n' >> '$CF'"
      fi
      if [ "$DRY" != 1 ]; then
        if caddy validate --config "$CF" --adapter caddyfile >/dev/null 2>&1; then systemctl reload caddy && echo "caddy reloaded"
        else b="$BACKUP_DIR/$(echo "$CF" | tr / _).orig"; [ -e "$b" ] && cp -a "$b" "$CF"; systemctl reload caddy 2>/dev/null || true; die "Caddy validation failed; original Caddyfile restored"; fi
      fi
    else echo "Prepared /etc/clarvix-form/proxy/forms.caddy. Re-run with --apply-proxy to add 'import' to the Caddyfile (backup + validate + auto-rollback)."; fi;;
  nginx|free)
    command -v nginx >/dev/null && command -v certbot >/dev/null || { [ "$PKGS" = 1 ] && run apt-get install -y nginx certbot python3-certbot-nginx || die "nginx/certbot missing: re-run with --install-packages"; }
    run install -m 0644 "$SRC/deploy/nginx-forms.clarvix.net.http.conf" /etc/clarvix-form/proxy/http.conf
    run install -m 0644 "$SRC/deploy/nginx-forms.clarvix.net.conf" /etc/clarvix-form/proxy/https.conf
    if [ "$APPLY" = 1 ]; then
      [ ! -e /etc/nginx/sites-available/$HOST ] || run bash -c "$(declare -f backup); BACKUP_DIR='$BACKUP_DIR'; backup /etc/nginx/sites-available/$HOST"
      if [ ! -d /etc/letsencrypt/live/$HOST ]; then
        run cp /etc/clarvix-form/proxy/http.conf /etc/nginx/sites-available/$HOST; run ln -sf /etc/nginx/sites-available/$HOST /etc/nginx/sites-enabled/$HOST
        run nginx -t; run systemctl reload nginx
        run certbot certonly --nginx -d "$HOST" --non-interactive --agree-tos -m contact@clarvix.net
      fi
      run cp /etc/clarvix-form/proxy/https.conf /etc/nginx/sites-available/$HOST; run ln -sf /etc/nginx/sites-available/$HOST /etc/nginx/sites-enabled/$HOST
      if [ "$DRY" != 1 ] && ! nginx -t 2>/dev/null; then rm -f /etc/nginx/sites-enabled/$HOST; nginx -t && systemctl reload nginx; die "nginx test failed; site removed, existing config intact"; fi
      run systemctl reload nginx; run systemctl enable --now certbot.timer 2>/dev/null || true; run certbot renew --dry-run
    else echo "Prepared nginx configs in /etc/clarvix-form/proxy/. Re-run with --apply-proxy to enable."; fi;;
  container) echo "443 is held by a container proxy. Nothing was changed. Add proxy/forms.caddy (or the equivalent) to that proxy so it reaches the receiver at the host's $UPSTREAM; then re-run with --upstream <host-reachable-address>.";;
  *) echo "no proxy action";;
esac

say "7/7 Verification"
if [ "$DRY" != 1 ] && [ "$APPLY" = 1 ]; then curl -fsS "https://$HOST/healthz" && echo; fi
systemctl is-enabled clarvix-form 2>/dev/null || true
echo "Done. Existing services untouched. Revert: install.sh --uninstall. Next: smoke_test.sh https://$HOST"

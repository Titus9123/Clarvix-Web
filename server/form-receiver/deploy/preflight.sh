#!/usr/bin/env bash
# READ-ONLY survey of the VPS before installing anything. Changes nothing, prints no secrets.
#   ssh root@46.38.241.140 'bash -s' < preflight.sh
set -u
sec() { printf '\n== %s\n' "$*"; }
sec "OS / resources"
. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"; uname -r; echo "cpu: $(nproc)  load: $(cut -d' ' -f1-3 /proc/loadavg)"
free -h | sed -n 1,2p; df -h / /opt /var 2>/dev/null | awk 'NR==1||!seen[$1]++'
sec "Public IP / listening sockets (80, 443, 22, 8787)"
ss -ltnpH 2>/dev/null | awk '{print $4, $6}' | grep -E ':(22|80|443|8787|5678)\b' || echo "(none of the usual ports)"
sec "Reverse proxy / TLS"
for s in caddy nginx apache2 traefik; do systemctl is-active "$s" 2>/dev/null | sed "s/^/$s: /"; done
command -v caddy >/dev/null && { caddy version; ls -l /etc/caddy 2>/dev/null; echo "--- Caddyfile (first 60 lines, secrets masked)"; sed -E 's/(token|key|secret|password)[^ ]*.*/\1 [masked]/I' /etc/caddy/Caddyfile 2>/dev/null | head -60; }
command -v nginx >/dev/null && { nginx -v 2>&1; ls /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null; }
command -v certbot >/dev/null && certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" 
sec "Docker / containers (names and ports only)"
command -v docker >/dev/null && docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' 2>/dev/null || echo "(no docker)"
sec "Existing projects / services"
systemctl list-units --type=service --state=running --no-legend 2>/dev/null | awk '{print $1}' | grep -v -E '^(systemd|dbus|ssh|cron|rsyslog|getty|user@|polkit|multipathd|unattended|qemu|snapd|ModemManager|networkd|udisks)' | head -30
ls -d /opt/* /srv/* /var/www/* /home/*/ 2>/dev/null | head -30
sec "Conflicts with the receiver"
[ -e /opt/clarvix-form ] && echo "EXISTS /opt/clarvix-form" || echo "ok: /opt/clarvix-form free"
[ -e /etc/clarvix-form ] && echo "EXISTS /etc/clarvix-form" || echo "ok: /etc/clarvix-form free"
systemctl list-unit-files 2>/dev/null | grep -q '^clarvix-form' && echo "EXISTS unit clarvix-form" || echo "ok: unit name free"
ss -ltnH 'sport = :8787' | grep -q . && echo "CONFLICT: port 8787 in use" || echo "ok: 127.0.0.1:8787 free"
getent hosts forms.clarvix.net || echo "forms.clarvix.net: no DNS yet"
command -v python3 >/dev/null && python3 --version || echo "python3 MISSING"
command -v git >/dev/null || echo "git missing (installer needs it)"
sec "SMTP egress (does this VPS reach Spacemail?)"
for p in 465 587; do timeout 6 bash -c "exec 3<>/dev/tcp/smtp.spacemail.com/$p" 2>/dev/null && echo "smtp.spacemail.com:$p reachable" || echo "smtp.spacemail.com:$p BLOCKED/unreachable"; done

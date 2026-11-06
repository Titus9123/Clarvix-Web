# Receptor del formulario de contacto

Recibe el formulario de `web.clarvix.net`, lo valida y lo envía por **SMTP autenticado** a `contact@clarvix.net`.
Solo librería estándar de Python (≥3.9). Sin base de datos, sin SaaS. Los datos del lead existen únicamente en el
correo enviado; el receptor no guarda cuerpos de petición ni registra IP ni contenido.

**Contrato:** `POST https://forms.clarvix.net/v1/contact` (JSON, mismo payload que ya envía el sitio) →
`200 {"ok":true}` **solo después** de que el servidor SMTP acepte el mensaje; `422` validación (nombres de campo, nunca valores);
`429` límite; `403` origen no permitido; `400` honeypot/JSON inválido; `502` fallo de entrega (nunca se simula un éxito).

Controles (revisados antes del despliegue): límites por IP/globales **persistentes** (SQLite en `StateDirectory`, solo hash salado de la IP + hora, borrado en ≤1 h), honeypot `company`, origen exacto, tipo de contenido, tamaño ≤16 KB, límites por IP (5/10 min) y globales (60/h) en la app
y en nginx, enteros/enums cerrados, rechazo de enlaces en exceso, eliminación de caracteres de control (inyección de cabeceras),
SMTP con TLS verificado (STARTTLS/SSL), credenciales solo por variables de entorno, `Reply-To` = correo del visitante.

## Instalación en el VPS (segura, reversible, sin tocar lo existente)
1. **Reconocimiento solo lectura:** `ssh root@46.38.241.140 'bash -s' < deploy/preflight.sh` (SO, recursos, puertos, nginx/Caddy/Docker, certificados, conflictos, salida SMTP). No cambia nada y enmascara secretos.
2. **Instalar** (SHA completo obligatorio; el script verifica que el commit descargado coincide y muestra los sha256 de lo que instala):
   `install.sh --ref <sha40>` instala **solo** `/opt/clarvix-form`, `/etc/clarvix-form` y una unidad systemd en `127.0.0.1:8787`. No instala paquetes (salvo `--install-packages`), no descarga nada más que este commit y **no toca nginx/Caddy/otros servicios**: prepara su configuración en `/etc/clarvix-form/proxy/` y solo la aplica con `--apply-proxy` (copia de seguridad + validación + reversión automática). Con Caddy (lo más probable en este VPS: HTTP/3 anunciado y HSTS, no nginx) basta un bloque `forms.clarvix.net { reverse_proxy 127.0.0.1:8787 }` y Caddy gestiona el certificado y su renovación.
3. **Revertir:** `install.sh --uninstall` (restaura las copias de seguridad; `--purge` borra también `/etc/clarvix-form`). Idempotente: se puede volver a ejecutar.
La contraseña SMTP se teclea en el terminal (no se muestra, no va en argumentos ni en el repo). `--dry-run` muestra todo sin cambiar nada.

Requisitos externos: registro DNS `A forms.clarvix.net → 46.38.241.140` (Cloudflare, "solo DNS") y un buzón SMTP exclusivo de envío.

## Verificación antes del cambio de producción
1. `python3 -m unittest test_receiver` (14 pruebas, servidor SMTP simulado).
2. `deploy/smoke_test.sh https://forms.clarvix.net` → `HTTP 200` y correo recibido con asunto "[Clarvix Web] פנייה חדשה מאת TEST…"; la prueba negativa debe dar `403`.
3. Solo entonces fusionar el PR del frontend (cambia `CONTACT_ENDPOINT` y la CSP).

## Operación
`journalctl -u clarvix-form` (solo muestra fallos de entrega por tipo de error, sin datos personales) · reinicio: `systemctl restart clarvix-form` ·
rotar la contraseña SMTP: editar `/etc/clarvix-form/receiver.env` y reiniciar.

## Revisión previa al despliegue (resumen)
| Tema | Resolución |
|---|---|
| Límites tras reinicio | Persistentes en SQLite (hash salado de la IP, sin contenido); además `limit_req` de nginx, que no depende del servicio |
| Errores SMTP | Transitorios (caída, timeout, 4xx): 1 reintento y `503 unavailable`. Permanentes (credenciales, 5xx, TLS): `502`, sin reintento. Nunca `200` sin aceptación del servidor de correo |
| SMTP caído | El formulario muestra el mensaje de error con las alternativas (WhatsApp/teléfono/correo) y **conserva lo escrito**; tiempo máximo de espera 25 s en el navegador |
| Abuso | Origen exacto, honeypot, enums, tamaño, anti-enlaces, límites, `limit_except POST` |
| Credenciales | Solo en `/etc/clarvix-form/receiver.env` (root, 0600); nunca en el repo ni en el frontend. Usar un usuario SMTP exclusivo de envío |
| systemd | `DynamicUser`, `StateDirectory` 0700, sin capacidades, `ProtectSystem=strict`, filtro de syscalls, `MemoryMax`; bloqueo de red opcional en `deploy/optional-network-lockdown.conf` |
| Red | Escucha solo en `127.0.0.1`; abrir solo 22/80/443 (`ufw allow 22,80,443/tcp`); el puerto 8787 no se expone |
| HTTPS | certbot (`--nginx`) instala el temporizador de renovación. Comprobar: `systemctl list-timers certbot.timer` y `certbot renew --dry-run`; nginx envía HSTS |
| Tras reiniciar el VPS | `systemctl enable` (servicio y nginx) + `Restart=always`. Probar una vez con `sudo reboot` y luego `smoke_test.sh` |
| Privacidad | El aviso del sitio declara: los datos viajan al buzón `contact@clarvix.net`, no se guardan en el servidor, y se conserva hasta 1 h un identificador con hash de la IP para limitar abusos |

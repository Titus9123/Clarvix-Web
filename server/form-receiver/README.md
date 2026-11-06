# Receptor del formulario de contacto

Recibe el formulario de `web.clarvix.net`, lo valida y lo envía por **SMTP autenticado** a `contact@clarvix.net`.
Solo librería estándar de Python (≥3.9). Sin base de datos, sin SaaS. Los datos del lead existen únicamente en el
correo enviado; el receptor no guarda cuerpos de petición ni registra IP ni contenido.

**Contrato:** `POST https://forms.clarvix.net/v1/contact` (JSON, mismo payload que ya envía el sitio) →
`200 {"ok":true}` **solo después** de que el servidor SMTP acepte el mensaje; `422` validación (nombres de campo, nunca valores);
`429` límite; `403` origen no permitido; `400` honeypot/JSON inválido; `502` fallo de entrega (nunca se simula un éxito).

Controles: honeypot `company`, origen exacto, tipo de contenido, tamaño ≤16 KB, límites por IP (5/10 min) y globales (60/h) en la app
y en nginx, enteros/enums cerrados, rechazo de enlaces en exceso, eliminación de caracteres de control (inyección de cabeceras),
SMTP con TLS verificado (STARTTLS/SSL), credenciales solo por variables de entorno, `Reply-To` = correo del visitante.

## Instalación en el VPS (una sola vez)
```bash
sudo install -d /opt/clarvix-form /etc/clarvix-form
sudo cp receiver.py /opt/clarvix-form/
sudo cp .env.example /etc/clarvix-form/receiver.env && sudo chmod 600 /etc/clarvix-form/receiver.env   # completar SMTP_* reales
sudo cp deploy/clarvix-form.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now clarvix-form
sudo cp deploy/nginx-forms.clarvix.net.conf /etc/nginx/sites-available/forms.clarvix.net
sudo ln -s /etc/nginx/sites-available/forms.clarvix.net /etc/nginx/sites-enabled/ && sudo certbot --nginx -d forms.clarvix.net && sudo nginx -t && sudo systemctl reload nginx
```
Requisitos externos: registro DNS `A forms.clarvix.net → IP del VPS` y un usuario SMTP exclusivo para envío (ver `.env.example`).

## Verificación antes del cambio de producción
1. `python3 -m unittest test_receiver` (14 pruebas, servidor SMTP simulado).
2. `deploy/smoke_test.sh https://forms.clarvix.net` → `HTTP 200` y correo recibido con asunto "[Clarvix Web] פנייה חדשה מאת TEST…"; la prueba negativa debe dar `403`.
3. Solo entonces fusionar el PR del frontend (cambia `CONTACT_ENDPOINT` y la CSP).

## Operación
`journalctl -u clarvix-form` (solo muestra fallos de entrega por tipo de error, sin datos personales) · reinicio: `systemctl restart clarvix-form` ·
rotar la contraseña SMTP: editar `/etc/clarvix-form/receiver.env` y reiniciar.

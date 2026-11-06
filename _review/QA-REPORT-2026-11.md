# Informe de validación — PR #2 (rama `claude/exciting-edison-x69iqg`)
Fecha: 6-nov-2026. **Sin merge ni despliegue.**

## 1. Pruebas automáticas
| Suite | Antes | Ahora |
|---|---|---|
| acquisition | 13/13 | 15/15 (+GA4 solo con ID válido, +email) |
| performance-contract | 5/16 | 15/15 |
| contact-form-contract | 3/4 | 4/4 |
| commercial-offer (nueva) | — | 3/3 |
| `validate-seo.py` | fallaba | PASS (13 páginas, 292 enlaces, 10 URLs de sitemap) |

### Las 12 pruebas que fallaban (ya fallaban en `main`)
**Problemas reales (corregidos):**
- Logos sin `width`/`height` en 10 páginas → riesgo de CLS. Añadidos (400×85).
- Subpáginas cargaban las fuentes con `@import` dentro de `offer.css` → cadena de CSS bloqueante. Ahora `<link>` directo + preload; `@import` eliminado.

**Obsoletas (reemplazadas por equivalentes, no eliminadas):**
- Oferta "Clarvix Core 2.900/2.200", "sin cambios mensuales", demo Smart Request y capturas del portafolio: pertenecían al diseño anterior. Sustituidas por: guardia de oferta comercial (texto de servicios, precios, proceso, condiciones y FAQ idéntico a producción, 111 líneas), prueba de tamaño de imágenes, prueba de los 3 canales de contacto y prueba de ausencia de `@import`.
- Contacto: esperaba selector de plan (eliminado en la oferta nueva). Ahora verifica CSP, `plan=not_sure`, campos y aviso de privacidad.
- `validate-seo.py`: ajustado a las páginas de redirección (noindex) y a Service sin precios.

## 2. Pruebas funcionales (Chromium, móvil 390 px y escritorio 1366 px)
- 11 páginas × 2 tamaños: **sin scroll horizontal ni errores JS**.
- Enlaces: WhatsApp `wa.me/972534377718`, `tel:+972534377718`, `mailto:contact@clarvix.net` presentes y correctos en home y páginas nuevas.
- Medición, **sin consentimiento**: 0 eventos, 0 peticiones a Google/Meta.
- **Con consentimiento**: un clic = un `click_whatsapp`/`click_phone`/`click_email` (con `link_location` y `page_path`) + una conversión de Ads solo en WhatsApp y teléfono; sin duplicados.
- Formulario: validado con el endpoint simulado (payload completo con UTM, estado de éxito). **No se envió nada al n8n real.** Comprueba un envío real tras publicar.

## 3. Comparación visual con producción (`main`)
Capturas de página completa, home. Los píxeles son **idénticos hasta el inicio de la nueva sección de contacto** (móvil y=5760, escritorio y=3818). Diferencias solo en: sección `#contact` y enlaces de pie.

## 4. Sin cambios comerciales
La prueba `commercial-offer` compara el texto de servicios, precios, proceso, términos y FAQ con el de producción: idéntico. Teléfono y correo sin cambios. Las páginas nuevas citan textos existentes y remiten a la home para precios (no los repiten).

## 5. Medición GA4
No existe configuración GA4 en el repo, ramas, historial (búsqueda de `G-`, `GTM-`, `UA-`) ni en correos de Google. Solo existe Google Ads `AW-18364963340`. El código ya admite GA4: rellenar `GA4_MEASUREMENT_ID` en `script.js`. Para evitar doble conteo: los `click_*` de GA4 son para análisis; **no** los importes a Ads como conversión mientras la etiqueta de Ads ya cuenta WhatsApp/teléfono.

## 6. Pendientes
1. ID de GA4 (o autorización para crear la propiedad).
2. Revisión de textos/diseño de las 3 páginas nuevas.
3. Core Web Vitals reales: medir tras publicar (PageSpeed/CrUX).
4. Google Ads: correos del 27-oct y 2-nov indican cuenta por verificar y conversiones sin medir; fuera del alcance de este PR.
5. Envío real del formulario y revisión de que el endpoint n8n recibe los campos.
6. `business-websites.html` era una redirección noindex a `/`; ahora es página real (decisión a confirmar).

## 7. Ronda 2 (6-nov, tarde)
- **Web en vivo** (tras habilitar `web.clarvix.net`): `/` 200, `robots.txt` 200, `sitemap.xml` 200, URL inexistente 404; el HTML de producción coincide en tamaño con `main` (20.384 B). Producción aún es la versión anterior a este PR.
- **Lighthouse móvil, laboratorio (no son datos de campo):**

| Página | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Producción `/` | 96 | 96 | 100 | 100 | 1,9 s | 0 |
| Rama, home (local) | 95 | **100** | 100 | 100 | 2,5 s | 0 |
| Rama, perfil Google | 100 | 100 | 100 | 100 | 1,5 s | 0,001 |
| Rama, contacto | 100 | 100 | 100 | 100 | 1,4 s | 0 |

(La home local y `main` local dieron ambas LCP 2,5 s: no hay regresión; producción mide por red real.)
- **Dos defectos reales encontrados y corregidos:** (a) contraste 2,7:1 en "איך זה עובד" y FAQ (texto gris oscuro sobre fondo oscuro; ya ocurría en producción); (b) los logos del pie se deformaban con `height="85"`; añadido `height:auto`. Esto cambia el color del texto secundario de esas dos secciones (más claro); el diseño y el contenido no cambian.
- PageSpeed API (CrUX/campo): 429 sin clave; no hay datos de campo.

## 8. Bloqueos reales
- **GA4 y Search Console:** no dispongo de navegador ni de tu sesión de Google en esta sesión (sin herramientas de navegador; sin carpetas de equipo conectadas). El conector **Windsor.ai** (cubre GA4, Search Console y Perfil de Empresa) está instalado pero en estado `needs_reconnect`: requiere que reautorices OAuth en claude.ai → Connectors. Sin eso no puedo comprobar propiedades, crear el flujo ni enviar el sitemap.
- Mientras tanto, `GA4_MEASUREMENT_ID` queda vacío y no se envían datos a GA4.

## 9. Ronda 3 — conectores (6-nov, verificado)
- Comprobado con `ListConnectors`: Google Drive y Google Calendar **conectados y cargados**; **Windsor.ai sigue en `needs_reconnect` (connected=false, enabledInChat=false)** a nivel de organización, tras dos comprobaciones. No se puede leer ni escribir GA4/Search Console. No se confunde con falta de permisos: la autorización de Windsor no se completó.
- El conector **n8n falló al conectar** (error 404 del servicio de conectores) y `n8n.clarvix.net` no es accesible desde la red de la sesión: no es posible inspeccionar el workflow ni garantizar que un envío de prueba sea inocuo. **No se envió ningún formulario real.**
- Tarifa WhatsApp Israel obtenida (ver informe de Meta). Hosts habilitados en el entorno: `whatsappbusiness.com`.

## 10. Ronda 4 — Windsor.ai, GA4 y Search Console (6-nov)
- **Windsor.ai operativo en Claude:** `connected=true`, 14 herramientas cargadas. Plan Windsor: Free. Fuentes realmente conectadas: **solo Google Analytics 4**. Search Console, Google Ads y Perfil de Empresa **no** están conectados en Windsor.
- **GA4:** cuenta/propiedad "Clarvix" (ID 531280237, zona horaria Asia/Jerusalem, moneda USD) con **un único flujo web "Clarvix Web"** (stream 14313464457), ID de medición **G-P4R22F19B8**, ya integrado en `script.js` (solo tras consentimiento).
- Datos históricos del flujo (2 años): www.clarvix.net (5-20 abr), clarvix.net (20 abr-26 may), 127.0.0.1 (28 jun-1 jul) y **freeutilitylab.com (4 nov, 3 eventos)**. **Nunca web.clarvix.net.** El último host es de otro proyecto que parece usar este mismo ID.
- **Permisos de Windsor sobre GA4: solo lectura** (`list_actions` vacío). No se pueden crear propiedades/flujos ni marcar eventos clave. No se creó nada.
- Prueba en navegador (local): sin consentimiento 0 peticiones y 0 eventos; con consentimiento 1 carga de gtag, `config` de AW y de G-P4R22F19B8 (una vez cada uno) y un único evento `click_whatsapp`/`click_phone`/`click_email` por clic. Aviso de privacidad actualizado para mencionar Google Analytics.
- La recepción real en GA4 **no se pudo verificar**: la web con este cambio no está publicada.

## 11. Ronda 5 — separación de estadísticas y validación final (6-nov)
**Causa de la mezcla (verificada leyendo HTML/GTM públicos, solo lectura):**
- La home de freeutilitylab.com usa su propio ID `G-54GQ1ZT341`.
- Sus subpáginas (p. ej. `/aistackcost/...`) cargan además el contenedor GTM `GTM-KQ8MQBNQ`, cuyo único tag es una etiqueta de Google con **`G-P4R22F19B8`** (el ID de Clarvix) en "All Pages". Ese contenedor es la fuente de los 3 eventos del 4-nov.
- Otros hosts que han enviado datos a la propiedad: `www.clarvix.net`, `clarvix.net`, `127.0.0.1` (pruebas locales). Nunca `web.clarvix.net`. No existe otra propiedad GA4 visible desde Windsor (solo "Clarvix").
- No hay eventos clave marcados en la propiedad (todos `(not set)`).
- **Pendiente (no autorizado/sin herramienta):** quitar `G-P4R22F19B8` del contenedor GTM-KQ8MQBNQ (es de otro proyecto) y crear un flujo/propiedad exclusivo para `web.clarvix.net`. Mientras tanto, los informes de Clarvix Web deben filtrar `hostname = web.clarvix.net`. No se modificó ni borró nada.
- Parámetros `link_location`/`contact_method`: para verlos en informes GA4 hay que registrarlos como dimensiones personalizadas (escritura en Admin, no disponible). `page_path`/página y nombre de evento sí son nativos.

**Validación final del PR (commit actual):** 4 suites 38/38 pruebas, validador SEO PASS (13 páginas, 292 enlaces, 10 URLs de sitemap), texto comercial idéntico a producción (guardia), 3 páginas nuevas completas (H1, FAQ, JSON-LD, canonical, sitemap, enlaces desde la home), analítica sin consentimiento: 0 peticiones/0 eventos. Comparación móvil/escritorio con `main`: idéntica salvo (a) corrección de contraste en dos secciones, (b) nueva sección de contacto y enlaces de pie, (c) ruido de antialiasing de 3/765 en el logo.

## 12. Ronda 6 — simplificación y cierre (6-nov)
- **Netlify:** auditado el árbol actual y el historial (nombres y contenido): 0 referencias, ningún archivo de configuración. Publicación confirmada en GitHub Pages (`CNAME` = web.clarvix.net, `.nojekyll`, 35 despliegues "pages build and deployment"). Prueba nueva que impide reintroducir `netlify.toml`, `_redirects`, `_headers`, `.netlify` o `vercel.json`.
- **n8n:** el único uso funcional es el webhook del formulario de contacto (`script.js` → `n8n.clarvix.net/webhook/clarvix/web-lead`); se conserva porque quitarlo desactivaría el formulario. Eliminado lo que no tenía función: el host n8n se quitó de la CSP (`connect-src`) de las 9 páginas sin formulario (prueba nueva: solo `contact.html` puede mencionarlo) y la arquitectura WhatsApp ya no usa n8n.
- **Free Utility Lab:** PR https://github.com/Titus9123/free-utility-lab/pull/2 (15 páginas; 11 de ellas solo tenían el contenedor y reciben el gtag propio `G-54GQ1ZT341`; sin cambios en las 37 pruebas que ya fallaban).
- **Validador SEO:** ahora detecta claves duplicadas en JSON-LD (causa del aviso de Search Console de septiembre), `noindex` en URLs del sitemap, URLs inexistentes, `lastmod` inválido y `robots.txt` que bloquee algo. Todo PASS.
- Público hoy: `sitemap.xml` y `robots.txt` responden 200 en producción (versión antigua de 6 URLs; las 4 páginas nuevas aún no existen en vivo).
- **Hallazgo previo al PR:** GitHub Pages sirve todo el repositorio. `operations/` (plantillas CRM/consentimientos vacías, borrador de contrato, inventario de proveedores) y `_review/` responden 200 en producción. Hoy son plantillas sin datos, pero el README dice que "no se publican".

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

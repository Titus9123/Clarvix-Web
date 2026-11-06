# Medición: estado, causa y operaciones pendientes (6-nov-2026)

## Qué se puede hacer desde esta sesión
| Operación | Estado |
|---|---|
| Leer datos de GA4 (Windsor) | **Ejecutable ahora** (verificado) |
| Escribir en GA4 Admin (crear propiedad/flujo, dimensiones, eventos clave) | **Requiere conectar otra herramienta**: Windsor solo lee GA4 (`list_actions` vacío); no hay conector de GA4 Admin en el catálogo accesible |
| Editar/publicar contenedor GTM | **Requiere conectar otra herramienta + autorización personal de Google** (no hay conector de GTM; la sesión no tiene navegador ni credenciales de Google) |
| Search Console (leer, enviar sitemap) | **Requiere autorización personal de Google (OAuth) en Windsor**; aun conectado, Windsor solo lee: enviar sitemap requiere otra herramienta |
| Cambiar código de otro repositorio | Fuera de alcance autorizado |

No se usó ninguna credencial ajena (la sesión tiene un token de gcloud para su proxy, no es una autorización de Analytics/GTM y no se usó).

## Causa de la contaminación (verificada)
- Contenedor `GTM-KQ8MQBNQ` contiene **una sola etiqueta**: Google tag `G-P4R22F19B8` (Clarvix), disparador "Initialization – All Pages", sin variables ni otras etiquetas.
- Ese contenedor está pegado en **15 páginas** de `Titus9123/free-utility-lab` (aistackcost ×4, budgetreset ×3, mealplansheet ×2, movebudget ×5, habitgrid ×1). Esas páginas ya cargan su propio `G-54GQ1ZT341` por gtag directo.
- El contenedor no aporta seguimiento legítimo a Free Utility Lab, por lo que no hay conversiones, etiquetas de anuncios ni otras integraciones que preservar.

## Corrección (dos vías equivalentes; ninguna aplicada)
1. **En GTM** (cuenta que contiene `GTM-KQ8MQBNQ`): borrar la etiqueta "Google tag G-P4R22F19B8" del contenedor, crear versión y publicar. Efecto inmediato en las 15 páginas, sin tocar el repo.
2. **En el repo** de Free Utility Lab: quitar el snippet GTM y el `<noscript>` de las 15 páginas. Hay un parche listo, **no aplicado ni enviado**: `/tmp/claude-0/-workspace/105c823d-7c86-5c6a-953e-0dbdab8802ea/scratchpad/ful-remove-gtm.patch` (30 líneas cambiadas en 15 archivos).
Los datos históricos no se tocan en ninguna de las dos.

## Configuración de Clarvix Web en GA4 (preparada, no aplicada)
- **Propiedad/flujo:** reutilizar "Clarvix Web" (`G-P4R22F19B8`, stream 14313464457) es válido una vez eliminada la fuga; una propiedad nueva solo aportaría separar de los datos antiguos de `clarvix.net`/pruebas. Si se prefiere propiedad nueva, el ID nuevo se cambia en una línea de `script.js` (`GA4_MEASUREMENT_ID`).
- **Dimensiones personalizadas (alcance: evento):** `link_location` y `contact_method` (el parámetro `page_path` ya es nativo vía `page_location`).
- **Eventos clave:** hoy no hay ninguno marcado. Marcar `click_whatsapp`, `click_phone`, `click_email` solo para análisis; **no** importar a Google Ads (ya cuenta WhatsApp/teléfono con su etiqueta propia: duplicaría).
- **Filtro de informes:** hasta separar, usar `hostname = web.clarvix.net`.
- **Clic ≠ consulta real:** `click_*` mide intención. La consulta real es `generate_lead`/formulario enviado (ya existe la conversión de Ads de formulario) y, en el futuro, mensajes recibidos por WhatsApp/API o llamadas conectadas.

## Search Console
Propiedad `https://web.clarvix.net/` verificada (correos de Google, 8-sep-2026). Windsor aún no tiene la fuente `searchconsole` conectada; no se revisó indexación, sitemap ni consultas. No se solicitó indexación de páginas sin publicar.

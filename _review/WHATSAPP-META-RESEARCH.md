# Automatización de WhatsApp con Meta — investigación (solo fase de estudio)

**Actualización:** la página oficial de precios se leyó directamente (`curl`, tras habilitar el dominio) y confirma: cobro por mensaje entregado, 1.000 mensajes de servicio gratis al mes por número desde el 1-oct-2026 y mensajes del cliente sin cargo. Israel (IL, +972) figura como mercado propio en la tarifa. El CSV de tarifas por moneda no se pudo descargar (el enlace está en `business.whatsapp.com`, que redirige a un host no permitido); falta el importe exacto.

**Método (primera pasada):** `developers.facebook.com` no es accesible por descarga directa desde esta sesión (el host no resuelve). Los datos siguientes provienen de resúmenes de búsqueda sobre páginas oficiales de Meta (6-nov-2026). Algunos resúmenes admiten que ciertas páginas son antiguas; **antes de decidir, abre los enlaces y confirma**. No se obtuvieron tarifas en ILS.

**Cómo habilitar el acceso directo:** en Claude Code web → Settings → Environment → Network → añadir `developers.facebook.com` (y `business.whatsapp.com`) a hosts permitidos. Si quieres, lo propongo yo desde la sesión con aprobación tuya.

## Hallazgos (fuentes oficiales de Meta)
- **Precios** ([Pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing)): cobro **por mensaje entregado**, según categoría y país del destinatario. Lo que escribe el cliente no se cobra. El modelo por conversación está deprecado.
- **Cambio vigente desde 1-oct-2026:** los mensajes de servicio dentro de la ventana de 24 h ya no son gratis sin más; hay una franquicia de **1.000 mensajes de servicio entregados al mes por número**, y se cobra desde el 1.001. Los de utilidad enviados como respuesta también se cobran ([non-template messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages)). Foros y páginas antiguas aún dicen "gratis": están desactualizados.
- **Ventana de 24 h:** se abre cuando el cliente escribe o llama y se renueva con cada mensaje suyo; fuera de ella solo plantillas aprobadas ([service messages](https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages)). Existe además una ventana de "punto de entrada gratuito" (hasta 7 días según una fuente, 72 h según otra: **verificar**).
- **Número actual — coexistencia** ([onboarding de usuarios de la app Business](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/)): permite usar la app WhatsApp Business y la Cloud API con el mismo número. Requisitos/limitaciones indicados: versión reciente de la app, flujo Embedded Signup (pensado para Solution Partners/Tech Providers), webhook fiable; **no se migran** grupos, listas de difusión, llamadas, mensajes temporales ni dispositivos vinculados; límite de 20 mensajes/s; el número no se puede dar de baja por API una vez en uso dual. Queda por verificar si un negocio individual puede usarla sin ser partner.
- **Agente de IA de Meta (Business Agent):** cobro aparte por tokens (dato de una página oficial; no relevante para la primera fase).

## Arquitectura recomendada (fase posterior)
`Cliente → WhatsApp → Cloud API (Meta) → Webhook HTTPS → n8n (n8n.clarvix.net) → CRM/Sheet + respuesta`
- Webhook con token de verificación y validación de `X-Hub-Signature-256`.
- Dentro de 24 h: respuesta libre; fuera: plantillas aprobadas.
- Guardar por contacto: número, origen (UTM/botón), consentimiento y estado.

## Pendiente de verificar / decidir
1. Verificación del negocio en Meta Business Portfolio (documentos para un עוסק פטור).
2. Coexistencia vs. número nuevo dedicado a la API (riesgo: migrar sin coexistencia desconecta la app actual).
3. Tarifas por categoría para Israel (tabla oficial de precios).
4. Consentimiento (opt-in) y ley de privacidad israelí.
5. Calidad del número, límites de envío, políticas de contenido.
6. Directo vs. proveedor (BSP): directo es más barato, requiere mantenimiento.

## Siguiente paso (requiere tu autorización)
Crear/verificar el Business Portfolio y usar el número de prueba gratuito de Meta para un prototipo en n8n. Sin conectar el número real ni activar facturación.

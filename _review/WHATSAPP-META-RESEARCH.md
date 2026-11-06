# Automatización de WhatsApp con Meta — investigación (solo fase de estudio)

**Limitación importante:** la red de esta sesión bloquea `developers.facebook.com`; no pude leer la documentación oficial. Lo siguiente es conocimiento general y **debe verificarse** en la documentación oficial antes de decidir. No incluyo precios porque cambian y no pude confirmarlos.

## Arquitectura recomendada (fase posterior)
`Cliente → WhatsApp → Cloud API (Meta) → Webhook HTTPS → n8n (n8n.clarvix.net) → CRM/Sheet + respuesta`
- Cloud API alojada por Meta (sin servidor propio de WhatsApp); n8n ya existe en tu infraestructura y recibe el webhook.
- Webhook: endpoint HTTPS público con verificación de token y validación de firma `X-Hub-Signature-256`.
- Respuestas: texto libre dentro de la ventana de atención de 24 h desde el último mensaje del cliente; fuera de ella, solo plantillas aprobadas.
- Guardar de cada contacto: número, origen (UTM/botón), consentimiento, estado.

## Puntos a verificar en la documentación oficial
1. **Meta Business Portfolio** y **verificación del negocio** (qué documentos exige para un עוסק פטור).
2. **Usar el número actual (053-437-7718):** un número no puede estar a la vez en la app WhatsApp normal y en la API salvo con la modalidad de coexistencia con WhatsApp Business app; comprobar disponibilidad en Israel. Riesgo: migrar sin coexistencia desconecta la app actual.
3. **Plantillas:** categorías (marketing, utilidad, autenticación), aprobación y reglas.
4. **Precios:** modelo vigente de cobro por mensaje/categoría y qué es gratis (respuestas dentro de la ventana de servicio); consultar la tabla oficial por país.
5. **Consentimiento:** opt-in explícito antes de mensajes iniciados por la empresa; cumplimiento con la ley de protección de la privacidad israelí.
6. **Límites y riesgos:** calidad del número, límites de envío por nivel, bloqueo por reportes, políticas de comercio.
7. **Alternativas:** BSP (proveedores de pago) vs. integración directa; la directa es más barata pero requiere mantenimiento.

## Siguiente paso (necesita tu autorización)
Crear/verificar el Business Portfolio y un número de prueba de Meta (gratuito) para un prototipo en n8n, sin conectar el número real ni activar facturación. Para investigar la documentación oficial, permite el dominio `developers.facebook.com` en la red de la sesión.

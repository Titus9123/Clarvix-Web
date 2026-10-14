# Inventario de proveedores

| Proveedor | Finalidad | Datos posibles | Cuenta | Control mínimo | Salida |
|---|---|---|---|---|---|
| GitHub Pages | Alojamiento público | IP y registros técnicos | Clarvix | 2FA, repositorio privado si procede, mínimo acceso | Export estático |
| LiveDNS | Registro y renovación | Datos legales y contacto del Holder | Central Clarvix | 2FA, exactitud de Holder, recordatorios | TAC/transferencia |
| Cloudflare | DNS y seguridad | DNS, IP y registros técnicos | Central Clarvix | 2FA, permisos mínimos, backup DNS | Cambio de nameservers |
| n8n Clarvix | Recepción de leads | Datos del formulario | Clarvix | HTTPS, acceso limitado, retención 12 meses | Export/borrado |
| Google Ads | Medición opcional | Eventos e identificadores técnicos | Clarvix | Solo tras consentimiento, sin texto de formularios | Revocar etiqueta |
| Meta Pixel | Medición opcional | Eventos e identificadores técnicos | Clarvix | Solo tras consentimiento, sin datos de contacto | Revocar pixel |
| WhatsApp/Meta | Canal elegido por visitante | Mensaje que el visitante decide enviar | Visitante/cliente | No abrir ni enviar automáticamente | El usuario cancela antes de enviar |

Revisar trimestralmente condiciones, subencargados, ubicación de tratamiento, accesos y necesidad real de cada proveedor.

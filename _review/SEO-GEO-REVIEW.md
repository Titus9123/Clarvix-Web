# Clarvix Web — cambios para revisión

Fecha de ejecución: 6 de septiembre de 2026.
Guía: Plan-SEO-GEO-Clarvix-Web.docx, v1.0 del 5 de septiembre.
Base y reversión: `3620673e9b9ace928001f300d4e19e3cf73f4794`.
Rama: `seo-geo-foundation`. La rama principal no se modifica ni se publica.

## Implementado y comprobado en código

| Tareas de la guía | Resultado |
| --- | --- |
| BASE-01 | Base del repositorio coincide con la auditoría; rama separada. README y CNAME indican sitio estático para dominio propio; no se encontraron instrucciones AGENTS.md ni workflows. La configuración del alojamiento no se pudo comprobar. |
| HOME-01/02 | Título, descripción, OG/Twitter, H1 e introducción orientados a creación y renovación; enlace `#services` corregido; descripciones hebreas y enlaces a servicios; primera pregunta útil para compradores. |
| ARCH-01/03 | Dos páginas comerciales, `landing-pages.html` y `business-websites.html`, con alcance y precios actuales. Enlaces desde portada y pies; enlaces entre servicios y guía. |
| ARCH-02 | Guía `landing-page-or-website.html`: compara objetivo, contenido, funciones, precios y mantenimiento. Dos casos quedan pendientes de hechos y permisos; no se crearon URL vacías ni se incluyeron en sitemap. |
| TRUST-01 | Sobre Nosotros explica proceso y responsable Albert, propietario de Clarvix; elimina comparaciones despectivas y afirmaciones de equipo no verificadas. No se inventa experiencia profesional ni resultados. |
| CONTACT-01 | Teléfono legible con dirección LTR en contacto y pies de página. Correo y número existentes conservados. |
| TECH-01 | Enlaces de portada usan `/` y `/#…`; sitemap de siete URL; 404 útil con recursos absolutos y noindex; contenido visible cuando JavaScript está desactivado. |
| SCHEMA-01 | Organization con identificador estable, WebSite/WebPage, BreadcrumbList visible en nuevas páginas y Service/Offer. Dynamic usa precio mínimo y descripción «desde». FAQ JSON-LD coincide con el texto visible. Se elimina sameAs del producto y no se inventan dirección ni reseñas. |
| MEASURE-01 | UTM de entrada conservadas durante navegación interna; nueva campaña reemplaza la anterior; origen externo y entrada guardados sin query arbitraria; tolerancia a almacenamiento bloqueado. |
| MEASURE-02 | Eventos de clic y de envío satisfactorio; se conservan los tres identificadores Ads. Se evita envío repetido mientras hay una petición pendiente. No se añadieron valores del formulario a los eventos. |
| GEO-01/02 | Respuestas en HTML, tablas y preguntas útiles; enlaces y contacto actualizados en llms.txt. No se promete posicionamiento ni citas. |

## Decisiones para Albert, reunidas para después

1. **Condiciones comerciales:** confirmar si Care es opcional, cuándo comienza, renovación de dominio, duración del alojamiento incluido y servicio sin Care; forma de presentar impuestos. Los precios y el cuerpo de términos se conservaron exactamente. Las páginas nuevas describen la oferta publicada y remiten a la propuesta individual para condiciones pendientes.
2. **Privacidad de portafolio:** confirmar alcance antes de cambiar el compromiso publicado. Propuesta de texto hebreo para revisión: `במסלול הפרטי קלארוויקס ווב אינה מציגה את הפרויקט בתיק העבודות או בפרסומים שלה. אתר ציבורי עדיין עשוי להופיע במנועי חיפוש או להיות משותף על ידי אחרים.` La afirmación absoluta anterior sigue en el FAQ original y sus datos estructurados, hasta validar su sustitución junto con términos.
3. **Casos Sunny y Clarvix:** confirmar autoría/alcance entregado, capturas, permiso y objetivos. Clarvix debe etiquetarse como proyecto propio. No incluir cifras de visitas, conversiones, ventas, clientes o resultados sin evidencia. Borradores de estructura abajo.
4. **Responsable y datos locales:** validar presentación de Albert; aportar experiencia pertinente comprobable si se quiere ampliar Nosotros. Confirmar zona presencial y horario antes de añadirlos o crear perfiles locales.
5. **Receptor n8n:** aprobar y verificar `landing_page` y `original_referrer`. La implementación está preparada con `LEAD_ATTRIBUTION_FIELDS_ENABLED = false`; mantiene exactamente los campos originales del envío. Las UTM conservadas ya rellenan los campos existentes. `referrer` mantiene su significado anterior; el origen externo separado no se envía mientras la opción esté desactivada.
6. **Analítica:** comprobar si la etiqueta Google Ads ya tiene destino GA4. Los eventos están implementados, pero no se afirma recepción en GA4. No se añadió un identificador inventado ni una segunda etiqueta.
7. **Publicación:** revisar y aprobar esta rama antes de integrar. Comprobar configuración real de GitHub Pages/alojamiento y dominio, revisión visual y medición privada. Después de publicar, validar HTTP real y enviar sitemap a Search Console y Bing.

## Casos pendientes: estructura concreta sin hechos inventados

### case-sunny.html

- Título propuesto: `אתר לכלבנות טיפולית לילדים — סאני | קלארוויקס ווב`.
- Ya mostrado en portada: Sunny, כלבנות טיפולית לילדים; la tarjeta lo describe como sitio de aterrizaje y marca.
- Captura existente: `images/sunny-hero.webp`.
- Enlace existente: https://titus9123.github.io/Sunny/
- Antes de publicar: necesidad y público confirmados por el responsable; funciones efectivamente entregadas; decisiones de diseño verificables; permiso de publicación de marca e imágenes.
- Cierre previsto: enlace a `landing-pages.html` y `contact.html`.

### case-clarvix.html

- Título propuesto: `אתר קלארוויקס — פרויקט של המותג | קלארוויקס ווב`.
- Etiqueta visible obligatoria: `פרויקט של המותג קלארוויקס`.
- Captura existente: `images/clarvix-screenshot.webp`; enlace existente: https://clarvix.net/
- Antes de publicar: confirmar qué trabajo concreto de marca, diseño y desarrollo se entregó; distinguir esas tareas de las capacidades del producto de auditoría.
- Sin atribuir a la web resultados del producto ni inventar métricas.
- Cierre previsto: enlace a `business-websites.html` y `contact.html`.

## Verificación y límites

- `node --check script.js`.
- `node --test tests/*.test.mjs`: 28 pruebas pasan; 15 existentes y 13 nuevas. Estas últimas ejecutan las secciones reales de atribución y formulario en un entorno simulado, con fetch sustituido; no llaman a n8n ni a Google.
- `python tests/validate-seo.py`: ocho HTML, 317 referencias internas/recursos, metadatos únicos, H1, RTL, anchors, canonical, FAQ visible/JSON-LD, recursos de 404 en rutas anidadas y siete URL en sitemap.
- Comparación con base: mismos precios de selectores, cuerpo legal y robots.txt; IDs Ads y endpoint conservados.
- **Pendiente:** pruebas visuales de escritorio/móvil, teclado, menú, calculadora y reducción de movimiento en navegador. El navegador disponible rechazó la vista previa local (`ERR_BLOCKED_BY_CLIENT`). No hay capturas ni aprobación visual.
- **Pendiente:** HTTPS/HTTP de producción, 404 del alojamiento, Schema Markup Validator/Rich Results Test externos, entrega real a n8n y recepción en analítica. El acceso directo al dominio no estuvo disponible desde este entorno. Los controles locales no prueban la respuesta de producción.
- **Pendiente:** Search Console/Bing, datos de campo, indexación, posiciones, citas y comparación PageSpeed/Lighthouse antes/después. No se hicieron cambios a animaciones por supuestas métricas.
- Los casos, condiciones no confirmadas y activación de campos nuevos están explícitamente fuera de lo marcado como completado.

## Fundamento de las páginas nuevas

La consulta pública del 6 de septiembre devuelve páginas diferenciadas de oferta para las dos intenciones; se conserva la separación propuesta en la guía. Es una decisión inicial de estructura, no una estimación de volumen o dificultad. Contrastar después con Search Console.

- Páginas de aterrizaje: https://rix.co.il/דף-נחיתה-לעסק/ y https://www.orimintzmedia.co.il/בניית-אתרים/עמודי-נחיתה/
- Sitios de presentación: https://www.topeak.co.il/בניית-אתרים/תדמית/ y https://webshuk.com/brand-website/
- Google confirma que sus funciones de IA aplican las bases SEO y no exigen un archivo especial ni un schema especial: https://developers.google.com/search/docs/appearance/ai-features

## Al publicar

1. Completar las revisiones pendientes y comprobar main antes de integrar.
2. Publicar con el flujo existente y comprobar todas las rutas, contacto y eventos.
3. Enviar sitemap e inspeccionar URL prioritarias; registrar fecha de publicación.
4. Revisar rastreo a siete días; consultas y contactos a 28 y 56 días.
5. Ante fallo crítico, revertir el commit integrado y volver a la base registrada; no usar un reset forzado de main.

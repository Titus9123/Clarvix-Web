# Estrategia SEO/GEO — Clarvix Web (6-nov-2026)

## Método y límites
- **Skills:** en esta sesión solo hay habilitada `skill-creator`; no hay ninguna skill de SEO/GEO instalada. El catálogo de plugins ofrece varias de terceros (comunidad), pero no están instaladas ni se usaron. La metodología (auditoría técnica, intención de búsqueda, clusters, schema, GEO) se aplicó manualmente.
- **Datos de búsqueda:** no hay acceso a volúmenes, dificultad ni posiciones (Search Console sin conectar; sin herramienta de palabras clave). **No se inventó ninguna cifra.** Lo siguiente es observación cualitativa de resultados de búsqueda el 6-nov-2026 mediante una herramienta de búsqueda con sede en EE. UU.: la SERP real en Israel puede diferir.
- Para cifras reales: Search Console (consultas, impresiones, clics) tras 4–8 semanas de publicación, y el Planificador de palabras clave de Google Ads (gratuito con la cuenta existente).

## Oportunidades por intención
| Búsqueda (hebreo) | Intención | Qué se observó en los resultados | Oportunidad / página |
|---|---|---|---|
| אתר לעסק בתשלום חודשי ללא דמי הקמה | Comercial | Casi sin resultados en hebreo: un advertorial de un proveedor y blogs extranjeros. Los buscadores preguntan por propiedad del dominio, salida y coste total | **Alta y diferenciadora** (coincide con el modelo real): `business-websites` (H1, title, FAQ, "preguntas para cualquier proveedor") |
| הקמת אתר תדמית לעסק קטן | Comercial/informativa | Dominan medios y advertorials (ice, bhol, kikar, walla), comparativas Wix/WordPress, precios de 2021 | Competida; ángulo de pequeño negocio + modelo mensual: `business-websites` |
| אתר בעמוד אחד לעסק / מתי כדאי | Informativa | Guías en inglés; poca cobertura hebrea | Sección "cómo elegir" en `business-websites` |
| פרופיל עסק בגוגל / הופעה בגוגל מפות (עסק שירות) | Informativa→comercial | Guías de Google en inglés y de proveedores extranjeros; cobertura hebrea escasa | `google-business-profile` (negocio con dirección vs. que va al cliente, errores comunes) |
| למה העסק שלי לא מופיע בגוגל | Problema (informativa) | Sobre todo traducciones/guías en inglés | **Nueva guía** `why-business-not-on-google` (6 comprobaciones) → enlaza a los servicios |
| אוטומציה לעסקים קטנים | Mixta | Blogs de grandes proveedores (Salesforce IL), LinkedIn y estudios pequeños | `business-automation` con ángulo "un solo proceso" (el servicio real) |
| מערכת לניהול פניות לעסק קטן | Comercial | CRM de grandes proveedores | Término genérico difícil; apuntar a frases de problema ("pierdo el rastro de las consultas") en `inquiries-and-bookings` |
| מערכת זימון תורים | Comercial | Apps especializadas (Tor4You, LinedUp, Cali, iTor) | Término genérico poco realista; apuntar a "קביעת תורים באתר העסק" dentro de `inquiries-and-bookings` |

**Consultas adicionales detectadas (sin medir):** "מי הבעלים של הדומיין כשבונים אתר", "מה לשאול לפני שבונים אתר", "פרופיל עסק בגוגל לעסק בלי כתובת / אזורי שירות", "פרופיל עסק לא מאומת". Cubiertas en las páginas nuevas.

## Implementado en el PR #2 (esta ronda)
- 2 páginas nuevas (de 3 a 5): `business-automation` (servicio ya existente "אוטומציה פשוטה") y la guía `why-business-not-on-google`. Las 3 existentes se ampliaron de ~300 a 410–630 palabras, con bloque "בקצרה" al inicio (respuesta directa, útil para fragmentos y respuestas de IA), secciones por pregunta real, FAQ ampliada y fecha de actualización.
- Home: sección "מידע שימושי לבעלי עסקים" con enlaces descriptivos a las 5 páginas (antes solo en el pie), `FAQPage` generado desde la FAQ visible, y cada `Service` apunta a su página. Pie de página con los 5 enlaces en todo el sitio.
- Datos estructurados por página: `WebPage` + `BreadcrumbList` + `Service` (o `Article` en la guía) + `FAQPage`, `Organization` coherente, sin precios, valoraciones, dirección ni `sameAs` inventados.
- `llms.txt` reescrito (resumen y enlaces). **No hay evidencia oficial de que mejore la aparición en respuestas de IA**; es opcional y de bajo coste.
- Sitemap con 12 URLs y `lastmod`. Guardia comercial: el texto de servicios, precios y condiciones sigue idéntico a producción.

## GEO: qué sí y qué no
- **Sí (verificable):** respuesta directa al inicio, contenido en HTML rastreable, FAQ coherente con el marcado, datos de la empresa idénticos en todo el sitio (nombre, teléfono, correo, responsable), páginas legales y de contacto claras, sin promesas de resultados.
- **No se puede añadir sin inventar:** reseñas, clientes, casos de éxito, certificaciones o años de experiencia (no existen en el sitio ni se aportaron). Cuando haya casos reales con permiso, son la mayor mejora de confianza pendiente.

## Pendiente / siguientes oportunidades
1. Publicar y enviar el sitemap en Search Console; revisar consultas reales a los 7/30/60/90 días.
2. Casos o testimonios reales (con autorización) y datos de contacto/entidad en `about`.
3. Si Search Console confirma demanda: guías de problema adicionales ligadas a servicios reales (sin contenido masivo).
4. Menciones y enlaces legítimos (directorios de negocios israelíes, asociaciones, perfiles de la empresa).

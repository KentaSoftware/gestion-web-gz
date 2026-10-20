# Critique Report — /home

**Target**: `src/app/home/page.tsx`
**Date**: 2026-06-02
**Combined**: LLM Design Review + Automated Detection (impeccable detect)

---

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 2 | Actividad reciente mezcla "loading", "empty" y "error" en resultado visual casi idéntico |
| 2 | Match System / Real World | 3 | "Lectura diaria del negocio." suena editorial, pero el dashboard es multintervalo |
| 3 | User Control and Freedom | 2 | Filtros sin reset explícito para combinaciones CUSTOM + modo |
| 4 | Consistency and Standards | 2 | Mezcla hero, panel operativo, chips de estado y cards sin jerarquía única |
| 5 | Error Prevention | 2 | Validación de fechas sí, pero poca prevención semántica para deltas y períodos |
| 6 | Recognition Rather Than Recall | 2 | Porcentajes "+x%" obligan a inferir contra qué se compara |
| 7 | Flexibility and Efficiency of Use | 1 | Sin shortcuts, sin densidad configurable, sin atajos de lectura |
| 8 | Aesthetic and Minimalist Design | 2 | Desperdicia espacio en headline, rail y copy redundante |
| 9 | Error Recovery | 2 | recentMovements falla en silencio y cae a vacío |
| 10 | Help and Documentation | 1 | Sin ayuda contextual para deltas, modos o lógica del período |
| **Total** | | **19/40** | **Poor** |

---

## Anti-Patterns Verdict

**LLM assessment**: Borderline AI-adjacent. No cae en los peores pecados (gradiente, glassmorphism, template hero-metrics), pero tiene tells familiares de dashboards generados: hero poético sobredimensionado, cards simétricas repetidas, composición que "se ve diseñada" antes que operativa.

**Deterministic scan**: `impeccable detect --json` reportó **0 hallazgos** en `page.tsx`. El detector no encontró ninguno de los 27 patrones automatizados. Esto confirma que no hay violaciones técnicas obvias, pero también que los problemas más profundos (jerarquía, carga cognitiva, tono) son estructurales, no detectables por regex.

**Veredicto final**: No es AI slop evidente, pero sí es un dashboard que "se siente genérico". El mayor riesgo no son los anti-patrones visuales, sino que el diseño prioriza formato sobre velocidad de lectura operativa.

---

## Overall Impression

La home de `/home` está **funcionalmente completa, visualmente decente, pero operativamente ruidosa**. No hay errores de build ni componentes rotos. Pero la pantalla le pide demasiado al usuario antes de darle lo que busca. El hero ocupa espacio que debería ser métrico. El rail derecho está infrautilizado. Y los deltas carecen de contexto de comparación.

El mayor activo: los KPI cards ya tienen loading, error y retry.  
La mayor deuda: la página no sabe si es un "panel de control comercial" o una "lectura rápida del negocio".

---

## What's Working

1. **Base visual sólida**: diseño sobrio, sin efectos decorativos que dañen legibilidad. Consistentemente usa tokens.
2. **Actividad reciente**: aterriza el dashboard en hechos concretos (monto, signo, fecha, tipo).
3. **Estados de KPI cards**: ResultKPICard y ExpenseKPICard tienen loading, error y retry implementados — por encima del promedio de dashboards internos.
4. **Optimización aplicada**: el chart ahora es lazy-loaded, el bundle cayó ~42%, y los skeletons son consistentes.

---

## Priority Issues

### P1 — Jerarquía invertida en el primer pantallazo
- **Qué**: H1 poético + card "Modo activo" ganan protagonismo frente a KPIs que responden "cómo viene el negocio".
- **Por qué**: El usuario operativo entra a decidir, no a contemplar. Pierde tiempo escaneando copy antes de encontrar datos.
- **Fix**: Reducir hero a título funcional corto. Integrar modo/intervalo/período en una barra operativa compacta. Primer barrido ocular debe caer en métricas.
- **Comando sugerido**: `/impeccable distill /home` (parcialmente hecho) + `/impeccable shape /home`

### P1 — Layout desbalanceado por rail derecho infrautilizado
- **Qué**: El aside tiene poca densidad comparado con panel principal. Genera vacío vertical en ~1024px+.
- **Por qué**: La composición se siente rota: el rail existe pero no justifica su espacio.
- **Fix**: O se elimina el rail y se integran sus controles al header, o se le da contenido real (alertas, resumen rápido, comparativa).
- **Comando sugerido**: `/impeccable layout /home`

### P1 — Deltas sin contexto de comparación
- **Qué**: `+x%` no dice "vs qué" (vs ayer, vs semana anterior, vs mismo período mes pasado).
- **Por qué**: El usuario tiene que inferir el baseline. `Lectura diaria del negocio.` choca con intervalos semanal/mensual/anual.
- **Fix**: Cada delta debe decir explícitamente "vs ayer", "vs semana ant.", etc. El título debe no prometer "diaria" si es multintervalo.
- **Comando sugerido**: `/impeccable clarify /home`

### P2 — Actividad reciente no comunica bien estados
- **Qué**: "Sin movimientos" y "falló la carga" se ven igual. Mostrar "5 de 9" sin explicar el criterio.
- **Por qué**: El usuario no sabe si el sistema funciona, si no hay datos, o si hay un error silencioso.
- **Fix**: Separar visualmente loading/empty/error. Mostrar "Últimos 5 movimientos" o "Movimientos del mes" sin mezclar conceptos.
- **Comando sugerido**: `/impeccable harden /home`

### P2 — Semántica de color ligada a bueno/malo en toggles de modo
- **Qué**: Ventas en verde, Compras en rojo, como si una fuera buena y la otra mala.
- **Por qué**: El color debería indicar categoría, no valor moral. Sesga lectura y carga demasiado significado en el color.
- **Fix**: Usar colores de categoría neutral para modo Ventas/Compras. Reservar verde/rojo para variación/delta.
- **Comando sugerido**: `/impeccable polish /home`

---

## Minor Observations

- "Lectura diaria del negocio." es un título lindo pero conceptualmente incorrecto cuando el intervalo puede ser anual o custom.
- El texto del gráfico explica decisiones de implementación ("evitar scroll horizontal innecesario") que al usuario final no le importan.
- "Intervalo leído" suena a sistema, no a negocio.
- Los controles de intervalo arriba del aside exigen reach alto en mobile.

---

## Persona Red Flags

### Alex (Power User)
- Demasiada superficie que escanear antes del dato importante.
- Sin ruta rápida: ni shortcuts, ni densidad compacta, ni toolbar operativa unificada.

### Sam (Accessibility-Dependent)
- Significado depende de color en toggles, deltas y movimientos (verde/rojo).
- Sin anuncio accesible de refresh al cambiar intervalo/modo.
- Actividad reciente no diferencia vacío real de fallo de carga.

### Casey (Distracted Mobile)
- Controles clave muy arriba y dispersos.
- Rail + composición larga aumentan scroll antes de consolidar lectura útil.
- Carrusel horizontal de intervalos agrega fricción.

---

## Questions to Consider

- Si el usuario tuviera solo 7 segundos, ¿qué tres números tiene que ver sí o sí?
- ¿Esta pantalla está tratando de "presentar un dashboard" o de "resolver una lectura operativa"?
- Si quitáramos el hero completo, ¿la pantalla ganaría velocidad?
- ¿Por qué modo, intervalo y período no viven en un mismo sistema de control?
- ¿Qué versión de esta home haría que un encargado diga "ya entendí cómo viene el día" sin bajar el scroll?

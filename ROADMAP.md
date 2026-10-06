# ROADMAP.md — Queen Style ERP

## Plan de desarrollo incremental por fases

---

## Resumen ejecutivo

El desarrollo se divide en **8 fases** siguiendo un modelo incremental. Cada fase entrega valor funcional completo antes de comenzar la siguiente.

```
Fase 0: Planning         ← COMPLETADA (este documento)
Fase 1: Foundation       ← Proyecto, Auth, Users, DB, Design System
Fase 2: Products         ← Productos, Categorías, Imágenes
Fase 3: Inventory        ← Inventario, Movimientos, QR
Fase 4: Physical Sales   ← Ventas físicas, Promotoras
Fase 5: Catalog          ← Catálogo, Carrito, Pedidos, WhatsApp
Fase 6: Finance          ← Dashboard, Finanzas
Fase 7: Reports          ← Reportes, Inteligencia de inventario
Fase 8: PWA / Notif.    ← PWA, Push Notifications
```

---

## Fase 0 — Planning ✅

**Objetivo:** Definir y documentar la arquitectura antes de escribir código.

**Entregables:**
- [x] `README.md` — Requerimientos
- [x] `ARCHITECTURE.md` — Decisiones técnicas
- [x] `DATABASE.md` — Schema completo
- [x] `API.md` — Endpoints diseñados
- [x] `ROADMAP.md` — Este documento
- [x] `TASKS.md` — Lista de tareas ejecutables

**Criterios de completitud:**
- [ ] Arquitectura aprobada por el equipo
- [ ] Stack tecnológico confirmado
- [ ] Base de datos aprobada
- [ ] API aprobada
- [ ] Roadmap aprobado

---

## Fase 1 — Foundation

**Objetivo:** Tener el esqueleto funcional de ambas aplicaciones con autenticación.

**Duración estimada:** 2–3 semanas

**Módulos:**
- Proyecto monorepo configurado
- Backend NestJS + TypeScript
- Frontend React + Vite + TypeScript
- PostgreSQL + Prisma schema
- Sistema de autenticación (login, logout, refresh)
- Gestión de usuarios (CRUD)
- Sistema de roles (ADMIN / PROMOTORA)
- Design System base
- Layouts (Admin, Catálogo, Auth)
- Router configurado

**Dependencias:** Fase 0 completada

**Criterios de completitud:**
- [x] `GET /api/v1/health` responde 200
- [x] Login funciona y retorna JWT
- [x] Refresh token rota correctamente
- [x] ADMIN puede crear usuarios PROMOTORA
- [x] PROMOTORA no puede acceder a rutas de ADMIN
- [x] Design System documentado
- [ ] Layouts responsvios en móvil
- [x] Variables de entorno configuradas
- [ ] Docker Compose funciona para desarrollo local

**Riesgos:**
- Configuración del monorepo puede ser compleja → usar npm workspaces simple
- PWA setup temprano puede complicar el desarrollo → diferir a Fase 8

---

## Fase 2 — Products

**Objetivo:** Gestión completa de productos y categorías.

**Duración estimada:** 1–2 semanas

**Módulos:**
- CRUD de categorías
- CRUD de productos (con SKU único)
- Upload de imágenes (storage externo)
- Listado con filtros y paginación
- Vista de detalle de producto
- Búsqueda por nombre y SKU

**Dependencias:** Fase 1 completada

**Criterios de completitud:**
- [x] ADMIN puede crear, editar y desactivar productos
- [ ] Imágenes se almacenan en storage externo (URL en BD)
- [x] Búsqueda por nombre y SKU funciona
- [x] Paginación en listado de productos
- [x] Soft delete: producto con ventas → INACTIVE

**Riesgos:**
- Storage provider puede no estar disponible → usar almacenamiento local en desarrollo
- Formato de imágenes: garantizar conversión a WebP

---

## Fase 3 — Inventory

**Objetivo:** Control de inventario con trazabilidad completa.

**Duración estimada:** 1–2 semanas

**Módulos:**
- Inventario actual por producto
- Movimientos de inventario (todos los tipos)
- Historial de movimientos
- Ajuste manual de inventario
- QR: generación y escaneo
- Alertas de stock bajo

**Dependencias:** Fase 2 completada

**Criterios de completitud:**
- [x] Stock se actualiza correctamente al registrar movimientos
- [x] Historial completo e inmutable
- [x] No se puede tener stock negativo
- [ ] QR generado por producto y escaneable desde móvil
- [ ] Escanear QR lleva al producto correcto
- [ ] Promotora puede consultar stock desde celular

**Riesgos:**
- Librería QR en frontend puede tener problemas en móvil → probar en dispositivos reales temprano
- Concurrencia en stock: implementar pessimistic lock desde esta fase

---

## Fase 4 — Physical Sales

**Objetivo:** Registrar ventas físicas desde el ERP.

**Duración estimada:** 2 semanas

**Módulos:**
- Flujo de nueva venta
- Buscar producto por nombre o SKU
- Escanear QR → agregar al carrito de venta
- Seleccionar cliente (opcional)
- Métodos de pago
- Confirmación y registro
- Inventario actualizado automáticamente
- Historial de ventas
- Vista de venta por promotora
- Cancelación de venta (ADMIN)

**Dependencias:** Fase 3 completada

**Criterios de completitud:**
- [x] Venta completa en transacción atómica
- [x] Stock actualiza correctamente al vender
- [x] Cancelación devuelve stock
- [x] Promotora ve solo sus ventas
- [x] ADMIN ve todas las ventas
- [x] Precios históricos conservados en SaleItem
- [ ] Funciona cómodamente en móvil (360px–412px)

**Riesgos:**
- Flujo de venta en móvil puede ser complejo → priorizar UX mobile first
- Venta concurrente del mismo producto → lock ya implementado en Fase 3

---

## Fase 5 — Catalog & Orders

**Objetivo:** Catálogo público y pedidos online con integración WhatsApp.

**Duración estimada:** 2–3 semanas

**Módulos:**
- Catálogo público (mobile first)
- Filtros por categoría
- Vista de producto
- Carrito de compras
- Checkout
- Pedido online
- Generación de mensaje WhatsApp
- Gestión de pedidos en ERP (estados)

**Dependencias:** Fase 4 completada

**Criterios de completitud:**
- [ ] Catálogo muestra solo productos ACTIVE con stock
- [x] Precios validados en backend (nunca del cliente)
- [x] Pedido creado en BD antes de abrir WhatsApp
- [x] Stock validado al crear pedido
- [x] ADMIN puede cambiar estado de pedido
- [x] Carrito persiste durante la sesión
- [ ] Catálogo funciona perfectamente en móvil

**Riesgos:**
- Stock reservation para pedidos pendientes: se decide NO implementar en MVP → documentar la decisión
- WhatsApp link funciona diferente en iOS vs Android → probar en ambos

---

## Fase 6 — Finance

**Objetivo:** Dashboard y análisis financiero básico.

**Duración estimada:** 1–2 semanas

**Módulos:**
- Dashboard con KPIs
- Ventas del día / semana / mes / año
- Ganancia y margen
- Ticket promedio
- Ventas por método de pago
- Ventas por canal (físico vs online)
- Ventas por promotora

**Dependencias:** Fases 4 y 5 completadas

**Criterios de completitud:**
- [ ] Dashboard carga en < 2 segundos
- [x] KPIs son correctos y verificables
- [ ] Gráficos legibles en móvil
- [ ] Filtro por período funciona

**Riesgos:**
- Queries de agregación pueden ser lentas con datos grandes → agregar índices y considerar vistas materializadas si es necesario

---

## Fase 7 — Reports & Intelligence

**Objetivo:** Reportes avanzados e inteligencia de inventario.

**Duración estimada:** 1–2 semanas

**Módulos:**
- Top productos vendidos
- Productos de baja rotación
- Productos sin movimiento
- Análisis de rotación (HIGH/MEDIUM/LOW/NONE)
- Recomendaciones de reposición
- Reporte semanal completo
- Ventas por promotora (detallado)
- Exportación básica (CSV/PDF diferido)

**Dependencias:** Fase 6 completada

**Criterios de completitud:**
- [ ] Análisis de rotación es correcto y verificable
- [ ] Recomendaciones basadas en stock mínimo + velocidad de venta
- [ ] Reporte semanal genera correctamente
- [ ] Datos correctos para el período seleccionado

---

## Fase 8 — PWA & Notifications

**Objetivo:** Experiencia tipo app nativa y notificaciones.

**Duración estimada:** 1–2 semanas

**Módulos:**
- PWA: manifest, service worker, instalación
- Cache de assets estáticos
- Notificaciones in-app (stock bajo, nuevo pedido)
- Preparación para Push Notifications (base)
- Evaluación de modo offline básico

**Dependencias:** Fase 7 completada

**Criterios de completitud:**
- [ ] App instalable en Android e iOS
- [ ] Assets en caché (carga sin internet inicial)
- [ ] Notificaciones in-app funcionan
- [ ] Lighthouse PWA score > 80

---

## MVP mínimo viable (Fases 1–5)

El MVP incluye las fases 1 a 5. Con esto Queen Style puede operar:

```
✓ Autenticación y roles
✓ Gestión de productos e imágenes
✓ Control de inventario con trazabilidad
✓ Ventas físicas con promotoras
✓ Catálogo público
✓ Pedidos online con WhatsApp
✓ Dashboard básico (Fase 6 parcial)
```

---

## Riesgos técnicos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Configuración compleja de monorepo | Media | Medio | Usar npm workspaces simple, sin herramientas adicionales |
| Storage provider no disponible en dev | Alta | Bajo | Emular con almacenamiento local durante desarrollo |
| QR no funciona en todos los móviles | Media | Alto | Probar en dispositivos reales en Fase 3 |
| Race condition en stock | Baja | Alto | Pessimistic lock implementado desde Fase 3 |
| Queries lentas en reportes | Media | Medio | Índices desde Fase 0, vistas si es necesario |
| WhatsApp link diferente en iOS/Android | Alta | Bajo | Probar en ambos y usar `wa.me` que es universal |
| Complejidad de upload de imágenes | Media | Medio | Implementar con almacenamiento local primero, migrar a S3/R2 |

---

## Estrategia de escalabilidad futura

El sistema está diseñado para soportar estas expansiones sin reescritura:

- **Multi-sucursal:** Agregar `locationId` a Inventory e InventoryMovement
- **Variantes de productos:** Agregar modelo `ProductVariant`
- **Promociones:** Agregar modelo `Promotion` con reglas
- **CRM avanzado:** Expandir modelo `Customer`
- **Roles adicionales:** Solo agregar al enum `Role` y decorar endpoints
- **Microservicios:** NestJS permite extraer módulos a servicios independientes
- **Contabilidad:** Expandir módulo Finance con transacciones detalladas

---

*Generado en Fase 0 — Planning. Sujeto a aprobación antes de implementación.*

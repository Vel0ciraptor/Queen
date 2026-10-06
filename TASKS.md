# TASKS.md — Queen Style ERP

## Lista de tareas ejecutables por fase

---

> Cada tarea es pequeña y ejecutable de forma independiente (o con dependencias claras).
> Estado: `[ ]` pendiente · `[x]` completada · `[-]` bloqueada

---

# FASE 1 — Foundation

---

## TASK-001

**ID:** TASK-001
**Nombre:** Inicializar monorepo

**Objetivo:** Crear la estructura base del repositorio con npm workspaces.

**Dependencias:** Ninguna

**Archivos afectados:**
- `/package.json` (root)
- `/apps/` (directorio)
- `/packages/shared/` (directorio)
- `.gitignore`
- `.env.example`

**Descripción:**
Crear estructura monorepo:
```
queen-style/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── package.json
└── .gitignore
```
Configurar `package.json` root con workspaces de npm.

**Criterios de aceptación:**
- [x] `npm install` desde root instala dependencias de todos los workspaces
- [x] `.gitignore` incluye `node_modules`, `dist`, `.env`, `*.log`
- [x] `.env.example` creado con todas las variables necesarias sin valores reales

**Pruebas:** `npm install` sin errores

---

## TASK-002

**ID:** TASK-002
**Nombre:** Inicializar backend NestJS

**Objetivo:** Crear API NestJS con TypeScript funcional.

**Dependencias:** TASK-001

**Archivos afectados:**
- `apps/api/`

**Descripción:**
```bash
cd apps/api
npx @nestjs/cli new . --package-manager npm --skip-git
```
Configurar:
- TypeScript strict mode
- Estructura de carpetas según ARCHITECTURE.md
- ValidationPipe global
- CORS
- Helmet
- Variables de entorno con `@nestjs/config`

**Criterios de aceptación:**
- [x] `npm run start:dev` inicia sin errores
- [x] `GET /api/v1/health` responde `{ "status": "ok" }`
- [x] TypeScript compila sin errores
- [x] Variables de entorno cargan correctamente

**Pruebas:**
```
GET http://localhost:3000/api/v1/health
→ 200 { "status": "ok" }
```

---

## TASK-003

**ID:** TASK-003
**Nombre:** Inicializar frontend React

**Objetivo:** Crear aplicación React con Vite y TypeScript.

**Dependencias:** TASK-001

**Archivos afectados:**
- `apps/web/`

**Descripción:**
```bash
cd apps/web
npm create vite@latest . -- --template react-ts
```
Configurar:
- Estructura de carpetas según ARCHITECTURE.md
- Path aliases (`@/` → `src/`)
- ESLint + Prettier
- Instalar: React Router v6, TanStack Query, Zustand

**Criterios de aceptación:**
- [x] `npm run dev` inicia sin errores en puerto 5173
- [x] TypeScript compila sin errores
- [x] Path alias `@/` funciona
- [x] Hot Module Replacement funciona

**Pruebas:** App carga en `http://localhost:5173`

---

## TASK-004

**ID:** TASK-004
**Nombre:** Configurar PostgreSQL con Docker Compose

**Objetivo:** Base de datos PostgreSQL disponible localmente.

**Dependencias:** TASK-001

**Archivos afectados:**
- `/docker-compose.yml`
- `apps/api/.env`

**Descripción:**
Crear `docker-compose.yml`:
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: queen_style_db
      POSTGRES_USER: queen_user
      POSTGRES_PASSWORD: queen_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

**Criterios de aceptación:**
- [ ] `docker-compose up -d` inicia PostgreSQL sin errores
- [ ] Conexión desde cliente (DBeaver/psql) funciona
- [ ] `DATABASE_URL` en `.env` conecta correctamente

**Pruebas:** `psql -h localhost -U queen_user -d queen_style_db`

---

## TASK-005

**ID:** TASK-005
**Nombre:** Configurar Prisma ORM

**Objetivo:** Prisma conectado a PostgreSQL con schema inicial.

**Dependencias:** TASK-002, TASK-004

**Archivos afectados:**
- `apps/api/prisma/schema.prisma`
- `apps/api/src/database/`

**Descripción:**
```bash
cd apps/api
npm install prisma @prisma/client
npx prisma init
```
Copiar schema completo de `DATABASE.md` al `schema.prisma`.
Ejecutar primera migración:
```bash
npx prisma migrate dev --name init
```
Crear `PrismaService` en NestJS e inyectarlo globalmente.

**Criterios de aceptación:**
- [ ] Migración ejecuta sin errores
- [ ] Todas las tablas creadas correctamente
- [x] `PrismaService` inyectable en cualquier módulo
- [ ] `prisma studio` muestra las tablas

**Pruebas:**
```bash
npx prisma studio
```
Verificar todas las tablas del schema.

---

## TASK-006

**ID:** TASK-006
**Nombre:** Módulo de autenticación — backend

**Objetivo:** Sistema de login/logout/refresh con JWT.

**Dependencias:** TASK-005

**Archivos afectados:**
- `apps/api/src/modules/auth/`

**Descripción:**
Implementar:
- `POST /api/v1/auth/login` — validar credenciales, emitir JWT
- `POST /api/v1/auth/refresh` — rotar access token via cookie
- `POST /api/v1/auth/logout` — limpiar cookie
- `GET /api/v1/auth/me` — usuario autenticado

Dependencias npm:
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/bcrypt @types/passport-jwt
```

**Criterios de aceptación:**
- [x] Login con credenciales correctas retorna access token
- [x] Login con credenciales incorrectas retorna 401
- [x] Access token expira en 15 minutos
- [x] Refresh token en httpOnly cookie expira en 7 días
- [x] `GET /api/v1/auth/me` requiere token válido
- [x] Logout limpia la cookie de refresh token
- [x] Contraseñas hasheadas con bcrypt (cost 12)

**Pruebas:**
```
POST /api/v1/auth/login { email, password } → 200 + token
POST /api/v1/auth/login { email, wrongPassword } → 401
GET  /api/v1/auth/me (sin token) → 401
GET  /api/v1/auth/me (con token) → 200 + user
```

---

## TASK-007

**ID:** TASK-007
**Nombre:** Módulo de usuarios — backend

**Objetivo:** CRUD de usuarios con roles.

**Dependencias:** TASK-006

**Archivos afectados:**
- `apps/api/src/modules/users/`

**Descripción:**
Implementar:
- `GET /api/v1/users` — listar usuarios (ADMIN)
- `POST /api/v1/users` — crear usuario (ADMIN)
- `GET /api/v1/users/:id` — obtener usuario (ADMIN)
- `PATCH /api/v1/users/:id` — actualizar usuario (ADMIN)
- `PATCH /api/v1/users/:id/deactivate` — desactivar (ADMIN)

Implementar `RolesGuard` y decorador `@Roles()`.
Seed de usuario ADMIN inicial.

**Criterios de aceptación:**
- [x] Solo ADMIN puede listar y crear usuarios
- [x] PROMOTORA no puede acceder a `GET /api/v1/users` → 403
- [x] Email único: duplicado retorna 409
- [x] Contraseña hasheada antes de guardar
- [x] No se devuelve `password` en ninguna respuesta
- [x] Seed crea usuario admin@queenstyle.com / Admin123!

**Pruebas:**
```
POST /api/v1/users (ADMIN token) → 201
POST /api/v1/users (PROMOTORA token) → 403
POST /api/v1/users { email duplicado } → 409
```

---

## TASK-008

**ID:** TASK-008
**Nombre:** Design System — estilos base

**Objetivo:** Sistema de diseño con tokens, tipografía y componentes base.

**Dependencias:** TASK-003

**Archivos afectados:**
- `apps/web/src/styles/`
- `apps/web/src/components/ui/`

**Descripción:**
Implementar en CSS moderno:
- Variables CSS (tokens): colores, espaciado, radios, sombras, tipografía
- Paleta Queen Style: `#FFBFB6`, `#E74656`, `#D90E75` + variantes
- Dark Mode / Light Mode / System Mode con `prefers-color-scheme`
- Glassmorphism: clases para blur, transparencia, bordes suaves
- Tipografía: Google Fonts (Inter o Outfit)
- Componentes base: Button, Input, Card, Badge, Modal skeleton

**Criterios de aceptación:**
- [x] Tokens CSS definidos para colores, espaciado, tipografía
- [ ] Dark mode funciona con toggle y con sistema
- [x] Glassmorphism visible en cards y modals
- [x] Componentes base responsvios
- [x] Sin dependencias de CSS frameworks externos (solo CSS nativo)

**Pruebas:** Revisión visual en Chrome DevTools (móvil 390px, tablet, desktop)

---

## TASK-009

**ID:** TASK-009
**Nombre:** Layouts de la aplicación

**Objetivo:** Layouts para Admin ERP, Catálogo público y Auth.

**Dependencias:** TASK-003, TASK-008

**Archivos afectados:**
- `apps/web/src/components/layout/`
- `apps/web/src/routes/`

**Descripción:**
Implementar:
- `AdminLayout`: Sidebar (desktop), Bottom nav (móvil), Header
- `CatalogLayout`: Header con carrito, navegación móvil
- `AuthLayout`: Centrado, logo, formulario
- React Router con rutas protegidas por rol

**Criterios de aceptación:**
- [ ] AdminLayout: sidebar en desktop, bottom nav en móvil
- [x] Rutas protegidas redirigen a login si no hay token
- [x] Rutas de ADMIN redirigen si es PROMOTORA
- [ ] Transiciones suaves entre páginas
- [ ] Layouts responsvios desde 360px

**Pruebas:** Navegar por todas las rutas en móvil y desktop

---

## TASK-010

**ID:** TASK-010
**Nombre:** Páginas de autenticación — frontend

**Objetivo:** Login funcional conectado al backend.

**Dependencias:** TASK-006, TASK-009

**Archivos afectados:**
- `apps/web/src/features/auth/`

**Descripción:**
Implementar:
- Página de Login con validación
- Integración con `POST /api/v1/auth/login`
- Almacenar access token en memoria (Zustand)
- Interceptor Axios para renovar token automáticamente
- Logout limpia estado y redirige

**Criterios de aceptación:**
- [x] Login exitoso redirige a dashboard
- [x] Login fallido muestra error descriptivo
- [x] Token se renueva automáticamente al expirar
- [x] Logout elimina token y redirige a login
- [ ] Formulario responsivo en móvil
- [x] Estados de loading mientras hace request

**Pruebas:**
- Login con credenciales correctas → dashboard
- Login con credenciales incorrectas → mensaje de error
- Sesión expira → se renueva automáticamente

---

# FASE 2 — Products

---

## TASK-011

**ID:** TASK-011
**Nombre:** Módulo de categorías — backend

**Objetivo:** CRUD de categorías en API.

**Dependencias:** TASK-007

**Archivos afectados:**
- `apps/api/src/modules/categories/`

**Criterios de aceptación:**
- [x] CRUD completo funcionando
- [x] Nombre único: duplicado retorna 409
- [x] Solo ADMIN puede crear/editar/eliminar categorías
- [x] Todos los roles pueden listar categorías

---

## TASK-012

**ID:** TASK-012
**Nombre:** Módulo de productos — backend

**Objetivo:** CRUD completo de productos.

**Dependencias:** TASK-011

**Archivos afectados:**
- `apps/api/src/modules/products/`

**Criterios de aceptación:**
- [x] CRUD completo funcionando
- [x] SKU único: duplicado retorna 409
- [x] Crear producto crea automáticamente su Inventory con stock inicial
- [x] Búsqueda por nombre y SKU funciona
- [x] Paginación correcta
- [x] Soft delete funciona (status INACTIVE)
- [x] Producto con historial de ventas no se puede eliminar físicamente

---

## TASK-013

**ID:** TASK-013
**Nombre:** Upload de imágenes de productos

**Objetivo:** Subir imágenes a storage externo y guardar URL.

**Dependencias:** TASK-012

**Archivos afectados:**
- `apps/api/src/modules/products/`
- `apps/api/src/services/storage.service.ts`

**Descripción:**
Implementar `StorageService` con interfaz abstracta.
Para desarrollo: almacenamiento local en `uploads/`.
Para producción: implementación S3/R2.

**Criterios de aceptación:**
- [x] Upload de imagen retorna URL accesible
- [x] Imagen se convierte a WebP antes de guardar
- [x] Máximo 5 imágenes por producto
- [x] Una imagen principal por producto
- [x] Eliminar imagen borra del storage y de BD

---

## TASK-014

**ID:** TASK-014
**Nombre:** Gestión de productos — frontend

**Objetivo:** UI de CRUD de productos en el ERP.

**Dependencias:** TASK-010, TASK-012, TASK-013

**Archivos afectados:**
- `apps/web/src/features/products/`

**Criterios de aceptación:**
- [x] Listado con filtros (categoría, estado, búsqueda)
- [x] Formulario de creación/edición con validaciones
- [ ] Upload de imágenes con preview
- [ ] Tabla/grid responsivo en móvil
- [x] Confirmación antes de desactivar

---

## TASK-015

**ID:** TASK-015
**Nombre:** Gestión de categorías — frontend

**Objetivo:** UI de CRUD de categorías.

**Dependencias:** TASK-010, TASK-011

**Archivos afectados:**
- `apps/web/src/features/categories/`

**Criterios de aceptación:**
- [x] Listado de categorías
- [x] Crear y editar categorías
- [x] Confirmación antes de desactivar

---

# FASE 3 — Inventory

---

## TASK-016

**ID:** TASK-016
**Nombre:** Módulo de inventario — backend

**Objetivo:** Control de stock con movimientos e historial.

**Dependencias:** TASK-012

**Archivos afectados:**
- `apps/api/src/modules/inventory/`

**Criterios de aceptación:**
- [x] Consultar stock actual de cualquier producto
- [x] Registrar movimiento manual con auditoría
- [x] Stock nunca puede ser negativo (constraint + validación)
- [x] Historial de movimientos paginado
- [ ] Pessimistic lock implementado en movimientos de SALE

---

## TASK-017

**ID:** TASK-017
**Nombre:** Sistema QR — backend

**Objetivo:** Generar y resolver códigos QR de productos.

**Dependencias:** TASK-016

**Archivos afectados:**
- `apps/api/src/modules/qr/`

**Descripción:**
Usar librería `qrcode` para generar imagen PNG/SVG del QR.
El valor del QR = SKU del producto.

**Criterios de aceptación:**
- [x] `POST /api/v1/qr/generate/:productId` genera QR
- [x] `GET /api/v1/qr/scan/:code` retorna el producto completo
- [ ] QR generado es escaneable con cámara de móvil

---

## TASK-018

**ID:** TASK-018
**Nombre:** Inventario y QR — frontend

**Objetivo:** UI de inventario y escáner QR.

**Dependencias:** TASK-014, TASK-016, TASK-017

**Archivos afectados:**
- `apps/web/src/features/inventory/`

**Criterios de aceptación:**
- [x] Vista de inventario con alertas de stock bajo
- [x] Formulario de ajuste manual de inventario
- [x] Historial de movimientos por producto
- [x] Generación y visualización de QR por producto
- [ ] Escáner de QR desde cámara del celular
- [ ] Escanear QR → navegar al producto

---

# FASE 4 — Physical Sales

---

## TASK-019

**ID:** TASK-019
**Nombre:** Módulo de ventas físicas — backend

**Objetivo:** Registrar ventas con transacciones atómicas.

**Dependencias:** TASK-016

**Archivos afectados:**
- `apps/api/src/modules/sales/`

**Criterios de aceptación:**
- [x] Crear venta en transacción atómica (sale + items + inventory + payment)
- [ ] Stock validado con lock antes de confirmar
- [x] Precios históricos guardados en SaleItem
- [x] Cancelación devuelve stock correctamente
- [x] PROMOTORA ve solo sus ventas
- [x] ADMIN ve todas las ventas

---

## TASK-020

**ID:** TASK-020
**Nombre:** Módulo de clientes — backend

**Objetivo:** CRUD de clientes.

**Dependencias:** TASK-007

**Archivos afectados:**
- `apps/api/src/modules/customers/`

**Criterios de aceptación:**
- [x] Crear cliente con teléfono único
- [x] Buscar cliente por nombre o teléfono
- [x] Historial de compras del cliente

---

## TASK-021

**ID:** TASK-021
**Nombre:** Flujo de venta física — frontend

**Objetivo:** UI completa para registrar ventas desde móvil.

**Dependencias:** TASK-018, TASK-019, TASK-020

**Archivos afectados:**
- `apps/web/src/features/sales/`

**Criterios de aceptación:**
- [x] Buscar producto por nombre o SKU
- [x] Escanear QR → agregar automáticamente a la venta
- [x] Ajustar cantidades
- [x] Seleccionar cliente (opcional)
- [x] Seleccionar método de pago
- [x] Confirmar venta → feedback visual
- [x] Lista de ventas del día para promotora
- [ ] Funciona perfectamente en móvil 360px–412px

---

# FASE 5 — Catalog & Orders

---

## TASK-022

**ID:** TASK-022
**Nombre:** Módulo de pedidos — backend

**Objetivo:** Crear y gestionar pedidos online.

**Dependencias:** TASK-019, TASK-020

**Archivos afectados:**
- `apps/api/src/modules/orders/`

**Criterios de aceptación:**
- [x] Crear pedido valida precios y stock desde BD
- [x] Cliente creado automáticamente si no existe (por teléfono)
- [x] Pedido PENDING no modifica stock
- [ ] Cambio de estado a CONFIRMED genera movimiento de inventario
- [ ] Retorna URL de WhatsApp al crear pedido
- [x] ADMIN puede cambiar estado del pedido

---

## TASK-023

**ID:** TASK-023
**Nombre:** Catálogo público — frontend

**Objetivo:** Catálogo de productos para clientes.

**Dependencias:** TASK-014

**Archivos afectados:**
- `apps/web/src/features/catalog/`

**Criterios de aceptación:**
- [x] Home con categorías y productos destacados
- [x] Listado con filtros por categoría
- [x] Vista de detalle de producto
- [x] Diseño visualmente atractivo (glassmorphism, colores Queen Style)
- [ ] Mobile First, perfecto en 360px–412px
- [ ] Solo muestra productos ACTIVE con stock

---

## TASK-024

**ID:** TASK-024
**Nombre:** Carrito y checkout — frontend

**Objetivo:** Carrito de compras y flujo de pedido.

**Dependencias:** TASK-022, TASK-023

**Archivos afectados:**
- `apps/web/src/features/cart/`

**Criterios de aceptación:**
- [x] Agregar/eliminar productos del carrito
- [x] Cambiar cantidades
- [x] Total calculado en tiempo real
- [x] Checkout con datos del cliente
- [x] Al confirmar: pedido creado → abrir WhatsApp automáticamente
- [x] Página de confirmación de pedido

---

# FASE 6 — Finance

---

## TASK-025

**ID:** TASK-025
**Nombre:** Módulo de finanzas — backend

**Objetivo:** Queries de análisis financiero.

**Dependencias:** TASK-019, TASK-022

**Archivos afectados:**
- `apps/api/src/modules/finance/`

**Criterios de aceptación:**
- [x] Revenue total por período
- [x] Ganancia neta (revenue - cost)
- [x] Ticket promedio
- [x] Ventas por método de pago
- [x] Ventas por canal (Sale vs Order)
- [x] Ventas por promotora

---

## TASK-026

**ID:** TASK-026
**Nombre:** Dashboard — frontend

**Objetivo:** Dashboard con KPIs y gráficos.

**Dependencias:** TASK-025

**Archivos afectados:**
- `apps/web/src/features/dashboard/`

**Criterios de aceptación:**
- [ ] KPIs del día y la semana
- [x] Gráfico de ventas por tiempo
- [x] Top 5 productos más vendidos
- [x] Lista de stock bajo
- [x] Pedidos pendientes
- [ ] Carga en < 2 segundos
- [x] Responsivo en móvil

---

# FASE 7 — Reports

---

## TASK-027

**ID:** TASK-027
**Nombre:** Reportes e inteligencia de inventario — backend

**Objetivo:** Análisis de rotación y recomendaciones.

**Dependencias:** TASK-025

**Archivos afectados:**
- `apps/api/src/modules/reports/`

**Criterios de aceptación:**
- [x] Top productos por ventas en período
- [ ] Productos de baja rotación (sin ventas en X días)
- [ ] Análisis de rotación: HIGH/MEDIUM/LOW/NONE
- [ ] Recomendaciones de reposición basadas en stock mínimo + promedio de ventas
- [ ] Reporte semanal completo

---

## TASK-028

**ID:** TASK-028
**Nombre:** Reportes — frontend

**Objetivo:** UI de reportes y análisis.

**Dependencias:** TASK-026, TASK-027

**Archivos afectados:**
- `apps/web/src/features/reports/`

**Criterios de aceptación:**
- [x] Vista de inteligencia de inventario con alertas
- [ ] Reporte semanal visualizable
- [ ] Filtros por período
- [ ] Gráficos legibles en móvil

---

# FASE 8 — PWA & Notifications

---

## TASK-029

**ID:** TASK-029
**Nombre:** Configurar PWA

**Objetivo:** App instalable con service worker y caché.

**Dependencias:** TASK-028

**Archivos afectados:**
- `apps/web/vite.config.ts`
- `apps/web/public/manifest.json`

**Criterios de aceptación:**
- [ ] App instalable en Android e iOS (Add to Home Screen)
- [ ] Assets estáticos en caché (carga sin internet inicial)
- [ ] Manifest con íconos y nombre correcto
- [ ] Lighthouse PWA score > 80

---

## TASK-030

**ID:** TASK-030
**Nombre:** Sistema de notificaciones in-app

**Objetivo:** Notificaciones dentro de la aplicación.

**Dependencias:** TASK-007

**Archivos afectados:**
- `apps/api/src/modules/notifications/`
- `apps/web/src/features/notifications/`

**Criterios de aceptación:**
- [ ] Notificaciones de stock bajo generadas automáticamente
- [x] Notificaciones de nuevo pedido
- [x] Campana con contador en el header
- [x] Marcar como leída funciona
- [x] Marcar todas como leídas funciona

---

## Resumen de tareas por fase

| Fase | Tareas | Estimación |
|---|---|---|
| Fase 0 — Planning | Completada | ✅ |
| Fase 1 — Foundation | TASK-001 al TASK-010 | 2–3 semanas |
| Fase 2 — Products | TASK-011 al TASK-015 | 1–2 semanas |
| Fase 3 — Inventory | TASK-016 al TASK-018 | 1–2 semanas |
| Fase 4 — Physical Sales | TASK-019 al TASK-021 | 2 semanas |
| Fase 5 — Catalog | TASK-022 al TASK-024 | 2–3 semanas |
| Fase 6 — Finance | TASK-025 al TASK-026 | 1–2 semanas |
| Fase 7 — Reports | TASK-027 al TASK-028 | 1–2 semanas |
| Fase 8 — PWA | TASK-029 al TASK-030 | 1–2 semanas |

**Total estimado:** 12–18 semanas para sistema completo

---

*Generado en Fase 0 — Planning. Sujeto a aprobación antes de implementación.*

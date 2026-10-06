# ARCHITECTURE.md — Queen Style ERP

## Decisiones de arquitectura y justificación técnica

---

## 1. Visión general

Queen Style ERP se construye como un sistema de dos experiencias principales sobre una única fuente de datos:

```
┌─────────────────────────────────────────────────────┐
│                  QUEEN STYLE SYSTEM                 │
├──────────────────────┬──────────────────────────────┤
│   CATÁLOGO PÚBLICO   │       ERP ADMINISTRATIVO     │
│   (clientes)         │   (admin / promotoras)       │
└──────────┬───────────┴──────────────┬───────────────┘
           │                          │
           └────────────┬─────────────┘
                        ▼
              REST API (NestJS + TypeScript)
                        │
                        ▼
              PostgreSQL + Prisma ORM
                        │
              ┌─────────┴──────────┐
              │                    │
          Storage (S3/R2)     AuditLogs
```

---

## 2. Stack tecnológico seleccionado

### 2.1 Frontend

| Tecnología | Versión objetivo | Justificación |
|---|---|---|
| React | 18+ | Ecosistema maduro, concurrent features |
| TypeScript | 5+ | Tipado estático, menos bugs en runtime |
| Vite | 5+ | Build rápido, HMR excelente |
| React Router v6 | 6+ | Routing declarativo, loaders/actions nativos |
| TanStack Query | 5+ | Cache de servidor, sincronización automática |
| Zustand | 4+ | Estado global ligero; Redux es excesivo para este tamaño |
| PWA (Vite PWA Plugin) | — | Manifest, Service Worker, instalación |

**Por qué Zustand y no Redux:** El sistema no necesita time-travel debugging ni middlewares complejos. Zustand tiene 1/10 del boilerplate y es suficiente para estado de UI.

### 2.2 Backend

| Tecnología | Versión objetivo | Justificación |
|---|---|---|
| **NestJS** | 10+ | **Seleccionado sobre Express** |
| TypeScript | 5+ | Compartir tipos con frontend |
| Prisma ORM | 5+ | Type-safety end-to-end, migraciones declarativas |
| PostgreSQL | 16+ | ACID, soporte para JSON, índices avanzados |
| JWT + Refresh Tokens | — | Stateless auth, escalable |
| Bcrypt | — | Hash de contraseñas |
| class-validator | — | Validación de DTOs integrada en NestJS |

**Por qué NestJS sobre Express:**
- Arquitectura modular nativa alineada con los requisitos
- Pipes de validación automáticos con class-validator
- Guards para autorización por roles integrados
- Documentación Swagger nativa
- Escalable: puede migrar a microservicios con el mismo código base

### 2.3 Storage de imágenes

El backend actúa como proxy de upload. El frontend nunca habla directamente al storage.

```
Frontend → POST /api/products/:id/images → Backend → Storage (S3/R2)
                                                              ↓
                                                       URL en PostgreSQL
```

Provider inicial recomendado: Cloudflare R2 (sin egress fees).
El backend abstrae el provider con un `StorageService` inyectable.

---

## 3. Separación de responsabilidades

```
Frontend (React)
  └── Solo renderiza y envía requests
  └── NUNCA modifica BD directamente
  └── NUNCA confía en precios del cliente

API (NestJS)
  └── Valida todos los inputs (DTOs + class-validator)
  └── Verifica roles y permisos (Guards)
  └── Ejecuta business logic
  └── Controla transacciones SQL
  └── Consulta precio y stock reales antes de confirmar venta

Base de datos (PostgreSQL)
  └── Fuente única de verdad
  └── Constraints de integridad referencial
  └── Transacciones ACID
  └── Índices para performance

Storage
  └── Solo almacena binarios de imágenes
  └── Devuelve URLs públicas o pre-signed

External Services
  └── WhatsApp (generación de link, no dependencia de datos)
```

---

## 4. Estructura del proyecto (monorepo ligero)

```
queen-style/
│
├── apps/
│   ├── web/                    ← Frontend React (Vite)
│   └── api/                    ← Backend NestJS
│
├── packages/
│   └── shared/                 ← Tipos TypeScript compartidos
│       ├── types/
│       └── constants/
│
├── docker-compose.yml
├── .env.example
└── README.md
```

### 4.1 Frontend (apps/web/src/)

```
src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
│
├── components/
│   ├── ui/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Card/
│   │   └── Badge/
│   └── layout/
│       ├── AdminLayout/
│       ├── CatalogLayout/
│       └── AuthLayout/
│
├── features/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── orders/
│   ├── customers/
│   ├── finance/
│   ├── reports/
│   ├── dashboard/
│   ├── catalog/
│   └── cart/
│
├── hooks/
├── services/
├── stores/
├── types/
├── utils/
├── styles/
└── routes/
```

### 4.2 Backend (apps/api/src/)

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   └── guards/
│   ├── users/
│   ├── products/
│   ├── categories/
│   ├── inventory/
│   ├── qr/
│   ├── customers/
│   ├── sales/
│   ├── orders/
│   ├── payments/
│   ├── finance/
│   ├── reports/
│   ├── notifications/
│   └── audit/
│
├── database/prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── middleware/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   └── guards/
│
└── config/
```

---

## 5. Arquitectura de autenticación

```
POST /api/auth/login
        ↓
   Validar credenciales (bcrypt)
        ↓
   Access Token (JWT, 15min) + Refresh Token (httpOnly cookie, 7d)
        ↓
   Frontend almacena Access Token en memoria (NO localStorage)
        ↓
   Requests: Authorization: Bearer <access_token>
        ↓
   Token expirado → POST /api/auth/refresh → Nuevo Access Token
```

**Por qué NO localStorage:** XSS puede robar tokens de localStorage. Memoria + httpOnly cookie es el patrón más seguro para SPAs.

---

## 6. Control de acceso por roles (RBAC)

```typescript
enum Role {
  ADMIN = 'ADMIN',
  PROMOTORA = 'PROMOTORA',
}

@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete('/products/:id')
deleteProduct() { ... }
```

La arquitectura permite agregar nuevos roles sin cambiar los guards.

---

## 7. Estrategia de concurrencia en inventario

**Problema:** Dos usuarios compran el último producto simultáneamente.

**Solución:** Pessimistic locking con `SELECT ... FOR UPDATE` dentro de transacción:

```sql
BEGIN;
SELECT stock FROM inventory WHERE product_id = $1 FOR UPDATE;
-- Validar stock >= cantidad
INSERT INTO inventory_movements ...;
UPDATE inventory SET stock = stock - $cantidad WHERE product_id = $1;
COMMIT;
```

No se usa stock reservation en MVP (evaluar en Fase 5 si el volumen lo justifica).

---

## 8. Trazabilidad de inventario

El stock actual = suma de todos los movimientos (inmutables):

```
stock_actual = SUM(quantity) WHERE product_id = X
  PURCHASE:   +N
  SALE:       -N
  RETURN:     +N
  ADJUSTMENT: ±N
  LOSS:       -N
  DAMAGE:     -N
```

---

## 9. Seguridad — checklist

| Medida | Implementación |
|---|---|
| Password hashing | bcrypt (cost 12) |
| Auth tokens | JWT Access 15min + Refresh httpOnly cookie 7d |
| Rate limiting | @nestjs/throttler — 100 req/min por IP |
| Input validation | class-validator + ValidationPipe global |
| SQL injection | Prisma ORM (parametrizado) |
| XSS | Helmet headers |
| CORS | Dominios explícitos |
| Audit logs | Operaciones críticas → AuditLog |
| Soft delete | Productos con historial → INACTIVE, no DELETE |

---

## 10. Performance — estrategia

| Área | Estrategia |
|---|---|
| Queries | Prisma select explícito, includes controlados |
| N+1 | Prisma include para relaciones necesarias |
| Paginación | Cursor-based para listas grandes |
| Cache frontend | TanStack Query (staleTime por recurso) |
| Imágenes | WebP obligatorio, thumbnails para listados |
| Bundle | Vite code splitting por feature/route |
| API responses | Formato uniforme: `{ data, meta, error }` |

---

## 11. Deployment inicial

```
VPS / Cloud VM
└── Docker Compose
    ├── PostgreSQL (container)
    ├── NestJS API (container)
    ├── React SPA (NGINX)
    └── NGINX (reverse proxy + SSL)
```

Backups: `pg_dump` diario, retención 30 días, restauración mensual probada.

---

## 12. Decisiones pendientes de aprobación

| Decisión | Propuesta | Alternativa |
|---|---|---|
| Storage provider | Cloudflare R2 | AWS S3 |
| Deploy inicial | VPS + Docker Compose | Render / Railway |
| Email provider | Resend | SendGrid |
| Monorepo tooling | npm workspaces | Nx / Turborepo |

---

*Generado en Fase 0 — Planning. Sujeto a aprobación antes de implementación.*

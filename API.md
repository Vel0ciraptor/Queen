# API.md — Queen Style ERP

## Diseño de API REST

---

## Convenciones generales

- Base URL: `/api/v1`
- Autenticación: `Authorization: Bearer <access_token>` (excepto endpoints públicos)
- Content-Type: `application/json`
- Respuesta exitosa: `{ "data": ..., "meta": ... }`
- Respuesta de error: `{ "error": { "code": "...", "message": "...", "details": [...] } }`

### Códigos de error estándar

| Código | HTTP Status | Significado |
|---|---|---|
| UNAUTHORIZED | 401 | Token inválido o ausente |
| FORBIDDEN | 403 | Sin permisos para el recurso |
| NOT_FOUND | 404 | Recurso no existe |
| VALIDATION_ERROR | 422 | Fallo de validación de inputs |
| CONFLICT | 409 | Conflicto (ej: SKU duplicado) |
| INSUFFICIENT_STOCK | 409 | Stock insuficiente para la operación |
| INTERNAL_ERROR | 500 | Error interno del servidor |

### Paginación

```json
GET /api/v1/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc

{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## AUTH `/api/v1/auth`

### POST `/api/v1/auth/login`
Autenticar usuario.

**Auth:** No requerida

**Body:**
```json
{
  "email": "admin@queenstyle.com",
  "password": "securePassword123"
}
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "name": "Oscar Admin",
      "email": "admin@queenstyle.com",
      "role": "ADMIN"
    }
  }
}
```

**Errors:** 401 credenciales inválidas, 422 validación

---

### POST `/api/v1/auth/refresh`
Renovar access token usando refresh token (cookie httpOnly).

**Auth:** Cookie `refreshToken` (automática)

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJhbGci..."
  }
}
```

**Errors:** 401 refresh token inválido/expirado

---

### POST `/api/v1/auth/logout`
Invalidar sesión.

**Auth:** Bearer Token

**Response 200:**
```json
{ "data": { "message": "Logout exitoso" } }
```

---

### GET `/api/v1/auth/me`
Obtener usuario autenticado.

**Auth:** Bearer Token

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Oscar Admin",
    "email": "admin@queenstyle.com",
    "role": "ADMIN",
    "isActive": true
  }
}
```

---

## USERS `/api/v1/users`

### GET `/api/v1/users`
Listar usuarios.

**Auth:** ADMIN

**Query:** `page`, `limit`, `role`, `isActive`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "María López",
      "email": "maria@queenstyle.com",
      "role": "PROMOTORA",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### POST `/api/v1/users`
Crear usuario.

**Auth:** ADMIN

**Body:**
```json
{
  "name": "María López",
  "email": "maria@queenstyle.com",
  "password": "temporal123",
  "role": "PROMOTORA"
}
```

**Response 201:** Usuario creado

**Errors:** 409 email duplicado, 422 validación

---

### GET `/api/v1/users/:id`
Obtener usuario por ID.

**Auth:** ADMIN

**Response 200:** Datos del usuario

---

### PATCH `/api/v1/users/:id`
Actualizar usuario.

**Auth:** ADMIN

**Body:** Campos parciales del usuario

**Response 200:** Usuario actualizado

---

### PATCH `/api/v1/users/:id/deactivate`
Desactivar usuario (soft delete).

**Auth:** ADMIN

**Response 200:** Usuario desactivado

---

## CATEGORIES `/api/v1/categories`

### GET `/api/v1/categories`
Listar categorías.

**Auth:** Bearer Token (cualquier rol) / Público para catálogo

**Response 200:**
```json
{
  "data": [
    { "id": "uuid", "name": "Anillos", "description": "...", "isActive": true }
  ]
}
```

---

### POST `/api/v1/categories`
Crear categoría.

**Auth:** ADMIN

**Body:** `{ "name": "Collares", "description": "..." }`

**Response 201:** Categoría creada

**Errors:** 409 nombre duplicado

---

### PATCH `/api/v1/categories/:id`
Actualizar categoría.

**Auth:** ADMIN

---

### DELETE `/api/v1/categories/:id`
Desactivar categoría.

**Auth:** ADMIN

---

## PRODUCTS `/api/v1/products`

### GET `/api/v1/products`
Listar productos.

**Auth:** Bearer Token

**Query:** `page`, `limit`, `categoryId`, `status`, `search` (nombre/SKU), `sortBy`, `sortOrder`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sku": "QS-00001",
      "name": "Anillo Aurora",
      "category": { "id": "uuid", "name": "Anillos" },
      "salePrice": "45.00",
      "costPrice": "18.00",
      "status": "ACTIVE",
      "stock": 12,
      "primaryImage": "https://storage.example.com/products/qs-00001.webp"
    }
  ],
  "meta": { "page": 1, "total": 80 }
}
```

---

### POST `/api/v1/products`
Crear producto.

**Auth:** ADMIN

**Body:**
```json
{
  "sku": "QS-00001",
  "name": "Anillo Aurora",
  "description": "Anillo plateado con cristal",
  "categoryId": "uuid",
  "costPrice": 18.00,
  "salePrice": 45.00,
  "stockMin": 5,
  "stockMax": 50,
  "initialStock": 20
}
```

**Response 201:** Producto + inventario creados en transacción

**Errors:** 409 SKU duplicado, 422 validación

---

### GET `/api/v1/products/:id`
Obtener producto por ID.

**Auth:** Bearer Token / Público para catálogo

**Response 200:** Producto completo con imágenes, stock, categoría

---

### GET `/api/v1/products/sku/:sku`
Buscar producto por SKU (usado en QR scan).

**Auth:** Bearer Token

**Response 200:** Producto con stock actual

---

### PATCH `/api/v1/products/:id`
Actualizar producto.

**Auth:** ADMIN

**Body:** Campos parciales del producto

**Response 200:** Producto actualizado

---

### PATCH `/api/v1/products/:id/deactivate`
Desactivar producto (soft delete).

**Auth:** ADMIN

**Response 200:** Producto desactivado

---

### POST `/api/v1/products/:id/images`
Subir imagen de producto.

**Auth:** ADMIN

**Body:** `multipart/form-data` con campo `image`

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "url": "https://storage.example.com/products/qs-00001-1.webp",
    "isPrimary": false
  }
}
```

---

### DELETE `/api/v1/products/:id/images/:imageId`
Eliminar imagen de producto.

**Auth:** ADMIN

---

### PATCH `/api/v1/products/:id/images/:imageId/primary`
Establecer imagen principal.

**Auth:** ADMIN

---

## INVENTORY `/api/v1/inventory`

### GET `/api/v1/inventory`
Listar estado de inventario de todos los productos.

**Auth:** Bearer Token

**Query:** `page`, `limit`, `lowStock` (boolean), `outOfStock` (boolean), `categoryId`

**Response 200:**
```json
{
  "data": [
    {
      "productId": "uuid",
      "sku": "QS-00001",
      "name": "Anillo Aurora",
      "stock": 3,
      "stockMin": 5,
      "status": "LOW_STOCK",
      "recommendation": "REPOSICIÓN RECOMENDADA"
    }
  ]
}
```

---

### GET `/api/v1/inventory/:productId`
Stock actual de un producto.

**Auth:** Bearer Token

**Response 200:**
```json
{
  "data": {
    "productId": "uuid",
    "stock": 12,
    "stockMin": 5,
    "stockMax": 50,
    "lastMovement": "2024-01-20T15:30:00Z"
  }
}
```

---

### POST `/api/v1/inventory/:productId/movements`
Registrar movimiento de inventario manual.

**Auth:** ADMIN

**Body:**
```json
{
  "type": "ADJUSTMENT",
  "quantity": 10,
  "notes": "Conteo físico de inventario enero"
}
```

**Response 201:** Movimiento creado, stock actualizado

**Errors:** 409 stock insuficiente para movimiento negativo

---

### GET `/api/v1/inventory/:productId/movements`
Historial de movimientos de un producto.

**Auth:** ADMIN

**Query:** `page`, `limit`, `type`, `from`, `to` (fechas)

**Response 200:** Lista de movimientos con paginación

---

## QR `/api/v1/qr`

### POST `/api/v1/qr/generate/:productId`
Generar QR para un producto.

**Auth:** ADMIN

**Response 201:**
```json
{
  "data": {
    "productId": "uuid",
    "code": "QS-00001",
    "imageUrl": "https://storage.example.com/qr/qs-00001.png"
  }
}
```

---

### GET `/api/v1/qr/scan/:code`
Resolver QR escaneado → retorna el producto.

**Auth:** Bearer Token

**Response 200:** Producto completo con stock actual

---

## CUSTOMERS `/api/v1/customers`

### GET `/api/v1/customers`
Listar clientes.

**Auth:** Bearer Token

**Query:** `page`, `limit`, `search` (nombre/teléfono)

---

### POST `/api/v1/customers`
Crear cliente.

**Auth:** Bearer Token

**Body:**
```json
{
  "name": "Ana García",
  "phone": "+58412345678",
  "email": "ana@email.com",
  "address": "Av. Principal, Caracas"
}
```

**Response 201:** Cliente creado

**Errors:** 409 teléfono duplicado

---

### GET `/api/v1/customers/:id`
Obtener cliente con historial de compras.

**Auth:** Bearer Token

---

### PATCH `/api/v1/customers/:id`
Actualizar cliente.

**Auth:** Bearer Token

---

## SALES `/api/v1/sales`

### GET `/api/v1/sales`
Listar ventas.

**Auth:** ADMIN ve todas; PROMOTORA ve solo las suyas

**Query:** `page`, `limit`, `userId`, `status`, `from`, `to`, `paymentMethod`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "María" },
      "customer": { "id": "uuid", "name": "Ana" },
      "status": "COMPLETED",
      "total": "135.00",
      "paymentMethod": "EFECTIVO",
      "itemCount": 3,
      "createdAt": "2024-01-20T15:30:00Z"
    }
  ]
}
```

---

### POST `/api/v1/sales`
Crear venta física.

**Auth:** Bearer Token (cualquier rol)

**Body:**
```json
{
  "customerId": "uuid",
  "paymentMethod": "EFECTIVO",
  "notes": "",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ]
}
```

**Proceso interno (transacción):**
1. Validar stock disponible (con lock)
2. Consultar precio y costo reales de BD
3. Crear Sale
4. Crear SaleItems con precios históricos
5. Crear InventoryMovement (SALE)
6. Actualizar stock en Inventory
7. Crear Payment
8. Crear AuditLog
9. COMMIT

**Response 201:** Venta completa con items

**Errors:** 409 stock insuficiente, 422 producto no existe/inactivo

---

### GET `/api/v1/sales/:id`
Obtener venta por ID.

**Auth:** ADMIN o promotora dueña de la venta

**Response 200:** Venta completa con items, pagos, cliente, promotora

---

### PATCH `/api/v1/sales/:id/cancel`
Cancelar venta.

**Auth:** ADMIN

**Body:** `{ "reason": "..." }`

**Proceso interno:**
1. Cambiar status a CANCELLED
2. Crear InventoryMovement (RETURN) por cada item
3. Actualizar stock
4. Crear AuditLog

**Response 200:** Venta cancelada

---

## ORDERS `/api/v1/orders`

### GET `/api/v1/orders`
Listar pedidos.

**Auth:** ADMIN

**Query:** `page`, `limit`, `status`, `from`, `to`

---

### POST `/api/v1/orders`
Crear pedido online.

**Auth:** Público (catálogo)

**Body:**
```json
{
  "customer": {
    "name": "Ana García",
    "phone": "+58412345678",
    "email": "ana@email.com"
  },
  "items": [
    { "productId": "uuid", "quantity": 1 }
  ],
  "address": "Av. Principal, Caracas",
  "notes": "Entregar en la tarde"
}
```

**Proceso interno:**
1. Encontrar o crear Customer por teléfono
2. Consultar precios y stock reales desde BD
3. Calcular subtotal y total
4. Crear Order + OrderItems
5. Generar mensaje WhatsApp
6. Retornar Order + WhatsApp URL

**Response 201:**
```json
{
  "data": {
    "order": { "id": "uuid", "total": "90.00", "status": "PENDING" },
    "whatsappUrl": "https://wa.me/58412000000?text=..."
  }
}
```

---

### GET `/api/v1/orders/:id`
Obtener pedido.

**Auth:** ADMIN

---

### PATCH `/api/v1/orders/:id/status`
Actualizar estado del pedido.

**Auth:** ADMIN

**Body:** `{ "status": "CONFIRMED" }`

---

## FINANCE `/api/v1/finance`

### GET `/api/v1/finance/summary`
Resumen financiero.

**Auth:** ADMIN

**Query:** `from`, `to`, `period` (day|week|month|year)

**Response 200:**
```json
{
  "data": {
    "totalRevenue": "12500.00",
    "totalCost": "5200.00",
    "grossProfit": "7300.00",
    "profitMargin": 58.4,
    "totalOrders": 145,
    "averageTicket": "86.20",
    "byPaymentMethod": {
      "EFECTIVO": "6200.00",
      "TRANSFERENCIA": "4100.00",
      "QR": "2200.00"
    }
  }
}
```

---

### GET `/api/v1/finance/sales-by-period`
Ventas agrupadas por período.

**Auth:** ADMIN

**Query:** `period` (day|week|month), `from`, `to`

---

### GET `/api/v1/finance/by-channel`
Ventas por canal (físico vs online).

**Auth:** ADMIN

---

## REPORTS `/api/v1/reports`

### GET `/api/v1/reports/dashboard`
Datos del dashboard principal.

**Auth:** Bearer Token

**Response 200:**
```json
{
  "data": {
    "todaySales": "1250.00",
    "todayProfit": "720.00",
    "weekSales": "8400.00",
    "lowStockProducts": 5,
    "pendingOrders": 3,
    "topProducts": [...],
    "salesByPromoter": [...],
    "recentSales": [...]
  }
}
```

---

### GET `/api/v1/reports/top-products`
Top productos por ventas.

**Auth:** ADMIN

**Query:** `from`, `to`, `limit`

---

### GET `/api/v1/reports/low-rotation`
Productos con baja rotación.

**Auth:** ADMIN

**Query:** `days` (período de análisis), `threshold`

---

### GET `/api/v1/reports/inventory-intelligence`
Análisis de inventario con recomendaciones.

**Auth:** ADMIN

**Response 200:**
```json
{
  "data": [
    {
      "product": { "sku": "QS-00001", "name": "Anillo Aurora" },
      "stock": 3,
      "stockMin": 5,
      "avgWeeklySales": 8.2,
      "rotation": "HIGH",
      "status": "LOW_STOCK",
      "recommendation": "REPOSICIÓN RECOMENDADA"
    }
  ]
}
```

---

### GET `/api/v1/reports/weekly`
Reporte semanal completo.

**Auth:** ADMIN

**Query:** `week` (fecha inicio de semana)

---

### GET `/api/v1/reports/by-promoter`
Ventas por promotora.

**Auth:** ADMIN

**Query:** `from`, `to`

---

## NOTIFICATIONS `/api/v1/notifications`

### GET `/api/v1/notifications`
Listar notificaciones del usuario autenticado.

**Auth:** Bearer Token

**Query:** `isRead`, `page`, `limit`

---

### PATCH `/api/v1/notifications/:id/read`
Marcar notificación como leída.

**Auth:** Bearer Token

---

### PATCH `/api/v1/notifications/read-all`
Marcar todas como leídas.

**Auth:** Bearer Token

---

## CATALOG (público) `/api/v1/catalog`

### GET `/api/v1/catalog/products`
Productos para catálogo público.

**Auth:** No requerida

**Query:** `page`, `limit`, `categoryId`, `search`

**Response 200:** Solo campos públicos: id, name, salePrice, images, category, stock disponibilidad (boolean)

---

### GET `/api/v1/catalog/products/:id`
Detalle de producto para catálogo.

**Auth:** No requerida

---

### GET `/api/v1/catalog/categories`
Categorías para catálogo.

**Auth:** No requerida

---

## SETTINGS `/api/v1/settings`

### GET `/api/v1/settings`
Obtener configuraciones del sistema.

**Auth:** ADMIN

---

### PATCH `/api/v1/settings`
Actualizar configuraciones.

**Auth:** ADMIN

**Body:** `{ "key": "WHATSAPP_NUMBER", "value": "+58412000000" }`

---

## HEALTH `/api/v1/health`

### GET `/api/v1/health`
Estado del servidor.

**Auth:** No requerida

**Response 200:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T15:30:00Z",
  "database": "connected"
}
```

---

*Generado en Fase 0 — Planning. Sujeto a aprobación antes de implementación.*

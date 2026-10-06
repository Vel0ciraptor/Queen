# Queen Style ERP

## Documento maestro de planificación para Codex

**Proyecto:** Queen Style ERP + Catálogo Digital
**Tipo:** Sistema ERP + E-commerce / Catálogo Digital
**Estado:** Fase de planificación
**Objetivo actual:** Analizar, diseñar y planificar el desarrollo antes de escribir código.

---

# 1. Instrucción principal para Codex

Este documento define los requerimientos iniciales del sistema **Queen Style ERP**.

En esta etapa **NO comenzar directamente a implementar toda la aplicación**.

Primero se debe:

1. Analizar los requerimientos.
2. Identificar módulos.
3. Definir arquitectura.
4. Diseñar estructura del proyecto.
5. Diseñar modelo de datos.
6. Identificar relaciones entre entidades.
7. Definir API.
8. Identificar dependencias.
9. Definir fases de desarrollo.
10. Identificar riesgos técnicos.
11. Identificar posibles problemas de escalabilidad.
12. Proponer una estrategia de desarrollo incremental.
13. Generar una lista clara de tareas.
14. Esperar aprobación antes de comenzar la implementación completa.

La planificación debe priorizar:

* Simplicidad.
* Mantenibilidad.
* Seguridad.
* Rendimiento.
* Mobile First.
* Escalabilidad.
* Bajo costo de infraestructura.
* Separación clara entre frontend público y administración.

---

# 2. Objetivo del sistema

Queen Style necesita un sistema que centralice:

* Catálogo digital.
* Ventas online.
* Carrito de compras.
* Pedidos.
* WhatsApp.
* Ventas físicas.
* Promotoras.
* Inventario.
* Productos.
* Códigos QR.
* Finanzas.
* Reportes.
* Estadísticas.
* Recomendaciones de reposición.

El sistema debe utilizar una única fuente de datos.

```text
                  QUEEN STYLE
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    CATÁLOGO WEB                ERP ADMIN
          │                         │
          ▼                         ▼
       CARRITO                  INVENTARIO
          │                         │
          ▼                         ▼
       PEDIDO                    VENTAS
          │                         │
          └──────────┬──────────────┘
                     ▼
                  FINANZAS
                     │
                     ▼
                 REPORTES
```

---

# 3. Stack tecnológico

La planificación debe utilizar inicialmente:

## Frontend

* React
* TypeScript
* Vite
* React Router
* TanStack Query
* Zustand o alternativa justificada
* PWA
* CSS moderno / sistema de diseño propio

## Backend

* Node.js
* TypeScript
* API REST
* Arquitectura modular
* Express o NestJS, seleccionar uno y justificarlo

## Base de datos

* PostgreSQL
* SQL
* Prisma ORM o alternativa justificada

## Storage

Las imágenes NO deben almacenarse en PostgreSQL.

PostgreSQL solamente almacenará las URLs.

Ejemplo:

```text
image_url
https://storage.example.com/products/product-001.webp
```

El storage debe poder reemplazarse posteriormente sin modificar la arquitectura principal.

---

# 4. Principios arquitectónicos

La arquitectura debe seguir estos principios:

### 4.1 Separación de responsabilidades

Separar:

```text
Frontend
Backend
Database
Storage
External Services
```

### 4.2 Modularidad

Cada dominio debe estar aislado.

Ejemplo:

```text
products
inventory
sales
orders
customers
finance
reports
users
notifications
```

### 4.3 Una sola fuente de verdad

El stock debe ser controlado por el backend.

El frontend nunca debe modificar directamente la base de datos.

Flujo:

```text
Frontend
   ↓
API
   ↓
Business Logic
   ↓
PostgreSQL
```

### 4.4 Trazabilidad

Las operaciones críticas deben poder auditarse.

Especialmente:

* Ventas.
* Cambios de inventario.
* Cambios de precios.
* Cancelaciones.
* Ajustes manuales.

---

# 5. Aplicaciones que existirán

El sistema debe planificarse como dos experiencias principales.

## 5.1 Catálogo público

Orientado a clientes.

Características:

* Mobile First.
* Visual.
* Rápido.
* Simple.
* Orientado a conversión.

Funciones:

```text
Home
Catálogo
Categorías
Producto
Carrito
Checkout
Pedido
WhatsApp
```

---

# 5.2 ERP administrativo

Orientado a:

* Administrador.
* Promotoras.
* Personal autorizado.

Funciones:

```text
Dashboard
Productos
Inventario
QR
Ventas
Pedidos
Clientes
Finanzas
Reportes
Usuarios
Configuración
```

---

# 6. Identidad visual

Paleta:

```text
#FFBFB6
#E74656
#D90E75
```

La aplicación debe soportar:

```text
Light Mode
Dark Mode
System Mode
```

El diseño debe utilizar un estilo:

**Liquid Glass / Glassmorphism moderno**

Características:

* Transparencias.
* Blur.
* Bordes suaves.
* Tarjetas flotantes.
* Sombras suaves.
* Gradientes discretos.
* Componentes redondeados.
* Animaciones pequeñas.

No sacrificar rendimiento por efectos visuales.

---

# 7. Mobile First

La aplicación debe diseñarse inicialmente para:

```text
360px
390px
412px
```

Posteriormente:

```text
Tablet
Desktop
```

Las operaciones de una promotora deben poder realizarse cómodamente desde un celular.

Especialmente:

```text
Nueva venta
Escanear QR
Buscar producto
Consultar stock
Registrar cliente
Confirmar venta
```

---

# 8. Roles iniciales

## ADMIN

Acceso completo.

Puede:

* Gestionar productos.
* Gestionar inventario.
* Gestionar ventas.
* Gestionar pedidos.
* Ver finanzas.
* Ver reportes.
* Gestionar usuarios.
* Configurar sistema.

## PROMOTORA

Puede:

* Crear ventas.
* Consultar productos.
* Escanear QR.
* Consultar stock.
* Registrar clientes.
* Consultar sus ventas.

No puede:

* Eliminar productos.
* Eliminar ventas.
* Modificar configuraciones críticas.
* Ver información administrativa no autorizada.

La arquitectura debe permitir agregar nuevos roles posteriormente.

---

# 9. Módulos principales

debe analizar y separar los siguientes módulos:

```text
01. Authentication
02. Users & Roles
03. Products
04. Categories
05. Product Images
06. Inventory
07. Inventory Movements
08. QR
09. Customers
10. Sales
11. Sale Items
12. Orders
13. Payments
14. Finance
15. Reports
16. Dashboard
17. Notifications
18. Catalog
19. Cart
20. Settings
21. Audit Logs
```

No implementar todavía todos estos módulos.

Primero determinar dependencias.

---

# 10. Productos

Cada producto deberá poder tener:

```text
id
sku
name
category
description
cost_price
sale_price
stock_min
stock_max
status
images
created_at
updated_at
```

El sistema debe permitir posteriormente agregar:

* Variantes.
* Tamaños.
* Colores.
* Material.
* Promociones.

No agregar complejidad si no es necesaria para el MVP.

---

# 11. Inventario

El inventario debe estar basado en movimientos.

No depender únicamente de modificar:

```text
stock = stock - 1
```

Debe existir trazabilidad.

Ejemplo:

```text
Venta
↓
Inventory Movement
↓
Stock actualizado
```

Tipos posibles:

```text
PURCHASE
SALE
RETURN
LOSS
DAMAGE
ADJUSTMENT
GIFT
TRANSFER
```

Codex debe determinar cuáles son realmente necesarios para el MVP.

---

# 12. QR

Cada producto debe poder tener un identificador QR.

Flujo:

```text
Producto
↓
SKU / ID
↓
QR
↓
Escaneo
↓
Backend
↓
Producto
↓
Operación
```

El QR debe permitir identificar rápidamente el producto.

Debe ser posible escanearlo desde el celular.

---

# 13. Ventas físicas

Flujo:

```text
Nueva venta
↓
Buscar producto / Escanear QR
↓
Agregar producto
↓
Cantidad
↓
Cliente opcional
↓
Método de pago
↓
Confirmar
↓
Venta registrada
↓
Inventario actualizado
```

Métodos iniciales:

```text
EFECTIVO
QR
TRANSFERENCIA
TARJETA
OTRO
```

---

# 14. Catálogo digital

El catálogo debe consumir la misma base de productos del ERP.

No crear una segunda base de productos.

```text
ERP
 │
 └── Products
       │
       └── Catalog
```

El catálogo debe mostrar:

* Imagen.
* Nombre.
* Precio.
* Categoría.
* Disponibilidad.
* Descripción.

---

# 15. Carrito

Debe permitir:

* Agregar productos.
* Eliminar.
* Cambiar cantidad.
* Calcular subtotal.
* Calcular total.

Nunca confiar en los precios enviados desde el navegador.

Al crear el pedido:

```text
Frontend
   ↓
Backend
   ↓
Consultar precio real
   ↓
Consultar stock real
   ↓
Crear pedido
```

---

# 16. Pedido online

Datos mínimos:

```text
customer
products
quantities
subtotal
delivery
total
address
notes
status
```

Estados iniciales:

```text
PENDING
CONFIRMED
PREPARING
READY
DELIVERED
CANCELLED
```

Codex debe analizar si es necesario utilizar:

```text
stock reservation
```

para pedidos pendientes.

---

# 17. WhatsApp

Al finalizar una compra:

```text
Cliente
↓
Checkout
↓
Crear pedido
↓
Generar mensaje
↓
Abrir WhatsApp
```

El pedido debe existir en el ERP incluso si el cliente posteriormente abandona WhatsApp.

No depender de WhatsApp como fuente de datos.

---

# 18. Finanzas

El módulo debe permitir analizar:

```text
Ventas
Costos
Ganancias
Margen
Métodos de pago
Ventas por canal
```

Debe ser posible obtener:

```text
Ventas del día
Ventas de la semana
Ventas del mes
Ventas del año
```

---

# 19. Dashboard

El dashboard debe responder rápidamente:

```text
¿Cuánto vendimos?
¿Cuánto ganamos?
¿Qué productos se vendieron?
¿Qué productos están por agotarse?
¿Qué promotora vendió más?
¿Qué canal vende más?
```

Debe incluir:

### KPIs

```text
Ventas
Ganancia
Ticket promedio
Productos vendidos
Pedidos
Stock bajo
```

### Gráficos

```text
Ventas por tiempo
Ventas por categoría
Top productos
Productos con baja rotación
Ventas por promotora
Ventas por canal
```

---

# 20. Inteligencia de inventario

El sistema debe identificar:

```text
Alta rotación
Media rotación
Baja rotación
Sin movimiento
Stock bajo
Agotado
```

Ejemplo:

```text
Producto:
Anillo Aurora

Stock:
3

Stock mínimo:
5

Ventas promedio:
8 / semana

Resultado:
REPOSICIÓN RECOMENDADA
```


No implementar machine learning en el MVP.

---

# 21. Reporte semanal

Debe existir un módulo capaz de generar:

```text
Resumen de ventas
Productos más vendidos
Productos menos vendidos
Ganancia
Productos agotados
Stock bajo
Productos sin movimiento
Ventas por promotora
Ventas por canal
```

El sistema debe permitir posteriormente automatizar su envío.

---

# 22. Base de datos inicial

Codex debe diseñar el esquema SQL/Prisma.

Entidades esperadas:

```text
User
Role
Permission

Product
Category
ProductImage

Inventory
InventoryMovement
InventoryLocation
QRCode

Customer

Order
OrderItem

Sale
SaleItem

Payment

FinancialTransaction

Notification

AuditLog

Setting
```


---

# 23. Reglas de negocio importantes

### Regla 1

Una venta confirmada actualiza inventario.

### Regla 2

Una venta cancelada debe manejar correctamente la devolución de stock.

### Regla 3

No permitir stock negativo por defecto.

### Regla 4

Todo movimiento de inventario genera historial.

### Regla 5

Una venta debe conservar:

```text
precio histórico
costo histórico
```

### Regla 6

No eliminar físicamente productos que tengan historial de ventas.

Utilizar estado:

```text
ACTIVE
INACTIVE
```

### Regla 7

Los pedidos pendientes no deben contabilizarse como ventas confirmadas.

### Regla 8

El backend siempre valida:

```text
precio
stock
usuario
permisos
```

---

# 24. Seguridad

Planificar:

```text
Authentication
Authorization
Password hashing
JWT/session
Rate limiting
Input validation
CORS
HTTPS
Audit logs
Database backups
```

No almacenar contraseñas en texto plano.

---

# 25. Rendimiento

Considerar desde la planificación:

* Paginación.
* Índices SQL.
* Lazy loading.
* Cache.
* Optimización de imágenes.
* WebP/AVIF.
* CDN.
* TanStack Query.
* Queries eficientes.
* Evitar N+1 queries.

---

# 26. Storage

Las imágenes se almacenarán externamente.

Arquitectura:

```text
React
 ↓
Backend
 ↓
Storage
 ↓
URL
 ↓
PostgreSQL
```

No guardar binarios de imágenes dentro de PostgreSQL.

---

# 27. PWA

La aplicación debe planificarse como PWA.

Inicialmente:

* Instalación.
* Manifest.
* Service Worker.
* Cache de assets.
* Experiencia tipo aplicación.

El modo offline completo se considera una fase posterior.

---

# 28. Notificaciones

Arquitectura preparada para:

```text
Nuevo pedido
Stock bajo
Producto agotado
Venta realizada
Pedido cancelado
Reporte semanal
```

El sistema debe abstraer las notificaciones para poder agregar posteriormente:

```text
Push
WhatsApp
Email
```

---

# 29. Auditoría

Registrar operaciones críticas.

Ejemplo:

```text
Usuario:
ID 15

Acción:
UPDATE_PRODUCT

Entidad:
Product

Entidad ID:
QS-00124

Datos anteriores:
...

Datos nuevos:
...

Fecha:
...
```

---

# 30. Arquitectura que debe evaluar Codex


```text
React
+
NestJS
+
Prisma
+
PostgreSQL


# 31. Arquitectura de frontend

Proponer una estructura modular similar a:

```text
src/

├── app/
├── components/
├── layouts/
├── pages/
├── features/
│   ├── auth/
│   ├── products/
│   ├── inventory/
│   ├── sales/
│   ├── orders/
│   ├── finance/
│   ├── reports/
│   └── customers/
│
├── hooks/
├── services/
├── stores/
├── types/
├── utils/
└── routes/
```

Codex puede modificar esta estructura si encuentra una mejor solución.

---

# 32. Arquitectura backend

Proponer:

```text
src/

├── modules/
│   ├── auth/
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
│   └── notifications/
│
├── database/
├── middleware/
├── services/
├── utils/
└── config/
```

---

# 33. API

Codex debe diseñar primero la API.

Ejemplos:

```text
/api/auth
/api/users
/api/products
/api/categories
/api/inventory
/api/qr
/api/customers
/api/sales
/api/orders
/api/payments
/api/finance
/api/reports
/api/notifications
```

Debe documentarse:

* Endpoint.
* Método HTTP.
* Parámetros.
* Body.
* Response.
* Errores.
* Autorización requerida.

---

# 34. Índices SQL

Antes de implementar, identificar índices necesarios.

Especialmente:

```text
products.sku
products.category_id

inventory.product_id

inventory_movements.product_id
inventory_movements.created_at

sales.created_at
sales.user_id
sales.status

orders.created_at
orders.status

customers.phone
```

Codex debe revisar y justificar los índices finales.

---

# 35. Transacciones

Las operaciones críticas deben utilizar transacciones SQL.

Especialmente:

```text
Crear venta
+
Crear sale_items
+
Actualizar inventario
+
Crear inventory_movement
+
Registrar pago
```

Todo debe confirmarse correctamente o revertirse.

Ejemplo:

```text
BEGIN

Crear venta

Crear detalle

Actualizar stock

Registrar movimiento

Registrar pago

COMMIT
```

Si ocurre un error:

```text
ROLLBACK
```

---

# 36. Manejo de concurrencia

Analizar escenarios como:

```text
Cliente A compra último producto
Cliente B compra el mismo producto
```

El backend debe evitar vender más stock del disponible.

Codex debe proponer una estrategia utilizando:

* Transacciones.
* Locks.
* Validación de stock.
* Reserva de inventario cuando corresponda.

---

# 37. Fases de desarrollo

Proponer el desarrollo en fases.

## Fase 0 - Planning

```text
Arquitectura
Database
API
UX
Dependencias
Riesgos
```

## Fase 1 - Foundation

```text
Proyecto
Auth
Users
Roles
Database
Layout
Design System
```

## Fase 2 - Products

```text
Products
Categories
Images
Storage
```

## Fase 3 - Inventory

```text
Inventory
Movements
QR
```

## Fase 4 - Physical Sales

```text
Sales
Sale Items
Payments
Promotoras
```

## Fase 5 - Catalog

```text
Catalog
Product Detail
Cart
Checkout
Orders
WhatsApp
```

## Fase 6 - Finance

```text
Financial Dashboard
Profit
Margins
Payment analysis
```

## Fase 7 - Reports

```text
Analytics
Reports
Inventory intelligence
Weekly reports
```

## Fase 8 - PWA / Notifications

```text
PWA
Push notifications
Offline foundation
```

---

# 38. MVP

El MVP debe incluir únicamente:

```text
AUTH
PRODUCTS
CATEGORIES
INVENTORY
QR
PHYSICAL SALES
CATALOG
CART
ORDERS
WHATSAPP
BASIC DASHBOARD
BASIC FINANCE
```

No comenzar inicialmente con:

```text
IA avanzada
Machine Learning
CRM avanzado
Fidelización
Predicción compleja
Multiempresa
Multi-sucursal avanzada
Contabilidad completa
```

Estas funcionalidades pueden agregarse posteriormente.

---

# 39. Entregables de esta fase de planificación


### 1. Arquitectura

Documento:

```text
ARCHITECTURE.md
```

### 2. Base de datos

Documento:

```text
DATABASE.md
```

Debe incluir:

* Entidades.
* Campos.
* Relaciones.
* Índices.
* Constraints.

### 3. API

Documento:

```text
API.md
```

### 4. Roadmap

Documento:

```text
ROADMAP.md
```

### 5. Tareas

Documento:

```text
TASKS.md
```

Cada tarea debe ser pequeña y ejecutable.

Ejemplo:

```text
TASK-001
Crear proyecto React

TASK-002
Configurar TypeScript

TASK-003
Configurar router

TASK-004
Crear layout administrativo
```



# 40. Formato de tareas

Cada tarea debe utilizar:

```text
ID:
Nombre:

Objetivo:

Dependencias:

Archivos afectados:

Descripción:

Criterios de aceptación:

Pruebas necesarias:
```

Ejemplo:

```text
ID:
TASK-001

Nombre:
Inicializar backend

Objetivo:
Crear API Node.js con TypeScript.

Dependencias:
Ninguna.

Criterios de aceptación:

- Servidor inicia correctamente.
- TypeScript compila.
- Endpoint /health responde 200.
- Variables de entorno funcionan.

Pruebas:

GET /health
```

---

# 41. Criterios de calidad

Antes de considerar una funcionalidad terminada:

```text
Código limpio
+
TypeScript sin errores
+
Lint
+
Build exitoso
+
Tests cuando corresponda
+
Validación de errores
+
Seguridad
+
Responsive
```

No considerar una funcionalidad terminada únicamente porque "funciona en pantalla".

---

# 42. Variables de entorno

Nunca colocar secretos directamente en el código.

Ejemplo:

```env
DATABASE_URL=
JWT_SECRET=
STORAGE_URL=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
WHATSAPP_NUMBER=
```

Crear:

```text
.env.example
```

sin secretos reales.

---


# 45. Backups

Planificar:

```text
Backup PostgreSQL
Backup automático
Retención
Restauración
```

El backup debe probarse mediante restauración periódica.

Un backup que nunca fue restaurado no debe considerarse completamente confiable.

---

# 46. Testing

Planificar como mínimo:

### Backend

* Auth.
* Productos.
* Inventario.
* Ventas.
* Stock.
* Pedidos.

### Business logic

Especialmente:

```text
Venta
↓
Stock
↓
Movimiento
```

### Frontend

Pruebas de:

* Carrito.
* Checkout.
* Login.
* Venta.
* QR.

### Integración

```text
Crear producto
↓
Inventario
↓
Venta
↓
Stock
↓
Reporte
```

---

# 47. Criterios para comenzar implementación

Codex debe considerar que la fase de planificación está completa cuando exista:

```text
[ ] Arquitectura definida
[ ] Stack definido
[ ] Database definida
[ ] API definida
[ ] Relaciones definidas
[ ] Roles definidos
[ ] Reglas de negocio definidas
[ ] Roadmap definido
[ ] Tareas divididas
[ ] Riesgos identificados
[ ] Estrategia de testing definida
[ ] Estrategia de deployment definida
```

---

# 48. Instrucción final

Analiza este documento como **Product Requirements + Technical Requirements**.

No asumas que todas las decisiones técnicas aquí escritas son definitivas.

Si existe una solución técnicamente mejor:

1. Identificar el problema.
2. Explicar la alternativa.
3. Compararla con la solución propuesta.
4. Recomendar una opción.
5. Documentar la decisión.

Evitar sobreingeniería.

El objetivo es construir un ERP profesional, pero apropiado para el tamaño real de Queen Style.

Prioridad:

```text
FUNCIONALIDAD
>
SEGURIDAD
>
CORRECTITUD DE DATOS
>
USABILIDAD
>
RENDIMIENTO
>
ESCALABILIDAD
>
ESTÉTICA
```

Primero planificar.

Después implementar por fases.

No construir todo el sistema de una sola vez.

import * as bcrypt from 'bcrypt';
import { MODEL_NAMES } from './mock-schema';

type Row = Record<string, any>;
export type MockStores = Record<string, Row[]>;

const daysAgo = (d: number, h = 10, m = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, m, Math.floor(Math.random() * 50), 0);
  return date;
};

const todayAt = (h: number, m: number): Date => {
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
};

interface SeedProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  materialId: string;
  colorId: string;
  shapeId?: string;
  costPrice: number;
  salePrice: number;
  initialStock: number;
  stockMin: number;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAtDaysAgo: number;
  withImages?: boolean;
}

interface SeedCategory {
  id: string;
  name: string;
  dimension: 'TYPE' | 'MATERIAL' | 'COLOR' | 'SHAPE';
  parentId?: string;
  description?: string;
}

// Catálogo de joyería por dimensión (Tipo, Material, Color, Forma opcional).
// parentId permite subcategorías dentro de una misma dimensión.
const CATEGORIES: SeedCategory[] = [
  // ── TIPO ──
  { id: 'cat-type-anillos', name: 'Anillos', dimension: 'TYPE', description: 'Anillos de fantasía y compromiso' },
  { id: 'cat-type-anillos-compromiso', name: 'Anillos de compromiso', dimension: 'TYPE', parentId: 'cat-type-anillos', description: 'Anillos con piedra central' },
  { id: 'cat-type-anillos-alianzas', name: 'Alianzas', dimension: 'TYPE', parentId: 'cat-type-anillos', description: 'Alianzas de boda' },
  { id: 'cat-type-collares', name: 'Collares', dimension: 'TYPE', description: 'Collares y cadenas' },
  { id: 'cat-type-pulseras', name: 'Pulseras', dimension: 'TYPE', description: 'Pulseras y manillas' },
  { id: 'cat-type-aretes', name: 'Aretes', dimension: 'TYPE', description: 'Aretes y pendientes' },
  { id: 'cat-type-dijes', name: 'Dijes', dimension: 'TYPE', description: 'Dijes y colgantes' },

  // ── MATERIAL ──
  { id: 'cat-mat-oro', name: 'Oro', dimension: 'MATERIAL', description: 'Joyas de oro' },
  { id: 'cat-mat-oro-18k', name: 'Oro 18k', dimension: 'MATERIAL', parentId: 'cat-mat-oro', description: 'Oro 18 quilates' },
  { id: 'cat-mat-oro-14k', name: 'Oro 14k', dimension: 'MATERIAL', parentId: 'cat-mat-oro', description: 'Oro 14 quilates' },
  { id: 'cat-mat-plata', name: 'Plata', dimension: 'MATERIAL', description: 'Plata de ley' },
  { id: 'cat-mat-oro-blanco', name: 'Oro blanco', dimension: 'MATERIAL', description: 'Oro blanco' },
  { id: 'cat-mat-acero', name: 'Acero', dimension: 'MATERIAL', description: 'Acero inoxidable' },

  // ── COLOR ──
  { id: 'cat-color-dorado', name: 'Dorado', dimension: 'COLOR', description: 'Color dorado' },
  { id: 'cat-color-plateado', name: 'Plateado', dimension: 'COLOR', description: 'Color plateado' },
  { id: 'cat-color-rosa', name: 'Rosa', dimension: 'COLOR', description: 'Rosa / oro rosa' },
  { id: 'cat-color-negro', name: 'Negro', dimension: 'COLOR', description: 'Color negro' },
  { id: 'cat-color-blanco', name: 'Blanco', dimension: 'COLOR', description: 'Color blanco' },

  // ── FORMA (opcional) ──
  { id: 'cat-shape-redondo', name: 'Redondo', dimension: 'SHAPE', description: 'Forma redonda' },
  { id: 'cat-shape-corazon', name: 'Corazón', dimension: 'SHAPE', description: 'Forma de corazón' },
  { id: 'cat-shape-estrella', name: 'Estrella', dimension: 'SHAPE', description: 'Forma de estrella' },
  { id: 'cat-shape-cuadrado', name: 'Cuadrado', dimension: 'SHAPE', description: 'Forma cuadrada' },
];

const PRODUCTS: SeedProduct[] = [
  { id: 'p-01', sku: 'QS-ANL-001', name: 'Anillo Solitario Oro 18k', description: 'Anillo solitario con piedra central, oro 18k. Ideal para compromisos.', categoryId: 'cat-type-anillos-compromiso', materialId: 'cat-mat-oro-18k', colorId: 'cat-color-dorado', shapeId: 'cat-shape-redondo', costPrice: 120, salePrice: 280, initialStock: 10, stockMin: 3, createdAtDaysAgo: 16, withImages: true },
  { id: 'p-02', sku: 'QS-ANL-002', name: 'Anillo Compromiso Corazón', description: 'Anillo de compromiso con piedra en forma de corazón, oro 18k.', categoryId: 'cat-type-anillos-compromiso', materialId: 'cat-mat-oro-18k', colorId: 'cat-color-dorado', shapeId: 'cat-shape-corazon', costPrice: 150, salePrice: 340, initialStock: 6, stockMin: 2, createdAtDaysAgo: 16, withImages: true },
  { id: 'p-03', sku: 'QS-ALZ-001', name: 'Alianza Clásica Oro 14k', description: 'Alianza de boda clásica en oro 14k, acabado pulido.', categoryId: 'cat-type-anillos-alianzas', materialId: 'cat-mat-oro-14k', colorId: 'cat-color-dorado', shapeId: 'cat-shape-redondo', costPrice: 90, salePrice: 210, initialStock: 12, stockMin: 4, createdAtDaysAgo: 15, withImages: true },
  { id: 'p-04', sku: 'QS-COL-001', name: 'Collar Cadena Oro 14k', description: 'Collar de cadena eslabón en oro 14k, largo ajustable.', categoryId: 'cat-type-collares', materialId: 'cat-mat-oro-14k', colorId: 'cat-color-dorado', costPrice: 80, salePrice: 190, initialStock: 9, stockMin: 3, createdAtDaysAgo: 15, withImages: true },
  { id: 'p-05', sku: 'QS-COL-002', name: 'Collar Dije Corazón Plata', description: 'Collar de plata con dije de corazón. Pieza delicada y moderna.', categoryId: 'cat-type-collares', materialId: 'cat-mat-plata', colorId: 'cat-color-plateado', shapeId: 'cat-shape-corazon', costPrice: 35, salePrice: 85, initialStock: 14, stockMin: 4, createdAtDaysAgo: 14, withImages: true },
  { id: 'p-06', sku: 'QS-COL-003', name: 'Collar Perlas Blanco', description: 'Collar de perlas en color blanco, cierre de plata.', categoryId: 'cat-type-collares', materialId: 'cat-mat-plata', colorId: 'cat-color-blanco', costPrice: 45, salePrice: 110, initialStock: 0, stockMin: 3, createdAtDaysAgo: 14, withImages: false },
  { id: 'p-07', sku: 'QS-PUL-001', name: 'Pulsera Eslabones Oro 18k', description: 'Pulsera de eslabones en oro 18k, hebillón seguro.', categoryId: 'cat-type-pulseras', materialId: 'cat-mat-oro-18k', colorId: 'cat-color-dorado', costPrice: 130, salePrice: 300, initialStock: 7, stockMin: 2, createdAtDaysAgo: 14, withImages: true },
  { id: 'p-08', sku: 'QS-PUL-002', name: 'Pulsera Trenzada Plata', description: 'Pulsera trenzada de plata de ley, acabado oxidado.', categoryId: 'cat-type-pulseras', materialId: 'cat-mat-plata', colorId: 'cat-color-plateado', costPrice: 40, salePrice: 95, initialStock: 11, stockMin: 3, createdAtDaysAgo: 13, withImages: true },
  { id: 'p-09', sku: 'QS-PUL-003', name: 'Pulsera Acero Negra', description: 'Pulsera de acero inoxidable color negro, look urbano.', categoryId: 'cat-type-pulseras', materialId: 'cat-mat-acero', colorId: 'cat-color-negro', costPrice: 25, salePrice: 65, initialStock: 18, stockMin: 5, createdAtDaysAgo: 13, withImages: false },
  { id: 'p-10', sku: 'QS-ART-001', name: 'Aretes Estrella Oro 14k', description: 'Aretes en forma de estrella en oro 14k, cierre de presión.', categoryId: 'cat-type-aretes', materialId: 'cat-mat-oro-14k', colorId: 'cat-color-dorado', shapeId: 'cat-shape-estrella', costPrice: 55, salePrice: 130, initialStock: 8, stockMin: 3, createdAtDaysAgo: 12, withImages: true },
  { id: 'p-11', sku: 'QS-ART-002', name: 'Aretes Goteros Plata', description: 'Aretes goteros de plata de ley, cierre mariposa.', categoryId: 'cat-type-aretes', materialId: 'cat-mat-plata', colorId: 'cat-color-plateado', costPrice: 30, salePrice: 72, initialStock: 20, stockMin: 6, createdAtDaysAgo: 12, withImages: false },
  { id: 'p-12', sku: 'QS-ART-003', name: 'Aretes Cuadrado Oro Blanco', description: 'Aretes cuadrados en oro blanco, diseño geométrico.', categoryId: 'cat-type-aretes', materialId: 'cat-mat-oro-blanco', colorId: 'cat-color-blanco', shapeId: 'cat-shape-cuadrado', costPrice: 65, salePrice: 150, initialStock: 5, stockMin: 2, createdAtDaysAgo: 12, withImages: true },
  { id: 'p-13', sku: 'QS-DIJ-001', name: 'Dije Inicial Oro 18k', description: 'Dije con inicial personalizada en oro 18k. Varios modelos.', categoryId: 'cat-type-dijes', materialId: 'cat-mat-oro-18k', colorId: 'cat-color-dorado', costPrice: 50, salePrice: 120, initialStock: 15, stockMin: 4, createdAtDaysAgo: 11, withImages: true },
  { id: 'p-14', sku: 'QS-DIJ-002', name: 'Dije Cruz Plata', description: 'Dije de cruz en plata de ley, acabado brillante.', categoryId: 'cat-type-dijes', materialId: 'cat-mat-plata', colorId: 'cat-color-plateado', costPrice: 28, salePrice: 68, initialStock: 13, stockMin: 4, createdAtDaysAgo: 11, withImages: false },
  { id: 'p-15', sku: 'QS-DIJ-003', name: 'Dije Estrella Oro Rosa', description: 'Dije de estrella en oro rosa, con circonitas.', categoryId: 'cat-type-dijes', materialId: 'cat-mat-oro-14k', colorId: 'cat-color-rosa', shapeId: 'cat-shape-estrella', costPrice: 60, salePrice: 145, initialStock: 10, stockMin: 3, status: 'INACTIVE', createdAtDaysAgo: 11, withImages: true },
];

interface SeedSaleItem {
  productId: string;
  quantity: number;
}
interface SeedSale {
  id: string;
  userId: string;
  customerId: string | null;
  daysAgo?: number;
  todayAt?: [number, number];
  items: SeedSaleItem[];
  discount: number;
  paymentMethod: string;
  status?: 'COMPLETED' | 'CANCELLED';
}

const SALES: SeedSale[] = [
  { id: 's-01', userId: 'u-promo', customerId: 'c-1', daysAgo: 13, items: [{ productId: 'p-01', quantity: 1 }, { productId: 'p-04', quantity: 2 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 's-02', userId: 'u-admin', customerId: null, daysAgo: 11, items: [{ productId: 'p-07', quantity: 1 }, { productId: 'p-10', quantity: 1 }], discount: 0, paymentMethod: 'TRANSFERENCIA' },
  { id: 's-03', userId: 'u-promo', customerId: 'c-2', daysAgo: 9, items: [{ productId: 'p-02', quantity: 1 }], discount: 5, paymentMethod: 'TARJETA' },
  { id: 's-04', userId: 'u-promo2', customerId: 'c-3', daysAgo: 7, items: [{ productId: 'p-05', quantity: 2 }, { productId: 'p-11', quantity: 1 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 's-05', userId: 'u-admin', customerId: null, daysAgo: 5, items: [{ productId: 'p-13', quantity: 1 }, { productId: 'p-14', quantity: 1 }], discount: 0, paymentMethod: 'QR' },
  { id: 's-06', userId: 'u-promo', customerId: 'c-1', daysAgo: 4, items: [{ productId: 'p-04', quantity: 1 }, { productId: 'p-14', quantity: 1 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 's-07', userId: 'u-promo2', customerId: null, daysAgo: 3, items: [{ productId: 'p-08', quantity: 1 }], discount: 0, paymentMethod: 'TRANSFERENCIA' },
  { id: 's-08', userId: 'u-promo', customerId: 'c-4', daysAgo: 2, items: [{ productId: 'p-01', quantity: 1 }, { productId: 'p-12', quantity: 1 }], discount: 2, paymentMethod: 'TARJETA' },
  { id: 's-09', userId: 'u-admin', customerId: null, daysAgo: 1, items: [{ productId: 'p-10', quantity: 1 }, { productId: 'p-11', quantity: 2 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 's-10', userId: 'u-promo', customerId: 'c-2', todayAt: [10, 15], items: [{ productId: 'p-07', quantity: 1 }, { productId: 'p-14', quantity: 1 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 's-11', userId: 'u-promo2', customerId: 'c-3', todayAt: [12, 40], items: [{ productId: 'p-05', quantity: 1 }, { productId: 'p-15', quantity: 1 }], discount: 0, paymentMethod: 'TRANSFERENCIA' },
  { id: 's-12', userId: 'u-promo', customerId: null, todayAt: [15, 5], items: [{ productId: 'p-04', quantity: 1 }, { productId: 'p-01', quantity: 1 }], discount: 0, paymentMethod: 'EFECTIVO' },
  { id: 's-13', userId: 'u-promo', customerId: 'c-3', daysAgo: 6, items: [{ productId: 'p-02', quantity: 1 }], discount: 0, paymentMethod: 'EFECTIVO', status: 'CANCELLED' },
];

interface SeedOrderItem {
  productId: string;
  quantity: number;
}
interface SeedOrder {
  id: string;
  customerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
  fulfillmentType?: 'PICKUP' | 'DELIVERY';
  daysAgo: number;
  h: number;
  items: SeedOrderItem[];
  deliveryFee: number;
  address: string;
  notes?: string;
  whatsappSent: boolean;
}

const ORDERS: SeedOrder[] = [
  { id: 'o-01', customerId: 'c-2', status: 'PENDING', fulfillmentType: 'DELIVERY', daysAgo: 1, h: 16, items: [{ productId: 'p-01', quantity: 1 }, { productId: 'p-11', quantity: 1 }], deliveryFee: 5, address: 'Av. Principal 123, Caracas', notes: 'Entregar después de las 5pm', whatsappSent: true },
  { id: 'o-02', customerId: 'c-4', status: 'CONFIRMED', fulfillmentType: 'DELIVERY', daysAgo: 3, h: 11, items: [{ productId: 'p-13', quantity: 1 }, { productId: 'p-14', quantity: 1 }], deliveryFee: 0, address: 'Calle Bolívar 45, Los Teques', whatsappSent: true },
  { id: 'o-03', customerId: 'c-1', status: 'DELIVERED', fulfillmentType: 'PICKUP', daysAgo: 8, h: 9, items: [{ productId: 'p-07', quantity: 1 }], deliveryFee: 5, address: 'Urb. Las Flores, casa 8', whatsappSent: true },
  { id: 'o-04', customerId: 'c-3', status: 'CANCELLED', fulfillmentType: 'DELIVERY', daysAgo: 2, h: 18, items: [{ productId: 'p-05', quantity: 1 }], deliveryFee: 5, address: 'Sector Norte 7', whatsappSent: false },
];

const productById = new Map(PRODUCTS.map((p) => [p.id, p]));

const stockAdjustments: Array<{ productId: string; quantity: number; daysAgo: number; notes: string }> = [
  { productId: 'p-12', quantity: 2, daysAgo: 5, notes: 'Ajuste de 4 a 1 por conteo físico (faltantes)' },
];

export function buildSeed(): MockStores {
  const stores: MockStores = {} as MockStores;
  for (const name of MODEL_NAMES) stores[name] = [];

  // ── Users ───────────────────────────────────────────────────────────────────
  const adminHash = bcrypt.hashSync('Admin123!', 12);
  const promoHash = bcrypt.hashSync('Promotora123!', 12);

  stores.user.push(
    {
      id: 'u-admin',
      email: 'admin@queenstyle.com',
      password: adminHash,
      name: 'Admin Queen',
      role: 'ADMIN',
      isActive: true,
      createdAt: daysAgo(30, 8),
      updatedAt: daysAgo(30, 8),
    },
    {
      id: 'u-promo',
      email: 'promotora@queenstyle.com',
      password: promoHash,
      name: 'Carla Promotora',
      role: 'PROMOTORA',
      isActive: true,
      createdAt: daysAgo(25, 9),
      updatedAt: daysAgo(25, 9),
    },
    {
      id: 'u-promo2',
      email: 'vendedora@queenstyle.com',
      password: promoHash,
      name: 'Daniela Vendedora',
      role: 'PROMOTORA',
      isActive: true,
      createdAt: daysAgo(20, 9),
      updatedAt: daysAgo(20, 9),
    },
  );

  // ── Categories (por dimensión, con subcategorías) ────────────────────────────
  const catCreatedAt = daysAgo(28, 8);
  for (const c of CATEGORIES) {
    stores.category.push({
      id: c.id,
      name: c.name,
      dimension: c.dimension,
      parentId: c.parentId ?? null,
      description: c.description ?? null,
      isActive: true,
      createdAt: catCreatedAt,
      updatedAt: catCreatedAt,
    });
  }

  // ── Customers ───────────────────────────────────────────────────────────────
  stores.customer.push(
    { id: 'c-1', name: 'María López', phone: '04121234567', email: 'maria.lopez@email.com', address: 'Av. Principal 123, Caracas', notes: 'Cliente frecuente', createdAt: daysAgo(20, 10), updatedAt: daysAgo(20, 10) },
    { id: 'c-2', name: 'Carlos Pérez', phone: '04147654321', email: 'carlos.perez@email.com', address: 'Calle Bolívar 45, Los Teques', notes: null, createdAt: daysAgo(18, 11), updatedAt: daysAgo(18, 11) },
    { id: 'c-3', name: 'Ana García', phone: '04241112233', email: 'ana.garcia@email.com', address: 'Sector Norte 7', notes: 'Prefiere transferencia', createdAt: daysAgo(14, 12), updatedAt: daysAgo(14, 12) },
    { id: 'c-4', name: 'Luisa Martínez', phone: '04129998877', email: 'luisa.martinez@email.com', address: 'Urb. Las Flores, casa 8', notes: null, createdAt: daysAgo(10, 13), updatedAt: daysAgo(10, 13) },
  );

  // ── Products + Inventory + QR + Images ─────────────────────────────────────
  let imgSeq = 0;
  PRODUCTS.forEach((p, i) => {
    const createdAt = daysAgo(p.createdAtDaysAgo, 8 + (i % 6), 10);
    stores.product.push({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      categoryId: p.categoryId,
      materialId: p.materialId ?? null,
      colorId: p.colorId ?? null,
      shapeId: p.shapeId ?? null,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stockMin: p.stockMin,
      stockMax: p.initialStock * 2,
      status: p.status ?? 'ACTIVE',
      createdAt,
      updatedAt: createdAt,
    });

    stores.inventory.push({
      id: `inv-${i + 1}`,
      productId: p.id,
      stock: 0, // calculado abajo
      updatedAt: createdAt,
    });

    stores.qRCode.push({
      id: `qr-${i + 1}`,
      productId: p.id,
      code: `QS-${p.sku}`,
      imageUrl: null,
      createdAt,
    });

    if (p.withImages) {
      stores.productImage.push({
        id: `img-${++imgSeq}`,
        productId: p.id,
        url: `/api/v1/catalog/placeholder/${p.sku}`,
        altText: p.name,
        isPrimary: true,
        order: 0,
        createdAt,
      });
      if (i % 3 === 0) {
        stores.productImage.push({
          id: `img-${++imgSeq}`,
          productId: p.id,
          url: `/api/v1/catalog/placeholder/${p.sku}-2`,
          altText: `${p.name} (vista 2)`,
          isPrimary: false,
          order: 1,
          createdAt,
        });
      }
    }

    // Inventario inicial
    stores.inventoryMovement.push({
      id: `mv-purchase-${i + 1}`,
      inventoryId: `inv-${i + 1}`,
      type: 'PURCHASE',
      quantity: p.initialStock,
      reference: 'Inventario Inicial',
      notes: 'Carga inicial al crear producto',
      createdBy: 'u-admin',
      createdAt,
    });
  });

  // ── Sales + items + payments + movements + finance ─────────────────────────
  for (const s of SALES) {
    const createdAt = s.todayAt ? todayAt(s.todayAt[0], s.todayAt[1]) : daysAgo(s.daysAgo!, 10 + (Number(s.id.slice(2)) % 7), 20);
    const status = s.status ?? 'COMPLETED';
    let subtotal = 0;
    const itemsRows: Row[] = [];
    let itemSeq = 0;

    for (const item of s.items) {
      const p = productById.get(item.productId)!;
      const itemSubtotal = p.salePrice * item.quantity;
      subtotal += itemSubtotal;
      itemsRows.push({
        id: `si-${s.id}-${++itemSeq}`,
        saleId: s.id,
        productId: p.id,
        quantity: item.quantity,
        unitPrice: p.salePrice,
        unitCost: p.costPrice,
        subtotal: itemSubtotal,
      });
    }

    const total = Math.max(0, subtotal - s.discount);

    stores.sale.push({
      id: s.id,
      userId: s.userId,
      customerId: s.customerId,
      status,
      subtotal,
      discount: s.discount,
      total,
      paymentMethod: s.paymentMethod,
      notes: status === 'CANCELLED' ? 'Cancelada: cliente cambió de opinión' : null,
      createdAt,
      updatedAt: createdAt,
    });

    for (const row of itemsRows) stores.saleItem.push(row);

    stores.payment.push({
      id: `pay-${s.id}`,
      saleId: s.id,
      orderId: null,
      method: s.paymentMethod,
      amount: total,
      status: status === 'CANCELLED' ? 'REFUNDED' : 'COMPLETED',
      reference: `SALE-${s.id.toUpperCase()}`,
      createdAt,
    });

    if (status === 'COMPLETED') {
      for (const item of s.items) {
        stores.inventoryMovement.push({
          id: `mv-${s.id}-${item.productId}`,
          inventoryId: `inv-${Number(item.productId.slice(2))}`,
          type: 'SALE',
          quantity: item.quantity,
          reference: `Venta #${s.id.slice(0, 8)}`,
          notes: 'Venta directa realizada por usuario',
          createdBy: s.userId,
          createdAt,
        });
      }
      stores.financialTransaction.push({
        id: `ft-${s.id}`,
        type: 'INCOME',
        amount: total,
        description: `Ingreso por venta POS #${s.id.slice(0, 8)}`,
        category: 'Venta Directa',
        reference: s.id,
        date: createdAt,
        createdAt,
      });
    } else {
      // Cancelada: devolución de stock + transacción de egreso
      for (const item of s.items) {
        stores.inventoryMovement.push({
          id: `mv-${s.id}-ret-${item.productId}`,
          inventoryId: `inv-${Number(item.productId.slice(2))}`,
          type: 'RETURN',
          quantity: item.quantity,
          reference: `Cancelación Venta #${s.id.slice(0, 8)}`,
          notes: 'Devolución de stock por venta cancelada',
          createdBy: s.userId,
          createdAt,
        });
      }
      stores.financialTransaction.push({
        id: `ft-${s.id}`,
        type: 'EXPENSE',
        amount: total,
        description: `Devolución por anulación de Venta #${s.id.slice(0, 8)}`,
        category: 'Devolución',
        reference: s.id,
        date: createdAt,
        createdAt,
      });
    }
  }

  // ── Orders + items ─────────────────────────────────────────────────────────
  for (const o of ORDERS) {
    const createdAt = daysAgo(o.daysAgo, o.h, 30);
    let subtotal = 0;
    let itemSeq = 0;

    for (const item of o.items) {
      const p = productById.get(item.productId)!;
      const itemSubtotal = p.salePrice * item.quantity;
      subtotal += itemSubtotal;
      // Aceptados y entregados: checklist verificado por el admin
      const isChecked = o.status === 'CONFIRMED' || o.status === 'DELIVERED';
      stores.orderItem.push({
        id: `oi-${o.id}-${++itemSeq}`,
        orderId: o.id,
        productId: p.id,
        quantity: item.quantity,
        unitPrice: p.salePrice,
        subtotal: itemSubtotal,
        checkedAt: isChecked ? createdAt : null,
        checkedBy: isChecked ? 'u-admin' : null,
      });
    }

    const total = subtotal + o.deliveryFee;

    stores.order.push({
      id: o.id,
      customerId: o.customerId,
      status: o.status,
      fulfillmentType: o.fulfillmentType ?? 'PICKUP',
      subtotal,
      deliveryFee: o.deliveryFee,
      total,
      address: o.address,
      notes: o.notes ?? null,
      whatsappSent: o.whatsappSent,
      saleId: null,
      createdAt,
      updatedAt: createdAt,
    });

    if (o.status === 'DELIVERED') {
      for (const item of o.items) {
        stores.inventoryMovement.push({
          id: `mv-${o.id}-${item.productId}`,
          inventoryId: `inv-${Number(item.productId.slice(2))}`,
          type: 'SALE',
          quantity: item.quantity,
          reference: `Pedido #${o.id.slice(0, 8)}`,
          notes: 'Entrega de pedido online',
          createdBy: 'u-admin',
          createdAt,
        });
      }
      stores.payment.push({
        id: `pay-${o.id}`,
        saleId: null,
        orderId: o.id,
        method: 'OTRO',
        amount: total,
        status: 'COMPLETED',
        reference: `ORDER-${o.id.toUpperCase()}`,
        createdAt,
      });
      stores.financialTransaction.push({
        id: `ft-${o.id}`,
        type: 'INCOME',
        amount: total,
        description: `Ingreso por pedido online entregado #${o.id.slice(0, 8)}`,
        category: 'Pedido Online',
        reference: o.id,
        date: createdAt,
        createdAt,
      });
    }
  }

  // ── Stock adjustments ──────────────────────────────────────────────────────
  for (const adj of stockAdjustments) {
    const p = productById.get(adj.productId)!;
    const createdAt = daysAgo(adj.daysAgo, 17, 45);
    stores.inventoryMovement.push({
      id: `mv-adj-${adj.productId}`,
      inventoryId: `inv-${Number(adj.productId.slice(2))}`,
      type: 'ADJUSTMENT',
      quantity: adj.quantity,
      reference: 'Ajuste manual',
      notes: adj.notes,
      createdBy: 'u-admin',
      createdAt,
    });
    void p;
  }

  // ── Compute final stock ────────────────────────────────────────────────────
  const stock = new Map<string, number>();
  for (const p of PRODUCTS) stock.set(p.id, p.initialStock);

  for (const row of stores.inventoryMovement) {
    const productId = `p-${row.inventoryId.replace('inv-', '').padStart(2, '0')}`;
    const current = stock.get(productId);
    if (current === undefined) continue;
    if (row.type === 'PURCHASE') continue; // ya incluido en initialStock
    if (row.type === 'SALE') stock.set(productId, current - row.quantity);
    else if (row.type === 'RETURN') stock.set(productId, current + row.quantity);
    else if (row.type === 'ADJUSTMENT') stock.set(productId, Math.max(0, current - row.quantity));
    else if (row.type === 'PURCHASE') stock.set(productId, current + row.quantity);
  }

  // Los items de ventas canceladas generan RETURN que repone el stock,
  // pero esas ventas nunca lo descontamos: neutralizamos el RETURN.
  for (const s of SALES) {
    if ((s.status ?? 'COMPLETED') === 'CANCELLED') {
      for (const item of s.items) {
        const productId = item.productId;
        stock.set(productId, stock.get(productId)! - item.quantity);
      }
    }
  }

  for (const inv of stores.inventory) {
    const productId = `p-${inv.productId.replace('p-', '').padStart(2, '0')}`;
    inv.stock = Math.max(0, stock.get(productId) ?? 0);
  }

  // ── Distribución por ubicación ──────────────────────────────────────────────
  // Se guardan explícitamente los canales (TIENDA/ONLINE/LIVE); BODEGA se
  // deriva como "stock total − suma de canales".
  let locSeq = 0;
  const addStockLoc = (inventoryId: string, location: string, quantity: number, updatedAt: Date) => {
    if (quantity <= 0) return;
    stores.inventoryStockLocation.push({
      id: `isl-${++locSeq}`,
      inventoryId,
      location,
      quantity,
      updatedAt,
    });
  };
  const addTransfer = (
    inventoryId: string,
    location: string,
    quantity: number,
    reference: string,
    createdAt: Date,
  ) => {
    if (quantity <= 0) return;
    stores.inventoryMovement.push({
      id: `mv-transfer-${location.toLowerCase()}-${inventoryId}`,
      inventoryId,
      type: 'TRANSFER',
      quantity,
      fromLocation: 'BODEGA',
      location,
      reference,
      notes: 'Distribución inicial de inventario a canal de venta',
      createdBy: 'u-admin',
      createdAt,
    });
  };

  for (const inv of stores.inventory) {
    const s: number = inv.stock;
    if (s < 3) continue;
    const n = Number(String(inv.productId).replace('p-', '')) || 1;
    const when = daysAgo((n % 10) + 1, 11, 30);

    const tienda = Math.min(s, Math.floor(s * 0.4));
    const online = s >= 6 ? Math.min(s - tienda, Math.floor(s * 0.25)) : 0;
    const live = s >= 10 ? Math.min(s - tienda - online, Math.floor(s * 0.15)) : 0;

    addStockLoc(inv.id, 'TIENDA', tienda, when);
    addStockLoc(inv.id, 'ONLINE', online, when);
    addStockLoc(inv.id, 'LIVE', live, when);

    addTransfer(inv.id, 'TIENDA', tienda, 'Envío de bodega a tienda', when);
    addTransfer(inv.id, 'ONLINE', online, 'Reserva de stock para venta online', when);
    addTransfer(inv.id, 'LIVE', live, 'Reserva de stock para live / en vivo', when);
  }

  // ── Conteos cíclicos de inventario ─────────────────────────────────────────
  let countItemSeq = 0;
  const addCountItem = (
    countId: string,
    productId: string,
    expected: number,
    counted: number | null,
    checkedAt: Date | null,
  ) => {
    stores.inventoryCountItem.push({
      id: `ci-${++countItemSeq}`,
      countId,
      productId,
      expected,
      counted,
      diff: counted === null ? null : counted - expected,
      checkedAt,
    });
  };

  // Conteo semanal COMPLETADO en Tienda (un faltante para ver el KPI de cuadre)
  const countDoneAt = daysAgo(3, 10);
  stores.inventoryCount.push({
    id: 'ic-01',
    location: 'TIENDA',
    frequency: 'WEEKLY',
    status: 'COMPLETED',
    notes: 'Conteo semanal de tienda física',
    countedBy: 'u-promo',
    createdAt: daysAgo(3, 9),
    startedAt: daysAgo(3, 9),
    completedAt: countDoneAt,
  });
  let tiendaIdx = 0;
  for (const l of stores.inventoryStockLocation) {
    if (l.location !== 'TIENDA' || tiendaIdx >= 8) continue;
    const inv = stores.inventory.find((i) => i.id === l.inventoryId);
    if (!inv) continue;
    tiendaIdx += 1;
    // El 3er producto tiene un faltante de 1 unidad
    const counted = tiendaIdx === 3 ? Math.max(0, l.quantity - 1) : l.quantity;
    addCountItem('ic-01', inv.productId, l.quantity, counted, countDoneAt);
  }

  // Conteo quincenal EN CURSO en Bodega (1 de 6 productos ya contado)
  const countStartAt = daysAgo(1, 15);
  stores.inventoryCount.push({
    id: 'ic-02',
    location: 'BODEGA',
    frequency: 'BIWEEKLY',
    status: 'IN_PROGRESS',
    notes: 'Conteo quincenal de bodega',
    countedBy: 'u-admin',
    createdAt: countStartAt,
    startedAt: countStartAt,
    completedAt: null,
  });
  let bodegaIdx = 0;
  for (const inv of stores.inventory) {
    if (bodegaIdx >= 6) break;
    const channels = stores.inventoryStockLocation
      .filter((l) => l.inventoryId === inv.id)
      .reduce((sum, l) => sum + l.quantity, 0);
    const bodega = Math.max(0, (inv.stock ?? 0) - channels);
    if (bodega <= 0) continue;
    bodegaIdx += 1;
    addCountItem(
      'ic-02',
      inv.productId,
      bodega,
      bodegaIdx === 1 ? bodega : null,
      bodegaIdx === 1 ? countStartAt : null,
    );
  }

  // ── Expenses manuales ──────────────────────────────────────────────────────
  const expenses = [
    { id: 'ft-exp-1', description: 'Alquiler local', category: 'Alquiler', amount: 300, daysAgo: 12 },
    { id: 'ft-exp-2', description: 'Insumos y bolsas de empaque', category: 'Insumos', amount: 85, daysAgo: 6 },
    { id: 'ft-exp-3', description: 'Servicios públicos', category: 'Servicios', amount: 42, daysAgo: 3 },
  ];
  for (const e of expenses) {
    const date = daysAgo(e.daysAgo, 9, 15);
    stores.financialTransaction.push({
      id: e.id,
      type: 'EXPENSE',
      amount: e.amount,
      description: e.description,
      category: e.category,
      reference: null,
      date,
      createdAt: date,
    });
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  stores.notification.push(
    {
      id: 'n-01',
      userId: 'u-admin',
      type: 'LOW_STOCK',
      title: '¡Stock bajo!',
      message: 'El producto "Aretes Cuadrado Oro Blanco" tiene 1 unidades en stock.',
      isRead: false,
      metadata: { productId: 'p-12', newStock: 1 },
      createdAt: daysAgo(1, 17, 10),
    },
    {
      id: 'n-02',
      userId: 'u-admin',
      type: 'NEW_ORDER',
      title: '¡Nuevo Pedido Online!',
      message: 'Pedido #o-01 por $69.00 de Carlos Pérez',
      isRead: false,
      metadata: { orderId: 'o-01', total: 69 },
      createdAt: daysAgo(1, 16, 35),
    },
    {
      id: 'n-03',
      userId: 'u-admin',
      type: 'OUT_OF_STOCK',
      title: '¡Producto agotado!',
      message: 'El producto "Collar Dije Corazón Plata" tiene 0 unidades en stock.',
      isRead: true,
      metadata: { productId: 'p-06', newStock: 0 },
      createdAt: daysAgo(4, 12, 0),
    },
    {
      id: 'n-04',
      userId: 'u-promo',
      type: 'LOW_STOCK',
      title: '¡Stock bajo!',
      message: 'El producto "Pulsera Acero Negra" tiene 4 unidades en stock.',
      isRead: false,
      metadata: { productId: 'p-09', newStock: 4 },
      createdAt: daysAgo(2, 11, 20),
    },
  );

  // ── Audit logs ─────────────────────────────────────────────────────────────
  stores.auditLog.push(
    { id: 'al-01', userId: 'u-admin', action: 'LOGIN', entity: 'User', entityId: 'u-admin', oldData: null, newData: null, ipAddress: '127.0.0.1', createdAt: daysAgo(1, 8, 5) },
    { id: 'al-02', userId: 'u-admin', action: 'UPDATE_PRODUCT', entity: 'Product', entityId: 'p-03', oldData: { stockMin: 3 }, newData: { stockMin: 4 }, ipAddress: '127.0.0.1', createdAt: daysAgo(2, 15, 40) },
  );

  // ── Settings ───────────────────────────────────────────────────────────────
  stores.setting.push(
    { id: 'st-1', key: 'store_name', value: 'Queen Style', updatedAt: daysAgo(30, 8) },
    { id: 'st-2', key: 'whatsapp_number', value: '584120000000', updatedAt: daysAgo(30, 8) },
  );

  return stores;
}

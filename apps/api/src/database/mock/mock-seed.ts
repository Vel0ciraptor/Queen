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
  costPrice: number;
  salePrice: number;
  initialStock: number;
  stockMin: number;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAtDaysAgo: number;
  withImages?: boolean;
}

const PRODUCTS: SeedProduct[] = [
  { id: 'p-01', sku: 'QS-VST-001', name: 'Vestido Floral Verano', description: 'Vestido largo estampado floral, tela fresca ideal para verano. Tallas S, M, L.', categoryId: 'cat-1', costPrice: 18, salePrice: 45, initialStock: 14, stockMin: 4, createdAtDaysAgo: 16, withImages: true },
  { id: 'p-02', sku: 'QS-VST-002', name: 'Vestido Midi Elegante', description: 'Vestido midi con cintura marcada, perfecto para eventos formales.', categoryId: 'cat-1', costPrice: 22, salePrice: 59, initialStock: 9, stockMin: 3, createdAtDaysAgo: 16, withImages: true },
  { id: 'p-03', sku: 'QS-VST-003', name: 'Vestido Negro Clásico', description: 'El imprescindible vestido negro, corte recto y elegante.', categoryId: 'cat-1', costPrice: 20, salePrice: 52, initialStock: 3, stockMin: 4, createdAtDaysAgo: 15, withImages: true },
  { id: 'p-04', sku: 'QS-BLS-001', name: 'Blusa Seda Blanca', description: 'Blusa de seda sintética con cuello tipo camisa. Look oficina.', categoryId: 'cat-2', costPrice: 12, salePrice: 32, initialStock: 20, stockMin: 5, createdAtDaysAgo: 15, withImages: true },
  { id: 'p-05', sku: 'QS-BLS-002', name: 'Blusa Oversize Rosa', description: 'Blusa oversize color rosa Queen, tejido algodón suave.', categoryId: 'cat-2', costPrice: 10, salePrice: 28, initialStock: 11, stockMin: 4, createdAtDaysAgo: 14, withImages: true },
  { id: 'p-06', sku: 'QS-BLS-003', name: 'Blusa Bordada Artesanal', description: 'Blusa con bordado hecho a mano, piezas únicas.', categoryId: 'cat-2', costPrice: 14, salePrice: 38, initialStock: 0, stockMin: 3, createdAtDaysAgo: 14, withImages: false },
  { id: 'p-07', sku: 'QS-PNT-001', name: 'Jean Skinny Azul', description: 'Jean skinny tiro alto, denim con stretch. Tallas 26-32.', categoryId: 'cat-3', costPrice: 15, salePrice: 42, initialStock: 16, stockMin: 5, createdAtDaysAgo: 14, withImages: true },
  { id: 'p-08', sku: 'QS-PNT-002', name: 'Pantalón Wide Leg', description: 'Pantalón de pierna ancha con vuelo, súper favorecedor.', categoryId: 'cat-3', costPrice: 16, salePrice: 46, initialStock: 8, stockMin: 3, createdAtDaysAgo: 13, withImages: true },
  { id: 'p-09', sku: 'QS-PNT-003', name: 'Shorts Denim Rotos', description: 'Shorts jeans con desgastes, estilo urbano.', categoryId: 'cat-3', costPrice: 9, salePrice: 26, initialStock: 4, stockMin: 4, createdAtDaysAgo: 13, withImages: false },
  { id: 'p-10', sku: 'QS-ACC-001', name: 'Bolso Tote Cuero', description: 'Bolso tote tipo shopper, acabado en cuero vegano.', categoryId: 'cat-4', costPrice: 25, salePrice: 68, initialStock: 7, stockMin: 2, createdAtDaysAgo: 12, withImages: true },
  { id: 'p-11', sku: 'QS-ACC-002', name: 'Pañuelo Seda Estampado', description: 'Pañuelo cuadrado estampado, múltiples usos.', categoryId: 'cat-4', costPrice: 6, salePrice: 19, initialStock: 25, stockMin: 6, createdAtDaysAgo: 12, withImages: false },
  { id: 'p-12', sku: 'QS-ACC-003', name: 'Cinturón Dorado', description: 'Cinturón con hebilla dorada, marca la cintura.', categoryId: 'cat-4', costPrice: 5, salePrice: 17, initialStock: 4, stockMin: 3, createdAtDaysAgo: 12, withImages: false },
  { id: 'p-13', sku: 'QS-ZAP-001', name: 'Tacones Rojos Passion', description: 'Tacones rojos de 8 cm, piel sintética forrada.', categoryId: 'cat-5', costPrice: 28, salePrice: 75, initialStock: 6, stockMin: 2, createdAtDaysAgo: 11, withImages: true },
  { id: 'p-14', sku: 'QS-ZAP-002', name: 'Sneakers Blancos Urban', description: 'Zapatillas blancas minimalistas, suela antideslizante.', categoryId: 'cat-5', costPrice: 24, salePrice: 65, initialStock: 12, stockMin: 4, createdAtDaysAgo: 11, withImages: true },
  { id: 'p-15', sku: 'QS-ZAP-003', name: 'Sandalias Doradas', description: 'Sandalias planas con tiras doradas, cómodas para el día a día.', categoryId: 'cat-5', costPrice: 11, salePrice: 34, initialStock: 10, stockMin: 3, status: 'INACTIVE', createdAtDaysAgo: 11, withImages: true },
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
  daysAgo: number;
  h: number;
  items: SeedOrderItem[];
  deliveryFee: number;
  address: string;
  notes?: string;
  whatsappSent: boolean;
}

const ORDERS: SeedOrder[] = [
  { id: 'o-01', customerId: 'c-2', status: 'PENDING', daysAgo: 1, h: 16, items: [{ productId: 'p-01', quantity: 1 }, { productId: 'p-11', quantity: 1 }], deliveryFee: 5, address: 'Av. Principal 123, Caracas', notes: 'Entregar después de las 5pm', whatsappSent: true },
  { id: 'o-02', customerId: 'c-4', status: 'CONFIRMED', daysAgo: 3, h: 11, items: [{ productId: 'p-13', quantity: 1 }, { productId: 'p-14', quantity: 1 }], deliveryFee: 0, address: 'Calle Bolívar 45, Los Teques', whatsappSent: true },
  { id: 'o-03', customerId: 'c-1', status: 'DELIVERED', daysAgo: 8, h: 9, items: [{ productId: 'p-07', quantity: 1 }], deliveryFee: 5, address: 'Urb. Las Flores, casa 8', whatsappSent: true },
  { id: 'o-04', customerId: 'c-3', status: 'CANCELLED', daysAgo: 2, h: 18, items: [{ productId: 'p-05', quantity: 1 }], deliveryFee: 5, address: 'Sector Norte 7', whatsappSent: false },
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

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = [
    { id: 'cat-1', name: 'Vestidos', description: 'Vestidos casuales y formales para toda ocasión' },
    { id: 'cat-2', name: 'Blusas', description: 'Blusas y tops de temporada' },
    { id: 'cat-3', name: 'Pantalones', description: 'Jeans, pantalones y shorts' },
    { id: 'cat-4', name: 'Accesorios', description: 'Bolsos, pañuelos, cinturones y más' },
    { id: 'cat-5', name: 'Zapatos', description: 'Tacones, sneakers y sandalias' },
  ];
  for (const c of categories) {
    stores.category.push({
      ...c,
      isActive: true,
      createdAt: daysAgo(28, 8),
      updatedAt: daysAgo(28, 8),
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
      stores.orderItem.push({
        id: `oi-${o.id}-${++itemSeq}`,
        orderId: o.id,
        productId: p.id,
        quantity: item.quantity,
        unitPrice: p.salePrice,
        subtotal: itemSubtotal,
      });
    }

    const total = subtotal + o.deliveryFee;

    stores.order.push({
      id: o.id,
      customerId: o.customerId,
      status: o.status,
      subtotal,
      deliveryFee: o.deliveryFee,
      total,
      address: o.address,
      notes: o.notes ?? null,
      whatsappSent: o.whatsappSent,
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
      message: 'El producto "Cinturón Dorado" tiene 1 unidades en stock.',
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
      message: 'El producto "Blusa Bordada Artesanal" tiene 0 unidades en stock.',
      isRead: true,
      metadata: { productId: 'p-06', newStock: 0 },
      createdAt: daysAgo(4, 12, 0),
    },
    {
      id: 'n-04',
      userId: 'u-promo',
      type: 'LOW_STOCK',
      title: '¡Stock bajo!',
      message: 'El producto "Shorts Denim Rotos" tiene 4 unidades en stock.',
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

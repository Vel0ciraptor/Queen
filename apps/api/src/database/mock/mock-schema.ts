export type RelationKind = 'one' | 'many' | 'reverseOne';

export interface RelationDef {
  kind: RelationKind;
  // Modelo relacionado (tabla destino)
  target: string;
  // 'one': FK en este modelo apuntando a target.id
  // 'many': FK en target apuntando a este.id (retorna array)
  // 'reverseOne': FK único en target apuntando a este.id (retorna fila única)
  foreignKey: string;
}

export interface ModelDef {
  relations: Record<string, RelationDef>;
  defaults?: Record<string, any>;
  nullable?: string[];
  dates?: string[];
  unique?: string[];
}

const DATES = ['createdAt', 'updatedAt', 'date'];

export const MODELS: Record<string, ModelDef> = {
  user: {
    relations: {
      sales: { kind: 'many', target: 'sale', foreignKey: 'userId' },
      auditLogs: { kind: 'many', target: 'auditLog', foreignKey: 'userId' },
      notifications: { kind: 'many', target: 'notification', foreignKey: 'userId' },
    },
    defaults: { role: 'PROMOTORA', isActive: true },
    nullable: [],
    dates: DATES,
    unique: ['email'],
  },
  category: {
    relations: {
      products: { kind: 'many', target: 'product', foreignKey: 'categoryId' },
      materialProducts: { kind: 'many', target: 'product', foreignKey: 'materialId' },
      colorProducts: { kind: 'many', target: 'product', foreignKey: 'colorId' },
      shapeProducts: { kind: 'many', target: 'product', foreignKey: 'shapeId' },
      parent: { kind: 'one', target: 'category', foreignKey: 'parentId' },
      children: { kind: 'many', target: 'category', foreignKey: 'parentId' },
    },
    defaults: { isActive: true, dimension: 'TYPE' },
    nullable: ['description', 'parentId'],
    dates: DATES,
    unique: [],
  },
  product: {
    relations: {
      category: { kind: 'one', target: 'category', foreignKey: 'categoryId' },
      material: { kind: 'one', target: 'category', foreignKey: 'materialId' },
      color: { kind: 'one', target: 'category', foreignKey: 'colorId' },
      shape: { kind: 'one', target: 'category', foreignKey: 'shapeId' },
      images: { kind: 'many', target: 'productImage', foreignKey: 'productId' },
      inventory: { kind: 'reverseOne', target: 'inventory', foreignKey: 'productId' },
      qrCode: { kind: 'reverseOne', target: 'qRCode', foreignKey: 'productId' },
      saleItems: { kind: 'many', target: 'saleItem', foreignKey: 'productId' },
      orderItems: { kind: 'many', target: 'orderItem', foreignKey: 'productId' },
      countItems: { kind: 'many', target: 'inventoryCountItem', foreignKey: 'productId' },
    },
    defaults: { status: 'ACTIVE', stockMin: 0 },
    nullable: ['description', 'stockMax', 'materialId', 'colorId', 'shapeId'],
    dates: DATES,
    unique: ['sku'],
  },
  productImage: {
    relations: {
      product: { kind: 'one', target: 'product', foreignKey: 'productId' },
    },
    defaults: { isPrimary: false, order: 0 },
    nullable: ['altText'],
    dates: ['createdAt'],
    unique: [],
  },
  inventory: {
    relations: {
      product: { kind: 'one', target: 'product', foreignKey: 'productId' },
      movements: { kind: 'many', target: 'inventoryMovement', foreignKey: 'inventoryId' },
      locations: { kind: 'many', target: 'inventoryStockLocation', foreignKey: 'inventoryId' },    },
    defaults: { stock: 0 },
    nullable: [],
    dates: ['updatedAt'],
    unique: ['productId'],
  },
  inventoryStockLocation: {
    relations: {
      inventory: { kind: 'one', target: 'inventory', foreignKey: 'inventoryId' },
    },
    defaults: { quantity: 0 },
    nullable: [],
    dates: ['updatedAt'],
    // Ojo: el motor mock aplica `unique` como restricción por campo individual,
    // por lo que el único compuesto (inventoryId, location) se valida en el servicio.
    unique: [],
  },
  inventoryMovement: {
    relations: {
      inventory: { kind: 'one', target: 'inventory', foreignKey: 'inventoryId' },
    },
    defaults: {},
    nullable: ['reference', 'notes', 'createdBy', 'fromLocation', 'location'],
    dates: ['createdAt'],
    unique: [],
  },
  inventoryCount: {
    relations: {
      items: { kind: 'many', target: 'inventoryCountItem', foreignKey: 'countId' },
    },
    defaults: { status: 'IN_PROGRESS', frequency: 'ONCE' },
    nullable: ['notes', 'countedBy', 'startedAt', 'completedAt'],
    dates: DATES,
    unique: [],
  },
  inventoryCountItem: {
    relations: {
      count: { kind: 'one', target: 'inventoryCount', foreignKey: 'countId' },
      product: { kind: 'one', target: 'product', foreignKey: 'productId' },
    },
    defaults: {},
    nullable: ['counted', 'diff', 'checkedAt'],
    dates: ['checkedAt'],
    unique: [],
  },
  qRCode: {
    relations: {
      product: { kind: 'one', target: 'product', foreignKey: 'productId' },
    },
    defaults: {},
    nullable: ['imageUrl'],
    dates: ['createdAt'],
    unique: ['productId', 'code'],
  },
  customer: {
    relations: {
      orders: { kind: 'many', target: 'order', foreignKey: 'customerId' },
      sales: { kind: 'many', target: 'sale', foreignKey: 'customerId' },
    },
    defaults: {},
    nullable: ['phone', 'email', 'address', 'notes'],
    dates: DATES,
    unique: ['phone'],
  },
  sale: {
    relations: {
      user: { kind: 'one', target: 'user', foreignKey: 'userId' },
      customer: { kind: 'one', target: 'customer', foreignKey: 'customerId' },
      items: { kind: 'many', target: 'saleItem', foreignKey: 'saleId' },
      payments: { kind: 'many', target: 'payment', foreignKey: 'saleId' },
      orders: { kind: 'many', target: 'order', foreignKey: 'saleId' },
    },
    defaults: { status: 'COMPLETED', discount: 0 },
    nullable: ['customerId', 'notes'],
    dates: DATES,
    unique: [],
  },
  saleItem: {
    relations: {
      sale: { kind: 'one', target: 'sale', foreignKey: 'saleId' },
      product: { kind: 'one', target: 'product', foreignKey: 'productId' },
    },
    defaults: {},
    nullable: [],
    dates: [],
    unique: [],
  },
  order: {
    relations: {
      customer: { kind: 'one', target: 'customer', foreignKey: 'customerId' },
      sale: { kind: 'one', target: 'sale', foreignKey: 'saleId' },
      items: { kind: 'many', target: 'orderItem', foreignKey: 'orderId' },
      payments: { kind: 'many', target: 'payment', foreignKey: 'orderId' },
    },
    defaults: { status: 'PENDING', fulfillmentType: 'PICKUP', deliveryFee: 0, whatsappSent: false },
    nullable: ['customerId', 'address', 'notes', 'saleId'],
    dates: DATES,
    unique: [],
  },
  orderItem: {
    relations: {
      order: { kind: 'one', target: 'order', foreignKey: 'orderId' },
      product: { kind: 'one', target: 'product', foreignKey: 'productId' },
    },
    defaults: {},
    nullable: ['checkedAt', 'checkedBy'],
    dates: ['checkedAt'],
    unique: [],
  },
  payment: {
    relations: {
      sale: { kind: 'one', target: 'sale', foreignKey: 'saleId' },
      order: { kind: 'one', target: 'order', foreignKey: 'orderId' },
    },
    defaults: { status: 'COMPLETED' },
    nullable: ['saleId', 'orderId', 'reference'],
    dates: ['createdAt'],
    unique: [],
  },
  financialTransaction: {
    relations: {},
    defaults: {},
    nullable: ['category', 'reference'],
    dates: ['date', 'createdAt'],
    unique: [],
  },
  auditLog: {
    relations: {
      user: { kind: 'one', target: 'user', foreignKey: 'userId' },
    },
    defaults: {},
    nullable: ['userId', 'entityId', 'oldData', 'newData', 'ipAddress'],
    dates: ['createdAt'],
    unique: [],
  },
  notification: {
    relations: {
      user: { kind: 'one', target: 'user', foreignKey: 'userId' },
    },
    defaults: { isRead: false },
    nullable: ['metadata'],
    dates: ['createdAt'],
    unique: [],
  },
  setting: {
    relations: {},
    defaults: {},
    nullable: [],
    dates: ['updatedAt'],
    unique: ['key'],
  },
};

export const MODEL_NAMES = Object.keys(MODELS);

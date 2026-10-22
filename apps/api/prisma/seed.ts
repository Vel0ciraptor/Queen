import { PrismaClient, Role, ProductStatus, MovementType, PaymentMethod, SaleStatus, OrderStatus, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Queen Style ERP...');

  // 1. Create Users
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const promotoraPassword = await bcrypt.hash('Promotora123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@queenstyle.com' },
    update: {},
    create: {
      email: 'admin@queenstyle.com',
      password: adminPassword,
      name: 'Administradora Queen',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const promotora = await prisma.user.upsert({
    where: { email: 'promotora@queenstyle.com' },
    update: {},
    create: {
      email: 'promotora@queenstyle.com',
      password: promotoraPassword,
      name: 'Ana Promotora',
      role: Role.PROMOTORA,
      isActive: true,
    },
  });

  console.log(`✅ Users created: Admin (${admin.email}), Promotora (${promotora.email})`);

  // 2. Create Categories (por dimensión, con subcategorías)
  type SeedCat = { name: string; dimension: 'TYPE' | 'MATERIAL' | 'COLOR' | 'SHAPE'; parent?: string; description?: string };
  const categoriesData: SeedCat[] = [
    // ── TIPO ──
    { name: 'Anillos', dimension: 'TYPE', description: 'Anillos de fantasía y compromiso' },
    { name: 'Anillos de compromiso', dimension: 'TYPE', parent: 'Anillos', description: 'Anillos con piedra central' },
    { name: 'Alianzas', dimension: 'TYPE', parent: 'Anillos', description: 'Alianzas de boda' },
    { name: 'Collares', dimension: 'TYPE', description: 'Collares y cadenas' },
    { name: 'Pulseras', dimension: 'TYPE', description: 'Pulseras y manillas' },
    { name: 'Aretes', dimension: 'TYPE', description: 'Aretes y pendientes' },
    { name: 'Dijes', dimension: 'TYPE', description: 'Dijes y colgantes' },
    // ── MATERIAL ──
    { name: 'Oro', dimension: 'MATERIAL', description: 'Joyas de oro' },
    { name: 'Oro 18k', dimension: 'MATERIAL', parent: 'Oro', description: 'Oro 18 quilates' },
    { name: 'Oro 14k', dimension: 'MATERIAL', parent: 'Oro', description: 'Oro 14 quilates' },
    { name: 'Plata', dimension: 'MATERIAL', description: 'Plata de ley' },
    { name: 'Oro blanco', dimension: 'MATERIAL', description: 'Oro blanco' },
    { name: 'Acero', dimension: 'MATERIAL', description: 'Acero inoxidable' },
    // ── COLOR ──
    { name: 'Dorado', dimension: 'COLOR', description: 'Color dorado' },
    { name: 'Plateado', dimension: 'COLOR', description: 'Color plateado' },
    { name: 'Rosa', dimension: 'COLOR', description: 'Rosa / oro rosa' },
    { name: 'Negro', dimension: 'COLOR', description: 'Color negro' },
    { name: 'Blanco', dimension: 'COLOR', description: 'Color blanco' },
    // ── FORMA (opcional) ──
    { name: 'Redondo', dimension: 'SHAPE', description: 'Forma redonda' },
    { name: 'Corazón', dimension: 'SHAPE', description: 'Forma de corazón' },
    { name: 'Estrella', dimension: 'SHAPE', description: 'Forma de estrella' },
    { name: 'Cuadrado', dimension: 'SHAPE', description: 'Forma cuadrada' },
  ];

  const categoryMap = new Map<string, string>(); // "dimension:name" -> id

  // Crear primero las raíz, luego las hijas (para resolver parentId).
  for (const pass of [0, 1]) {
    for (const cat of categoriesData) {
      const isChild = !!cat.parent;
      if ((pass === 0 && isChild) || (pass === 1 && !isChild)) continue;

      const parentId = cat.parent ? categoryMap.get(`${cat.dimension}:${cat.parent}`)! : null;
      const existing = await prisma.category.findFirst({
        where: { name: cat.name, dimension: cat.dimension, parentId },
      });
      const created =
        existing ??
        (await prisma.category.create({
          data: { name: cat.name, dimension: cat.dimension, parentId, description: cat.description },
        }));
      categoryMap.set(`${cat.dimension}:${cat.name}`, created.id);
    }
  }

  console.log(`✅ ${categoriesData.length} Categories created`);

  // 3. Create Products with Inventory, QR Codes, and Images
  const productsData = [
    {
      sku: 'QS-ANL-001',
      name: 'Anillo Solitario Oro 18k',
      description: 'Anillo solitario con piedra central, oro 18k. Ideal para compromisos.',
      type: 'Anillos de compromiso', material: 'Oro 18k', color: 'Dorado', shape: 'Redondo',
      costPrice: 120.00, salePrice: 280.00, stockMin: 3, stock: 10,
      images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop'],
    },
    {
      sku: 'QS-ANL-002',
      name: 'Anillo Compromiso Corazón',
      description: 'Anillo de compromiso con piedra en forma de corazón, oro 18k.',
      type: 'Anillos de compromiso', material: 'Oro 18k', color: 'Dorado', shape: 'Corazón',
      costPrice: 150.00, salePrice: 340.00, stockMin: 2, stock: 6,
      images: ['https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop'],
    },
    {
      sku: 'QS-COL-002',
      name: 'Collar Dije Corazón Plata',
      description: 'Collar de plata con dije de corazón. Pieza delicada y moderna.',
      type: 'Collares', material: 'Plata', color: 'Plateado', shape: 'Corazón',
      costPrice: 35.00, salePrice: 85.00, stockMin: 4, stock: 14,
      images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop'],
    },
    {
      sku: 'QS-PUL-001',
      name: 'Pulsera Eslabones Oro 18k',
      description: 'Pulsera de eslabones en oro 18k, hebillón seguro.',
      type: 'Pulseras', material: 'Oro 18k', color: 'Dorado', shape: undefined,
      costPrice: 130.00, salePrice: 300.00, stockMin: 2, stock: 7,
      images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop'],
    },
    {
      sku: 'QS-ART-001',
      name: 'Aretes Estrella Oro 14k',
      description: 'Aretes en forma de estrella en oro 14k, cierre de presión.',
      type: 'Aretes', material: 'Oro 14k', color: 'Dorado', shape: 'Estrella',
      costPrice: 55.00, salePrice: 130.00, stockMin: 3, stock: 8,
      images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop'],
    },
    {
      sku: 'QS-ART-003',
      name: 'Aretes Cuadrado Oro Blanco',
      description: 'Aretes cuadrados en oro blanco, diseño geométrico.',
      type: 'Aretes', material: 'Oro blanco', color: 'Blanco', shape: 'Cuadrado',
      costPrice: 65.00, salePrice: 150.00, stockMin: 2, stock: 5, // low stock trigger
      images: ['https://images.unsplash.com/photo-1588444650733-d0767b753fc8?w=800&auto=format&fit=crop'],
    },
  ];

  for (const item of productsData) {
    const categoryId = categoryMap.get(`TYPE:${item.type}`)!;
    const materialId = categoryMap.get(`MATERIAL:${item.material}`)!;
    const colorId = categoryMap.get(`COLOR:${item.color}`)!;
    const shapeId = item.shape ? categoryMap.get(`SHAPE:${item.shape}`)! : null;

    const existingProduct = await prisma.product.findUnique({
      where: { sku: item.sku },
    });

    if (!existingProduct) {
      const product = await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          description: item.description,
          categoryId,
          materialId,
          colorId,
          shapeId,
          costPrice: item.costPrice,
          salePrice: item.salePrice,
          stockMin: item.stockMin,
          status: ProductStatus.ACTIVE,
          images: {
            create: item.images.map((url, idx) => ({
              url,
              isPrimary: idx === 0,
              order: idx,
            })),
          },
          inventory: {
            create: {
              stock: item.stock,
              movements: {
                create: {
                  type: MovementType.PURCHASE,
                  quantity: item.stock,
                  reference: 'Stock Inicial',
                  notes: 'Inventario inicial de prueba',
                },
              },
            },
          },
          qrCode: {
            create: {
              code: item.sku,
            },
          },
        },
      });
      console.log(`  ➕ Product created: ${product.name} (${product.sku})`);
    }
  }

  // 4. Create Sample Customers
  const customersData = [
    { name: 'Carolina Mendoza', phone: '+584129876543', email: 'carolina.m@example.com', address: 'Las Mercedes, Calle París' },
    { name: 'Valeria Rivas', phone: '+584141122334', email: 'valeria.r@example.com', address: 'Chacao, Av. Francisco de Miranda' },
    { name: 'Daniela Salazar', phone: '+584245566778', email: 'daniela.s@example.com', address: 'Altamira Sur, Res. Las Palmas' },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { phone: c.phone },
      update: {},
      create: c,
    });
  }
  console.log(`✅ Sample customers created`);

  // 5. Create Initial Setting
  await prisma.setting.upsert({
    where: { key: 'store_whatsapp' },
    update: {},
    create: {
      key: 'store_whatsapp',
      value: '+584120000000',
    },
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

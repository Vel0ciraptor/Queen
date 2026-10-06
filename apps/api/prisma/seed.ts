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

  // 2. Create Categories
  const categoriesData = [
    { name: 'Vestidos de Gala', description: 'Vestidos largos elegantes para fiestas y ocasiones especiales' },
    { name: 'Conjuntos & Trajes', description: 'Conjuntos de dos piezas de alta costura y sastre femenino' },
    { name: 'Blusas & Tops', description: 'Tops de satén, lino y seda para cualquier ocasión' },
    { name: 'Pantalones & Faldas', description: 'Pantalones palazzo, faldas midi y plisadas de temporada' },
    { name: 'Accesorios & Joyería', description: 'Carteras de fiesta, collares y complementos exclusivos' },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap.set(cat.name, created.id);
  }

  console.log(`✅ ${categoriesData.length} Categories created`);

  // 3. Create Products with Inventory, QR Codes, and Images
  const productsData = [
    {
      sku: 'QS-DRS-001',
      name: 'Vestido Imperial Escarlata',
      description: 'Vestido largo en satén de seda escarlata con escote drapeado y corte sirena.',
      category: 'Vestidos de Gala',
      costPrice: 42.00,
      salePrice: 89.99,
      stockMin: 3,
      stock: 15,
      images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop',
      ],
    },
    {
      sku: 'QS-DRS-002',
      name: 'Vestido Noche Esmeralda',
      description: 'Vestido de noche en terciopelo verde esmeralda con abertura lateral y espalda descubierta.',
      category: 'Vestidos de Gala',
      costPrice: 48.00,
      salePrice: 110.00,
      stockMin: 2,
      stock: 8,
      images: [
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop',
      ],
    },
    {
      sku: 'QS-SET-001',
      name: 'Conjunto Sastre Perla',
      description: 'Conjunto blazer entallado y pantalón palazzo en lino blanco marfil con botones dorados.',
      category: 'Conjuntos & Trajes',
      costPrice: 55.00,
      salePrice: 125.00,
      stockMin: 4,
      stock: 12,
      images: [
        'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=800&auto=format&fit=crop',
      ],
    },
    {
      sku: 'QS-TOP-001',
      name: 'Blusa Drapeada Rosa Gold',
      description: 'Blusa en gasa fina con textura metalizada y cuello halter satinado.',
      category: 'Blusas & Tops',
      costPrice: 18.00,
      salePrice: 38.50,
      stockMin: 5,
      stock: 20,
      images: [
        'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800&auto=format&fit=crop',
      ],
    },
    {
      sku: 'QS-SKT-001',
      name: 'Falda Plisada Champagne',
      description: 'Falda midi de corte evasé plisado en satén brillante color champagne.',
      category: 'Pantalones & Faldas',
      costPrice: 22.00,
      salePrice: 49.00,
      stockMin: 3,
      stock: 4, // low stock trigger
      images: [
        'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop',
      ],
    },
    {
      sku: 'QS-ACC-001',
      name: 'Clutch Joya Midnight',
      description: 'Cartera de mano rígida con incrustaciones de cristales y cadena dorada desmontable.',
      category: 'Accesorios & Joyería',
      costPrice: 15.00,
      salePrice: 35.00,
      stockMin: 2,
      stock: 18,
      images: [
        'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&auto=format&fit=crop',
      ],
    },
  ];

  for (const item of productsData) {
    const categoryId = categoryMap.get(item.category)!;

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

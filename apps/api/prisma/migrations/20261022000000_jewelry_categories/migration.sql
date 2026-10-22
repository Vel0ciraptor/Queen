-- CreateEnum
CREATE TYPE "CategoryDimension" AS ENUM ('TYPE', 'MATERIAL', 'COLOR', 'SHAPE');

-- AlterTable: categories -> dimensión + jerarquía (subcategorías)
ALTER TABLE "categories" ADD COLUMN "dimension" "CategoryDimension" NOT NULL DEFAULT 'TYPE';
ALTER TABLE "categories" ADD COLUMN "parentId" TEXT;

-- DropIndex: el nombre ya no es único globalmente (se valida por dimensión y nivel)
DROP INDEX "categories_name_key";

-- AlterTable: productos -> referencias por dimensión (material/color requeridos a nivel de API; forma opcional)
ALTER TABLE "products" ADD COLUMN "materialId" TEXT;
ALTER TABLE "products" ADD COLUMN "colorId" TEXT;
ALTER TABLE "products" ADD COLUMN "shapeId" TEXT;

-- CreateIndex
CREATE INDEX "categories_dimension_idx" ON "categories"("dimension");

-- CreateIndex: nombre único dentro de la misma dimensión y nivel (padre)
CREATE UNIQUE INDEX "categories_dimension_parentId_name_key" ON "categories"("dimension", "parentId", "name");

-- CreateIndex
CREATE INDEX "products_materialId_idx" ON "products"("materialId");
CREATE INDEX "products_colorId_idx" ON "products"("colorId");
CREATE INDEX "products_shapeId_idx" ON "products"("shapeId");

-- AddForeignKey: jerarquía de categorías (self-relation)
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: dimensiones de producto
ALTER TABLE "products" ADD CONSTRAINT "products_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_shapeId_fkey" FOREIGN KEY ("shapeId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

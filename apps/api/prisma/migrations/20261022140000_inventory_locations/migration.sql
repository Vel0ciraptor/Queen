-- CreateEnum
CREATE TYPE "StockLocation" AS ENUM ('BODEGA', 'TIENDA', 'ONLINE', 'LIVE');

-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN "fromLocation" "StockLocation",
ADD COLUMN "location" "StockLocation";

-- CreateTable
CREATE TABLE "inventory_stock_locations" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "location" "StockLocation" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_stock_locations_inventoryId_idx" ON "inventory_stock_locations"("inventoryId");

-- CreateIndex
CREATE INDEX "inventory_stock_locations_location_idx" ON "inventory_stock_locations"("location");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_locations_inventoryId_location_key" ON "inventory_stock_locations"("inventoryId", "location");

-- CreateIndex
CREATE INDEX "inventory_movements_location_idx" ON "inventory_movements"("location");

-- AddForeignKey
ALTER TABLE "inventory_stock_locations" ADD CONSTRAINT "inventory_stock_locations_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

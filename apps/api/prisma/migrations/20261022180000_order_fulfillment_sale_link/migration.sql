-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checkedBy" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "fulfillmentType" "OrderFulfillmentType" NOT NULL DEFAULT 'PICKUP',
ADD COLUMN     "saleId" TEXT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "public"."MerchandiseType" AS ENUM ('BASE_ITEM', 'TOPPING', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('ORDERED', 'PAID', 'COOKING', 'READY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."OrderGroupStatus" AS ENUM ('NOT_READY', 'PREPARING', 'READY');

-- CreateTable
CREATE TABLE "public"."merchandise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "type" "public"."MerchandiseType" NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchandise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "call_num" INTEGER NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'ORDERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_item_groups" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "public"."OrderGroupStatus" NOT NULL DEFAULT 'NOT_READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_items" (
    "id" TEXT NOT NULL,
    "order_item_group_id" TEXT NOT NULL,
    "merchandise_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_call_num_key" ON "public"."orders"("call_num");

-- AddForeignKey
ALTER TABLE "public"."order_item_groups" ADD CONSTRAINT "order_item_groups_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_order_item_group_id_fkey" FOREIGN KEY ("order_item_group_id") REFERENCES "public"."order_item_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_items" ADD CONSTRAINT "order_items_merchandise_id_fkey" FOREIGN KEY ("merchandise_id") REFERENCES "public"."merchandise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

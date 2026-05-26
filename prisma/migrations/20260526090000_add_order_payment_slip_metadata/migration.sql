ALTER TABLE "Order" ADD COLUMN "paymentSlipStorageKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentSlipOriginalFileName" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentSlipMimeType" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentSlipSizeBytes" INTEGER;
ALTER TABLE "Order" ADD COLUMN "paymentSlipUploadedAt" DATETIME;

CREATE UNIQUE INDEX "Order_paymentSlipStorageKey_key" ON "Order"("paymentSlipStorageKey");

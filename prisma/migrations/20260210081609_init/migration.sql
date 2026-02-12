-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "editCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderDate" TEXT,
    "country" TEXT,
    "model" TEXT,
    "drive" TEXT,
    "color" TEXT,
    "interior" TEXT,
    "wheels" TEXT,
    "towHitch" TEXT,
    "autopilot" TEXT,
    "deliveryWindow" TEXT,
    "deliveryLocation" TEXT,
    "vin" TEXT,
    "vinReceivedDate" TEXT,
    "papersReceivedDate" TEXT,
    "productionDate" TEXT,
    "typeApproval" TEXT,
    "typeVariant" TEXT,
    "deliveryDate" TEXT,
    "orderToProduction" INTEGER,
    "orderToVin" INTEGER,
    "orderToDelivery" INTEGER,
    "orderToPapers" INTEGER,
    "papersToDelivery" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpires" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "showDonation" BOOLEAN NOT NULL DEFAULT true,
    "donationUrl" TEXT NOT NULL DEFAULT 'https://paypal.me/yourusername',
    "donationText" TEXT NOT NULL DEFAULT 'Support this project',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_editCode_key" ON "Order"("editCode");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

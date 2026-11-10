-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "WalletDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('RESOURCE_VIEW', 'RESOURCE_PDF', 'RESOURCE_DOCX', 'SCHEME_OF_WORK', 'LESSON_PLAN', 'RECORDS_OF_WORK', 'EXAM', 'WALLET_TOPUP');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SCHEME_OF_WORK', 'LESSON_PLAN', 'RECORDS_OF_WORK', 'EXAM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumGrade" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,

    CONSTRAINT "CurriculumGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,

    CONSTRAINT "LearningArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "learningAreaId" TEXT NOT NULL,

    CONSTRAINT "Strand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubStrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strandId" TEXT NOT NULL,

    CONSTRAINT "SubStrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "subStrandId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "WalletDirection" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MpesaPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "merchantRequestId" TEXT,
    "checkoutRequestId" TEXT,
    "mpesaReceiptNumber" TEXT,
    "resultCode" INTEGER,
    "callbackTokenHash" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MpesaPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "amount" INTEGER,
    "status" "ActivityStatus" NOT NULL DEFAULT 'COMPLETED',
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "markingScheme" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_expiresAt_idx" ON "AuthToken"("userId", "type", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumGrade_number_key" ON "CurriculumGrade"("number");

-- CreateIndex
CREATE INDEX "LearningArea_gradeId_idx" ON "LearningArea"("gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningArea_gradeId_name_key" ON "LearningArea"("gradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Strand_learningAreaId_name_key" ON "Strand"("learningAreaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SubStrand_strandId_name_key" ON "SubStrand"("strandId", "name");

-- CreateIndex
CREATE INDEX "Resource_subStrandId_isPublished_idx" ON "Resource"("subStrandId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_reference_key" ON "WalletTransaction"("reference");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_userId_idempotencyKey_key" ON "WalletTransaction"("userId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaPayment_checkoutRequestId_key" ON "MpesaPayment"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaPayment_mpesaReceiptNumber_key" ON "MpesaPayment"("mpesaReceiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaPayment_transactionId_key" ON "MpesaPayment"("transactionId");

-- CreateIndex
CREATE INDEX "MpesaPayment_userId_createdAt_idx" ON "MpesaPayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MpesaPayment_merchantRequestId_idx" ON "MpesaPayment"("merchantRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaPayment_userId_idempotencyKey_key" ON "MpesaPayment"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "ActivityHistory_userId_createdAt_idx" ON "ActivityHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_userId_createdAt_idx" ON "GeneratedDocument"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_userId_idempotencyKey_key" ON "GeneratedDocument"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningArea" ADD CONSTRAINT "LearningArea_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "CurriculumGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strand" ADD CONSTRAINT "Strand_learningAreaId_fkey" FOREIGN KEY ("learningAreaId") REFERENCES "LearningArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubStrand" ADD CONSTRAINT "SubStrand_strandId_fkey" FOREIGN KEY ("strandId") REFERENCES "Strand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subStrandId_fkey" FOREIGN KEY ("subStrandId") REFERENCES "SubStrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaPayment" ADD CONSTRAINT "MpesaPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaPayment" ADD CONSTRAINT "MpesaPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityHistory" ADD CONSTRAINT "ActivityHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


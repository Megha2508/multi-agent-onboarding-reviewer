-- CreateTable
CREATE TABLE `OnboardingCaseRecord` (
    `id` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkflowRun` (
    `id` VARCHAR(191) NOT NULL,
    `caseId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'AWAITING_HUMAN_APPROVAL', 'MANUAL_REVIEW', 'COMPLETED', 'FAILED') NOT NULL,
    `autonomyMode` ENUM('HUMAN_APPROVAL_REQUIRED', 'REVIEW_ON_EXCEPTION') NOT NULL,
    `recommendation` ENUM('APPROVE', 'REJECT', 'REFER') NULL,
    `explanation` TEXT NULL,
    `confidence` DOUBLE NULL,
    `trace` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentResult` (
    `id` VARCHAR(191) NOT NULL,
    `workflowRunId` VARCHAR(191) NOT NULL,
    `agentName` VARCHAR(191) NOT NULL,
    `attempt` INTEGER NOT NULL,
    `status` ENUM('COMPLETED', 'FAILED') NOT NULL,
    `findings` JSON NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `output` JSON NULL,
    `error` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgentResult_workflowRunId_idx`(`workflowRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorkflowRun` ADD CONSTRAINT `WorkflowRun_caseId_fkey` FOREIGN KEY (`caseId`) REFERENCES `OnboardingCaseRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentResult` ADD CONSTRAINT `AgentResult_workflowRunId_fkey` FOREIGN KEY (`workflowRunId`) REFERENCES `WorkflowRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1782073425870 implements MigrationInterface {
    name = 'Init1782073425870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "experienceYears"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "linkedinUrl"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "rejectionReason"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "social_provider" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "social_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD CONSTRAINT "CHK_83dfd954c73b41ac5f0f39564d" CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 1000)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD CONSTRAINT "CHK_fd384933c31e2a0724508147f9" CHECK (linkedin_url IS NULL OR (length(linkedin_url) <= 1024 AND linkedin_url ~ '^https?://.+'))`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD CONSTRAINT "CHK_ee4117fab4c2b4786f76a8e094" CHECK (experience_years IS NULL OR experience_years >= 0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP CONSTRAINT "CHK_ee4117fab4c2b4786f76a8e094"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP CONSTRAINT "CHK_fd384933c31e2a0724508147f9"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP CONSTRAINT "CHK_83dfd954c73b41ac5f0f39564d"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "social_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "social_provider"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "rejectionReason" character varying(1000)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "linkedinUrl" character varying(1024)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "experienceYears" integer`);
    }

}

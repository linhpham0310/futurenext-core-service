import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1781856249786 implements MigrationInterface {
    name = 'Init1781856249786'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_credentials" ("user_id" uuid NOT NULL, "password_hash" text NOT NULL, "password_algo" text NOT NULL DEFAULT 'bcrypt', "password_updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "must_change_password" boolean NOT NULL DEFAULT false, CONSTRAINT "CHK_d18c3f9696cbce32c6b665ed53" CHECK ("password_algo" = 'bcrypt'), CONSTRAINT "PK_dd0918407944553611bb3eb3ddc" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TABLE "auth_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "refresh_token_hash" text NOT NULL, "role_at_login" text NOT NULL, "ip" inet, "user_agent" character varying(512), "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8ae45196f82be4540770b41ac50" UNIQUE ("refresh_token_hash"), CONSTRAINT "CHK_c178a7f9e1ee1dc6f3f5861a86" CHECK (user_agent IS NULL OR length(user_agent) <= 512), CONSTRAINT "CHK_7e6743254a4199d0fc5d6e8995" CHECK ("role_at_login" IN ('student', 'teacher', 'admin')), CONSTRAINT "PK_641507381f32580e8479efc36cd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8ae45196f82be4540770b41ac5" ON "auth_sessions" ("refresh_token_hash") `);
        await queryRunner.query(`CREATE INDEX "idx_auth_sessions_expires_at" ON "auth_sessions" ("expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "user_consents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "consent_version" character varying(50) NOT NULL, "consent_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "ip_address" inet, "user_agent" character varying(512), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_0fc2a38ed89e4b5dba99ab87fe" CHECK (user_agent IS NULL OR length(user_agent) <= 512), CONSTRAINT "CHK_d139787050c32c072c3d957ebc" CHECK (length(consent_version) > 0 AND length(consent_version) <= 50), CONSTRAINT "PK_65e4c6d6204ad8719abf4b30326" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_consents_user_id" ON "user_consents" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "teacher_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "status" text NOT NULL DEFAULT 'pending_review', "bio" character varying(2000), "expertise" text array, "experience_years" integer, "linkedin_url" character varying(1024), "rejection_reason" character varying(1000), "reviewed_by_user_id" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_b9627de400103265c502c57b56b" UNIQUE ("user_id"), CONSTRAINT "REL_b9627de400103265c502c57b56" UNIQUE ("user_id"), CONSTRAINT "CHK_83dfd954c73b41ac5f0f39564d" CHECK (rejection_reason IS NULL OR length(rejection_reason) <= 1000), CONSTRAINT "CHK_fd384933c31e2a0724508147f9" CHECK (linkedin_url IS NULL OR (length(linkedin_url) <= 1024 AND linkedin_url ~ '^https?://.+')), CONSTRAINT "CHK_ee4117fab4c2b4786f76a8e094" CHECK (experience_years IS NULL OR experience_years >= 0), CONSTRAINT "CHK_a8fedbc896e4a05344dc441ea6" CHECK (bio IS NULL OR length(bio) <= 2000), CONSTRAINT "CHK_b56da81a22835d46a8d4d96dea" CHECK (status IN ('pending_review', 'approved', 'rejected')), CONSTRAINT "PK_fdd17d62015e40674217a407484" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_teacher_profiles_reviewed_by" ON "teacher_profiles" ("reviewed_by_user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_teacher_profiles_status" ON "teacher_profiles" ("status") `);
        await queryRunner.query(`CREATE TABLE "email_verifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "email" citext NOT NULL, "code_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "attempt_count" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_8ebf75c04d0d560dc676e63ca4" CHECK (attempt_count >= 0), CONSTRAINT "PK_c1ea2921e767f83cd44c0af203f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_email_verifications_lookup" ON "email_verifications" ("email", "consumed_at", "expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_email_verifications_email" ON "email_verifications" ("email") `);
        await queryRunner.query(`CREATE INDEX "idx_email_verifications_user_id" ON "email_verifications" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "password_reset_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "email" citext NOT NULL, "code_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4aa83fc224280f3c94c3e214d65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_password_reset_lookup" ON "password_reset_requests" ("email", "consumed_at", "expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_password_reset_user_id" ON "password_reset_requests" ("user_id") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(100) NOT NULL, "email" citext NOT NULL, "phone" character varying(20), "avatar_url" character varying(1024), "role" text NOT NULL DEFAULT 'student', "status" text NOT NULL DEFAULT 'pending_email_verify', "locked_until" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, "locale" character varying(10) NOT NULL DEFAULT 'vi-VN', "timezone" character varying(50) NOT NULL DEFAULT 'Asia/Bangkok', "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "CHK_6a3f4ba999dfdeac6ec1c81a57" CHECK (length(timezone) <= 50), CONSTRAINT "CHK_30c7ba9c77e7889e4c1ae8fce0" CHECK (length(locale) <= 10), CONSTRAINT "CHK_0fcc4369fd29c37bef029d7799" CHECK (avatar_url IS NULL OR (length(avatar_url) <= 1024 AND avatar_url ~ '^https?://.+')), CONSTRAINT "CHK_d4f58e355d8b2492addc789c45" CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'), CONSTRAINT "CHK_da56b1ebd6c310a30012bddbac" CHECK (length(full_name) > 0 AND length(full_name) <= 100), CONSTRAINT "CHK_7e4e28028d623dbc69c0574181" CHECK ("status" IN ('pending_email_verify', 'active', 'locked', 'deleted')), CONSTRAINT "CHK_9104741bb63f31723e14548611" CHECK ("role" IN ('student', 'teacher', 'admin')), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE INDEX "idx_users_role_status" ON "users" ("role", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "security_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actor_id" uuid, "action" character varying(100) NOT NULL, "ip" inet, "user_agent" character varying(512), "meta" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_87f333c3a7a722a872ce12e191" CHECK (user_agent IS NULL OR length(user_agent) <= 512), CONSTRAINT "CHK_9aae460cab2734c9de26c9b85a" CHECK (length(action) > 0 AND length(action) <= 100), CONSTRAINT "PK_c102bef9bbc2775cec64a76c675" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_security_audit_logs_actor_id" ON "security_audit_logs" ("actor_id") `);
        await queryRunner.query(`CREATE INDEX "idx_security_audit_logs_action" ON "security_audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "idx_security_audit_logs_created_at" ON "security_audit_logs" ("created_at") `);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "experience_years"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "linkedin_url"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "experience_years" integer`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "linkedin_url" character varying(1024)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "rejection_reason" character varying(1000)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "experienceYears" integer`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "linkedinUrl" character varying(1024)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "rejectionReason" character varying(1000)`);
        await queryRunner.query(`ALTER TABLE "user_credentials" ADD CONSTRAINT "FK_dd0918407944553611bb3eb3ddc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" ADD CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_consents" ADD CONSTRAINT "FK_6283f1222bdc2390cf16836ce7d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD CONSTRAINT "FK_b9627de400103265c502c57b56b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD CONSTRAINT "FK_44d2f6cb6cf5409bc5655771184" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "email_verifications" ADD CONSTRAINT "FK_c4f1838323ae1dff5aa00148915" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "password_reset_requests" ADD CONSTRAINT "FK_8a8bf5831893c4b0c63f999c2d0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "security_audit_logs" ADD CONSTRAINT "FK_ad39fe26a9df23acc181563dca7" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "security_audit_logs" DROP CONSTRAINT "FK_ad39fe26a9df23acc181563dca7"`);
        await queryRunner.query(`ALTER TABLE "password_reset_requests" DROP CONSTRAINT "FK_8a8bf5831893c4b0c63f999c2d0"`);
        await queryRunner.query(`ALTER TABLE "email_verifications" DROP CONSTRAINT "FK_c4f1838323ae1dff5aa00148915"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP CONSTRAINT "FK_44d2f6cb6cf5409bc5655771184"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP CONSTRAINT "FK_b9627de400103265c502c57b56b"`);
        await queryRunner.query(`ALTER TABLE "user_consents" DROP CONSTRAINT "FK_6283f1222bdc2390cf16836ce7d"`);
        await queryRunner.query(`ALTER TABLE "auth_sessions" DROP CONSTRAINT "FK_50ccaa6440288a06f0ba693ccc6"`);
        await queryRunner.query(`ALTER TABLE "user_credentials" DROP CONSTRAINT "FK_dd0918407944553611bb3eb3ddc"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "rejectionReason"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "linkedinUrl"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "experienceYears"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "linkedin_url"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" DROP COLUMN "experience_years"`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "rejection_reason" character varying(1000)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "linkedin_url" character varying(1024)`);
        await queryRunner.query(`ALTER TABLE "teacher_profiles" ADD "experience_years" integer`);
        await queryRunner.query(`DROP INDEX "public"."idx_security_audit_logs_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_security_audit_logs_action"`);
        await queryRunner.query(`DROP INDEX "public"."idx_security_audit_logs_actor_id"`);
        await queryRunner.query(`DROP TABLE "security_audit_logs"`);
        await queryRunner.query(`DROP INDEX "public"."uq_users_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_role_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."idx_password_reset_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_password_reset_lookup"`);
        await queryRunner.query(`DROP TABLE "password_reset_requests"`);
        await queryRunner.query(`DROP INDEX "public"."idx_email_verifications_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_email_verifications_email"`);
        await queryRunner.query(`DROP INDEX "public"."idx_email_verifications_lookup"`);
        await queryRunner.query(`DROP TABLE "email_verifications"`);
        await queryRunner.query(`DROP INDEX "public"."idx_teacher_profiles_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_teacher_profiles_reviewed_by"`);
        await queryRunner.query(`DROP TABLE "teacher_profiles"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_consents_user_id"`);
        await queryRunner.query(`DROP TABLE "user_consents"`);
        await queryRunner.query(`DROP INDEX "public"."idx_auth_sessions_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_auth_sessions_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ae45196f82be4540770b41ac5"`);
        await queryRunner.query(`DROP TABLE "auth_sessions"`);
        await queryRunner.query(`DROP TABLE "user_credentials"`);
    }

}

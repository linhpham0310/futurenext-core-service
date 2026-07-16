-- Add FK constraints from Prisma-managed tables to TypeORM-managed users table
-- public schema

ALTER TABLE "public"."purchases"
  ADD CONSTRAINT "fk_purchases_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."favorites"
  ADD CONSTRAINT "fk_favorites_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "fk_reviews_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."certificates"
  ADD CONSTRAINT "fk_certificates_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "fk_notifications_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."exam_results"
  ADD CONSTRAINT "fk_exam_results_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."payment_settings"
  ADD CONSTRAINT "fk_payment_settings_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."revenue_transactions"
  ADD CONSTRAINT "fk_revenue_transactions_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."revenue_transactions"
  ADD CONSTRAINT "fk_revenue_transactions_teacher"
  FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "fk_transactions_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL;

ALTER TABLE "public"."CartItem"
  ADD CONSTRAINT "fk_cart_item_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."Question"
  ADD CONSTRAINT "fk_question_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."announcements"
  ADD CONSTRAINT "fk_announcements_teacher"
  FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."exams"
  ADD CONSTRAINT "fk_exams_teacher"
  FOREIGN KEY ("teacherId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- lx schema

ALTER TABLE "lx"."lx_learning_progress"
  ADD CONSTRAINT "fk_lx_learning_progress_user"
  FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;

ALTER TABLE "lx"."lx_ai_interactions"
  ADD CONSTRAINT "fk_lx_ai_interactions_user"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;

-- =============================================
-- Thêm FOREIGN KEY từ Prisma tables → users
-- =============================================
-- Bỏ qua nếu bảng chưa tồn tại

DO $$
BEGIN
    -- purchases
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='purchases') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_purchases_user_id') THEN
            ALTER TABLE public.purchases ADD CONSTRAINT fk_purchases_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- certificates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='certificates') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_certificates_user_id') THEN
            ALTER TABLE public.certificates ADD CONSTRAINT fk_certificates_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- favorites
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='favorites') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_favorites_user_id') THEN
            ALTER TABLE public.favorites ADD CONSTRAINT fk_favorites_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- reviews
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_reviews_user_id') THEN
            ALTER TABLE public.reviews ADD CONSTRAINT fk_reviews_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- notifications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_notifications_user_id') THEN
            ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- questions (kiểm tra tồn tại)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='questions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_questions_user_id') THEN
            ALTER TABLE public.questions ADD CONSTRAINT fk_questions_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- cart_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart_items') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_cart_items_user_id') THEN
            ALTER TABLE public.cart_items ADD CONSTRAINT fk_cart_items_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- exam_results
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='exam_results') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_exam_results_user_id') THEN
            ALTER TABLE public.exam_results ADD CONSTRAINT fk_exam_results_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- revenue_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='revenue_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_revenue_transactions_user_id') THEN
            ALTER TABLE public.revenue_transactions ADD CONSTRAINT fk_revenue_transactions_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_transactions_user_id') THEN
            ALTER TABLE public.transactions ADD CONSTRAINT fk_transactions_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- payment_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_settings') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_payment_settings_user_id') THEN
            ALTER TABLE public.payment_settings ADD CONSTRAINT fk_payment_settings_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- lx_learning_progress
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lx' AND table_name='lx_learning_progress') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_learning_progress_user_id') THEN
            ALTER TABLE lx.lx_learning_progress ADD CONSTRAINT fk_learning_progress_user_id FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- lx_ai_interactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lx' AND table_name='lx_ai_interactions') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_ai_interactions_user_id') THEN
            ALTER TABLE lx.lx_ai_interactions ADD CONSTRAINT fk_ai_interactions_user_id FOREIGN KEY ("user_id") REFERENCES public.users(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- course_mgmt: courses (instructor)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='course_mgmt' AND table_name='courses') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_courses_instructor_id') THEN
            ALTER TABLE course_mgmt.courses ADD CONSTRAINT fk_courses_instructor_id FOREIGN KEY ("instructorId") REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- course_review_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='course_mgmt' AND table_name='course_review_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_course_review_logs_admin_id') THEN
            ALTER TABLE course_mgmt.course_review_logs ADD CONSTRAINT fk_course_review_logs_admin_id FOREIGN KEY ("adminId") REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- exams (teacher)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='exams') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_exams_teacher_id') THEN
            ALTER TABLE public.exams ADD CONSTRAINT fk_exams_teacher_id FOREIGN KEY ("teacherId") REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- announcements (teacher)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='announcements') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_announcements_teacher_id') THEN
            ALTER TABLE public.announcements ADD CONSTRAINT fk_announcements_teacher_id FOREIGN KEY ("teacherId") REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

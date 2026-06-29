import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('CourseController (e2e)', () => {
  let app: INestApplication;
  let teacherToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as teacher
    const teacherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@test.com', password: 'Teacher123@' });
    teacherToken = teacherLogin.body.accessToken;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin123@' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/teacher/courses (POST)', () => {
    it('should create a course as teacher', () => {
      return request(app.getHttpServer())
        .post('/teacher/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'E2E Test Course',
          description: 'Test description',
          price: 100000,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('E2E Test Course');
          expect(res.body.status).toBe('DRAFT');
        });
    });
  });

  describe('/teacher/courses/:id/sections (POST)', () => {
    it('should add a section to course', async () => {
      // First create a course
      const courseRes = await request(app.getHttpServer())
        .post('/teacher/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Course for Section Test',
          description: 'Test description',
        });

      const courseId = courseRes.body.id;

      return request(app.getHttpServer())
        .post(`/teacher/courses/${courseId}/sections`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Test Section',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Section');
        });
    });
  });

  describe('/admin/courses (GET)', () => {
    it('should get all courses as admin', () => {
      return request(app.getHttpServer())
        .get('/admin/courses')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});

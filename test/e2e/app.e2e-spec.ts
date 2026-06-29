import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test-e2e@example.com',
          password: 'Password123@',
          fullName: 'E2E Test User',
          agreeTerms: true,
          role: 'student',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('successfully');
        });
    });

    it('should return 409 if email already exists', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'student@test.com',
          password: 'Password123@',
          fullName: 'Existing User',
          agreeTerms: true,
          role: 'student',
        })
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'Student123@',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'student@test.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });

  describe('/auth/forgot-password (POST)', () => {
    it('should send reset link for existing email', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'student@test.com',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });
});

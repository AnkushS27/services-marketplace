import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test users created during test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['testcustomer@marketplace.test', 'testvendor@marketplace.test', 'dupemail@marketplace.test'],
        },
      },
    });
    await app.close();
  });

  describe('POST /auth/signup/customer', () => {
    it('should register a customer successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/signup/customer')
        .send({
          email: 'testcustomer@marketplace.test',
          password: 'Password123!',
          name: 'Test Customer',
          phone: '1234567890',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('testcustomer@marketplace.test');
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 409 for duplicate email signup', async () => {
      // First signup
      await request(app.getHttpServer())
        .post('/auth/signup/customer')
        .send({
          email: 'dupemail@marketplace.test',
          password: 'Password123!',
          name: 'Duplicate Test',
        });

      // Second signup with same email
      const res = await request(app.getHttpServer())
        .post('/auth/signup/customer')
        .send({
          email: 'dupemail@marketplace.test',
          password: 'Password123!',
          name: 'Duplicate Test 2',
        });

      expect(res.status).toBe(HttpStatus.CONFLICT);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already registered');
    });
  });

  describe('POST /auth/login, /auth/refresh, /auth/logout, GET /me', () => {
    let authCookie: string;
    let accessToken: string;

    it('should login successfully and return access token and set refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testcustomer@marketplace.test',
          password: 'Password123!',
        });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();

      accessToken = res.body.data.accessToken;
      authCookie = res.headers['set-cookie'][0];
    });

    it('should get current user profile with GET /me', async () => {
      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('testcustomer@marketplace.test');
      expect(res.body.data.permissions).toBeDefined();
    });

    it('should fail GET /me without token with 401', async () => {
      const res = await request(app.getHttpServer()).get('/me');

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should refresh token using refresh cookie and rotate refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();

      const newAuthCookie = res.headers['set-cookie'][0];
      expect(newAuthCookie).not.toEqual(authCookie);

      // Verify that old cookie is now invalid (revoked)
      const oldRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [authCookie]);

      expect(oldRes.status).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should logout and invalidate refresh token', async () => {
      // First login to get a fresh cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testcustomer@marketplace.test',
          password: 'Password123!',
        });

      const freshCookie = loginRes.headers['set-cookie'][0];

      // Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [freshCookie]);

      expect(logoutRes.status).toBe(HttpStatus.OK);

      // Try replaying the old refresh cookie after logout
      const replayRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [freshCookie]);

      expect(replayRes.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(replayRes.body.success).toBe(false);
    });
  });
});

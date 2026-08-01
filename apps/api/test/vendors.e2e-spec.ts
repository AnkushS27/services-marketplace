import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

describe('VendorsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let vendorToken: string;
  let adminToken: string;
  let vendorProfileId: string;

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

    // Register a vendor user for testing
    const vendorSignupRes = await request(app.getHttpServer())
      .post('/auth/signup/vendor')
      .send({
        email: 'e2evendor@marketplace.test',
        password: 'Password123!',
        name: 'E2E Vendor User',
        businessName: 'E2E Business',
        contactName: 'E2E Contact',
        contactPhone: '9998887770',
        address: '123 Test St',
      });
    vendorToken = vendorSignupRes.body.data.accessToken;
    vendorProfileId = vendorSignupRes.body.data.vendorProfile.id;

    // Ensure SUPER_ADMIN user exists in database for testing
    const superAdminRole = await prisma.role.findFirst({
      where: { name: 'SUPER_ADMIN' },
    });

    if (superAdminRole) {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      await prisma.user.upsert({
        where: { email: 'superadmin@marketplace.test' },
        update: {},
        create: {
          email: 'superadmin@marketplace.test',
          passwordHash,
          name: 'Super Admin',
          roleId: superAdminRole.id,
        },
      });
    }

    // Login as Super Admin for approval tests
    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'superadmin@marketplace.test',
        password: 'Password123!',
      });
    adminToken = adminLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data created during test
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['e2evendor@marketplace.test', 'superadmin@marketplace.test'],
        },
      },
    });
    await app.close();
  });

  describe('Vendor Self Service (GET & PATCH /vendors/me)', () => {
    it('should get current vendor profile with status PENDING', async () => {
      const res = await request(app.getHttpServer())
        .get('/vendors/me')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.businessName).toBe('E2E Business');
    });

    it('should update vendor profile details', async () => {
      const res = await request(app.getHttpServer())
        .patch('/vendors/me/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          businessName: 'Updated E2E Business',
          contactPhone: '1112223333',
        });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.businessName).toBe('Updated E2E Business');
      expect(res.body.data.contactPhone).toBe('1112223333');
    });

    it('should upload a vendor document metadata', async () => {
      const res = await request(app.getHttpServer())
        .post('/vendors/me/documents')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          filename: 'license_12345.pdf',
          originalName: 'Business License.pdf',
        });

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(res.body.success).toBe(true);
      expect(res.body.data.filename).toBe('license_12345.pdf');
    });
  });

  describe('Admin Vendor Management (GET & PATCH /admin/vendors)', () => {
    it('should list vendors with pagination for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/vendors?status=PENDING&page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should reject vendor with a reason', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/vendors/${vendorProfileId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Incomplete business registration document',
        });

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toBe('Incomplete business registration document');
    });

    it('should approve vendor profile', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/vendors/${vendorProfileId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(HttpStatus.OK);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.approvedAt).toBeDefined();
      expect(res.body.data.rejectionReason).toBeNull();
    });
  });
});

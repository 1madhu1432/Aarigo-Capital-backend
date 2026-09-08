import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/lib/prisma';

describe('Real Backend REST API Tests (Supertest + Express + MySQL)', () => {
  const app = createApp();
  let authToken: string;

  beforeAll(async () => {
    // Ensure DB connection is established
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health should return 200 OK with UP status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('POST /api/auth/login should authenticate seeded admin and return JWT Bearer token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@aarigocapital.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Aarigo@2026',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@aarigocapital.com');
    authToken = res.body.data.token;
  });

  it('GET /api/auth/me should return current user profile with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@aarigocapital.com');
  });

  it('GET /api/customers should return paginated customers list', async () => {
    const res = await request(app)
      .get('/api/customers?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
  });

  it('GET /api/loans should return paginated loans list', async () => {
    const res = await request(app)
      .get('/api/loans?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/dashboard/summary should return authoritative dashboard metrics from MySQL', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics).toHaveProperty('activeLoans');
    expect(res.body.data.metrics).toHaveProperty('totalCustomers');
  });

  it('GET /api/daily-closing should return daily closings list', async () => {
    const res = await request(app)
      .get('/api/daily-closing?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should reject unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });
});

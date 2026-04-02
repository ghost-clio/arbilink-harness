import { describe, it, expect } from 'vitest';
import request from 'supertest';
// @ts-ignore — file dep resolves at runtime via tsx
import app from '../../../arbilink/src/index.js';

describe('ArbiLink Gateway', () => {
  // 1. Health
  it('GET /health — returns ok + features + network', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.network).toBe('arbitrum:sepolia');
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features).toContain('x402_payments');
  });

  // 2. Register — success
  it('POST /register — creates service (201)', async () => {
    const res = await request(app).post('/register').send({
      id: 'svc-alpha', seller: '0xAA', price: 0.01,
      capability: 'code-review', endpoint: 'http://localhost:4001',
    });
    expect(res.status).toBe(201);
    expect(res.body.registered).toBe('svc-alpha');
    expect(res.body.network).toBe('arbitrum:sepolia');
  });

  // 3. Register — missing fields
  it('POST /register — rejects missing fields (400)', async () => {
    const res = await request(app).post('/register').send({ id: 'incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing/i);
  });

  // 4. Discover
  it('GET /discover — finds registered services', async () => {
    const res = await request(app).get('/discover').query({ capability: 'code-review' });
    expect(res.status).toBe(200);
    expect(res.body.capability).toBe('code-review');
    expect(res.body.services.length).toBeGreaterThanOrEqual(1);
    expect(res.body.services[0].id).toBe('svc-alpha');
  });

  // 5. Discover — missing capability
  it('GET /discover — rejects without capability param', async () => {
    const res = await request(app).get('/discover');
    expect(res.status).toBe(400);
  });

  // 6. Service access without payment → 402
  it('GET /service/:id — returns 402 PaymentRequirement', async () => {
    const res = await request(app).get('/service/svc-alpha');
    expect(res.status).toBe(402);
    expect(res.body.network).toBe('arbitrum:sepolia');
    expect(res.body.asset).toBe('USDC');
    expect(res.body.amount).toBeGreaterThan(0);
    expect(res.body.recipient).toBeDefined();
  });

  // 7. Service access with payment proof
  it('GET /service/:id — succeeds with payment headers', async () => {
    const res = await request(app)
      .get('/service/svc-alpha')
      .set('x-payment-proof', '0x' + 'a'.repeat(64))
      .set('x-buyer-address', '0xBuyer1')
      .set('x-payment-amount', '0.01');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.latencyMs).toBe('number');
    expect(res.body.txHash).toBeTruthy();
  });

  // 8. Reputation
  it('GET /reputation/:address — returns stats', async () => {
    const res = await request(app).get('/reputation/0xBuyer1');
    expect(res.status).toBe(200);
    expect(res.body.address).toBe('0xBuyer1');
    expect(typeof res.body.txCount).toBe('number');
    expect(typeof res.body.successCount).toBe('number');
  });

  // 9. Spending policy — set
  it('POST /policy — sets spending limits', async () => {
    const res = await request(app).post('/policy').send({
      agent: '0xAgent1', perTxLimit: 0.05, dailyLimit: 1.0,
    });
    expect(res.status).toBe(200);
    expect(res.body.agent).toBe('0xAgent1');
    expect(res.body.perTxLimit).toBe(0.05);
  });

  // 10. Spending policy — violation
  it('GET /service/:id — rejects when payment exceeds policy', async () => {
    // Register expensive service
    await request(app).post('/register').send({
      id: 'svc-expensive', seller: '0xBB', price: 10,
      capability: 'premium', endpoint: 'http://localhost:5000',
    });
    // Set tight policy on buyer
    await request(app).post('/policy').send({
      agent: '0xTightBuyer', perTxLimit: 0.01, dailyLimit: 0.05,
    });
    // Try to buy expensive service
    const res = await request(app)
      .get('/service/svc-expensive')
      .set('x-payment-proof', '0x' + 'b'.repeat(64))
      .set('x-buyer-address', '0xTightBuyer')
      .set('x-payment-amount', '10');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('spending_policy_violation');
  });

  // 11. Spending summary
  it('GET /spending — returns agent spending summary', async () => {
    const res = await request(app)
      .get('/spending')
      .set('x-buyer-address', '0xBuyer1');
    expect(res.status).toBe(200);
    expect(typeof res.body.totalSpent).toBe('number');
  });

  // 12. Service not found
  it('GET /service/:id — 404 for unknown service', async () => {
    const res = await request(app).get('/service/nonexistent');
    expect(res.status).toBe(404);
  });

  // 13. Transaction log
  it('GET /txlog — returns transaction history', async () => {
    const res = await request(app).get('/txlog');
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
  });

  // 14. Register + discover round-trip
  it('register then discover round-trip', async () => {
    await request(app).post('/register').send({
      id: 'svc-roundtrip', seller: '0xCC', price: 0.05,
      capability: 'unique-cap', endpoint: 'http://localhost:6000',
    });
    const res = await request(app).get('/discover').query({ capability: 'unique-cap' });
    expect(res.body.services.some((s: any) => s.id === 'svc-roundtrip')).toBe(true);
  });

  // 15. Unknown route
  it('GET /nonexistent — returns 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });
});

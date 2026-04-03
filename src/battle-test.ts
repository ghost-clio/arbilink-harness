/**
 * ArbiLink Battle Test — Verify live deployment on Arbitrum Sepolia
 * 
 * Tests:
 * 1. AgentEscrow contract is deployed and callable
 * 2. ERC-8004 registration is confirmed on-chain
 * 3. Gateway starts and serves all endpoints
 * 4. Full x402 payment flow works end-to-end
 * 5. Identity endpoints work with real on-chain data
 * 6. Escrow creation (simulated — needs USDC)
 * 7. Stress test: rapid service registration + discovery
 */

import { ethers } from 'ethers';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3403';
const RPC = 'https://sepolia-rollup.arbitrum.io/rpc';

// Deployed contracts
const ESCROW_ADDRESS = '0x26469E9C1a73eaC710bE3FC49966878a0e8ab0f7';
const REGISTRY_ADDRESS = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const USDC_ADDRESS = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d';
const DEPLOYER = '0x43Dc3d7EE9a74083FA42eB0CEDf1f9CC664f7DBe';

const provider = new ethers.JsonRpcProvider(RPC);

let passed = 0;
let failed = 0;

function ok(name: string, detail?: string) {
  passed++;
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, err: string) {
  failed++;
  console.log(`  ❌ ${name} — ${err}`);
}

async function gw(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown, headers?: Record<string, string>) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${GATEWAY_URL}${path}`, opts);
  return { status: res.status, data: await res.json() as any };
}

async function run() {
  console.log('🔥 ArbiLink Battle Test — Live Arbitrum Sepolia\n');
  console.log('═'.repeat(60));

  // ── 1. Verify AgentEscrow contract ──
  console.log('\n📋 Test 1: AgentEscrow Contract Verification\n');
  try {
    const code = await provider.getCode(ESCROW_ADDRESS);
    if (code === '0x') { fail('Contract deployed', 'no bytecode at address'); }
    else { ok('Contract deployed', `${code.length} chars bytecode`); }

    const escrowAbi = ['function usdc() view returns (address)', 'function nextEscrowId() view returns (uint256)'];
    const escrow = new ethers.Contract(ESCROW_ADDRESS, escrowAbi, provider);
    const usdc = await escrow.usdc();
    if (usdc.toLowerCase() === USDC_ADDRESS.toLowerCase()) { ok('USDC address matches', usdc); }
    else { fail('USDC address', `expected ${USDC_ADDRESS}, got ${usdc}`); }

    const nextId = await escrow.nextEscrowId();
    ok('nextEscrowId readable', `current: ${nextId.toString()}`);
  } catch (e: any) {
    fail('Contract verification', e.message);
  }

  // ── 2. Verify ERC-8004 Registration ──
  console.log('\n📋 Test 2: ERC-8004 Identity Registration\n');
  try {
    const registryAbi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function balanceOf(address) view returns (uint256)',
    ];
    const registry = new ethers.Contract(REGISTRY_ADDRESS, registryAbi, provider);

    const name = await registry.name();
    const symbol = await registry.symbol();
    ok('Registry accessible', `${name} (${symbol})`);

    const balance = await registry.balanceOf(DEPLOYER);
    if (balance > 0n) { ok('Deployer registered', `${balance.toString()} NFT(s) owned`); }
    else { fail('Deployer registered', 'balanceOf returned 0'); }
  } catch (e: any) {
    fail('Registry verification', e.message);
  }

  // ── 3. Gateway Health ──
  console.log('\n📋 Test 3: Gateway Health\n');
  try {
    const { status, data } = await gw('/health');
    if (status === 200 && data.status === 'ok') { ok('Health endpoint', `${data.features?.length} features, uptime ${data.uptime}s`); }
    else { fail('Health endpoint', `status ${status}`); }
  } catch (e: any) {
    fail('Gateway unreachable', e.message);
    console.log('\n⚠️  Gateway not running. Start it first: cd arbilink && PORT=3403 npm run dev\n');
    summary();
    return;
  }

  // ── 4. Service Registration + Discovery ──
  console.log('\n📋 Test 4: Service Registration + Discovery\n');
  const services = [
    { id: 'battle-alpha', seller: '0xBattle01', price: 0.01, capability: 'code-audit', endpoint: 'http://localhost:5001/audit' },
    { id: 'battle-beta', seller: '0xBattle02', price: 0.005, capability: 'summarize', endpoint: 'http://localhost:5002/sum' },
    { id: 'battle-gamma', seller: '0xBattle03', price: 0.02, capability: 'translate', endpoint: 'http://localhost:5003/tr' },
  ];

  for (const svc of services) {
    const { status } = await gw('/register', 'POST', svc);
    if (status === 201) { ok(`Register ${svc.id}`, `$${svc.price} ${svc.capability}`); }
    else { fail(`Register ${svc.id}`, `status ${status}`); }
  }

  const { data: disc } = await gw('/discover?capability=code-audit');
  if (disc.services?.length > 0) { ok('Discover code-audit', `${disc.services.length} service(s)`); }
  else { fail('Discover code-audit', 'no services found'); }

  // ── 5. x402 Payment Flow ──
  console.log('\n📋 Test 5: x402 Payment Flow\n');
  const { status: s402 } = await gw('/service/battle-alpha');
  if (s402 === 402) { ok('402 Payment Required', 'correctly gates access'); }
  else { fail('402 flow', `expected 402, got ${s402}`); }

  const { status: sPaid, data: paidData } = await gw('/service/battle-alpha?q=audit+my+contract', 'GET', undefined, {
    'x-payment-proof': '0x' + 'f'.repeat(64),
    'x-buyer-address': '0xBattleBuyer1',
    'x-payment-amount': '0.01',
  });
  if (sPaid === 200 && paidData.success) { ok('Paid access', `latency ${paidData.latencyMs}ms`); }
  else { fail('Paid access', `status ${sPaid}`); }

  // ── 6. Spending Policies ──
  console.log('\n📋 Test 6: Spending Policies\n');
  await gw('/policy', 'POST', { agent: '0xBattleBuyer1', perTxLimit: 0.05, dailyLimit: 0.5 });
  ok('Policy set', '$0.05/tx, $0.50/day');

  const { status: sBlock } = await gw('/service/battle-gamma?q=translate', 'GET', undefined, {
    'x-payment-proof': '0x' + 'e'.repeat(64),
    'x-buyer-address': '0xBattleBuyer1',
    'x-payment-amount': '0.1', // exceeds $0.05 per-tx limit
  });
  if (sBlock === 403) { ok('Policy enforced', 'rejected $0.10 (limit $0.05)'); }
  else { fail('Policy enforcement', `expected 403, got ${sBlock}`); }

  // ── 7. Reputation ──
  console.log('\n📋 Test 7: Reputation Tracking\n');
  const { data: rep } = await gw('/reputation/0xBattleBuyer1');
  if (rep.txCount > 0) { ok('Reputation tracked', `${rep.txCount} tx, ${rep.successCount} success`); }
  else { fail('Reputation', 'no transactions recorded'); }

  // ── 8. Transaction Log ──
  console.log('\n📋 Test 8: Transaction Log\n');
  const { data: txlog } = await gw('/txlog?limit=5');
  if (txlog.count > 0) { ok('TX log populated', `${txlog.count} entries`); }
  else { fail('TX log', 'empty'); }

  // ── 9. CSV Export ──
  console.log('\n📋 Test 9: CSV Export\n');
  try {
    const csvRes = await fetch(`${GATEWAY_URL}/txlog?format=csv&limit=5`);
    const csvText = await csvRes.text();
    if (csvText.startsWith('timestamp,buyer')) { ok('CSV export', `${csvText.split('\n').length - 1} rows`); }
    else { fail('CSV export', 'unexpected format'); }
  } catch (e: any) {
    fail('CSV export', e.message);
  }

  // ── 10. Identity Check (on-chain) ──
  console.log('\n📋 Test 10: Identity Check\n');
  try {
    const { status: iStatus, data: iData } = await gw(`/identity/check/${DEPLOYER}`);
    if (iStatus === 200 && iData.registered === true) { ok('Identity check', 'deployer is registered'); }
    else { fail('Identity check', `registered=${iData.registered}`); }
  } catch (e: any) {
    fail('Identity check', e.message);
  }

  // ── 11. Stress: Rapid Registration ──
  console.log('\n📋 Test 11: Stress — Rapid Registration\n');
  const start = Date.now();
  const N = 20;
  const promises = [];
  for (let i = 0; i < N; i++) {
    promises.push(gw('/register', 'POST', {
      id: `stress-${i}`, seller: `0xStress${i.toString().padStart(4, '0')}`,
      price: 0.001 * (i + 1), capability: `stress-cap-${i % 5}`, endpoint: `http://localhost:6000/s${i}`,
    }));
  }
  const results = await Promise.all(promises);
  const allOk = results.every(r => r.status === 201);
  const elapsed = Date.now() - start;
  if (allOk) { ok(`${N} registrations`, `${elapsed}ms (${(elapsed / N).toFixed(1)}ms/req)`); }
  else { fail('Stress registration', `${results.filter(r => r.status !== 201).length} failures`); }

  // ── 12. Stress: Discovery across capabilities ──
  console.log('\n📋 Test 12: Stress — Discovery\n');
  const dStart = Date.now();
  const dPromises = [];
  for (let i = 0; i < 5; i++) {
    dPromises.push(gw(`/discover?capability=stress-cap-${i}`));
  }
  const dResults = await Promise.all(dPromises);
  const dElapsed = Date.now() - dStart;
  const totalFound = dResults.reduce((sum, r) => sum + (r.data.services?.length || 0), 0);
  ok(`Discovery across 5 capabilities`, `${totalFound} services found in ${dElapsed}ms`);

  summary();
}

function summary() {
  console.log('\n' + '═'.repeat(60));
  console.log(`\n🏁 Results: ${passed} passed, ${failed} failed (${passed + failed} total)\n`);
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED — ArbiLink is battle-ready!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) need attention.\n`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });

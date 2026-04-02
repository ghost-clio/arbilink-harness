/**
 * ArbiLink Demo — 3 Nemo agents trading services on Arbitrum
 * 
 * Agent Alpha: Code Review service ($0.01 USDC per review)
 * Agent Beta: Summarization service ($0.005 USDC per summary)
 * Agent Gamma: Data Analysis service ($0.02 USDC per analysis)
 * 
 * Flow:
 * 1. All agents register on the gateway
 * 2. Alpha discovers Beta's summarization service, requests it
 * 3. Beta discovers Gamma's analysis service, requests it
 * 4. Gamma discovers Alpha's code review service, requests it
 * 5. Each agent gets reputation from the transactions
 * 
 * This creates a circular economy — agents paying each other for services.
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3402';

interface Agent {
  name: string;
  address: string;
  capability: string;
  price: number;
  endpoint: string;
}

const agents: Agent[] = [
  {
    name: 'alpha-reviewer',
    address: '0xAlpha0000000000000000000000000000000001',
    capability: 'code-review',
    price: 0.01,
    endpoint: 'http://localhost:4001/review',
  },
  {
    name: 'beta-summarizer',
    address: '0xBeta00000000000000000000000000000000002',
    capability: 'summarization',
    price: 0.005,
    endpoint: 'http://localhost:4002/summarize',
  },
  {
    name: 'gamma-analyst',
    address: '0xGamma0000000000000000000000000000000003',
    capability: 'data-analysis',
    price: 0.02,
    endpoint: 'http://localhost:4003/analyze',
  },
];

async function gw(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown, headers?: Record<string, string>) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${GATEWAY_URL}${path}`, opts);
  return { status: res.status, data: await res.json() as any };
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 ArbiLink Demo — Agent Commerce on Arbitrum\n');
  console.log('═'.repeat(60));

  // Step 1: Register all agents as services
  console.log('\n📝 Step 1: Registering agents...\n');
  for (const agent of agents) {
    const res = await gw('/register', 'POST', {
      id: agent.name,
      seller: agent.address,
      price: agent.price,
      capability: agent.capability,
      endpoint: agent.endpoint,
      asset: 'USDC',
    });
    console.log(`  ✅ ${agent.name} registered (${agent.capability}) — $${agent.price} USDC`);
  }

  // Step 2: Set spending policies
  console.log('\n🔒 Step 2: Setting spending policies...\n');
  for (const agent of agents) {
    await gw('/policy', 'POST', {
      agent: agent.address,
      perTxLimit: 0.1,
      dailyLimit: 1.0,
    });
    console.log(`  ✅ ${agent.name}: $0.10/tx, $1.00/day limit`);
  }

  // Step 3: Discover services
  console.log('\n🔍 Step 3: Service discovery...\n');
  for (const cap of ['code-review', 'summarization', 'data-analysis']) {
    const res = await gw(`/discover?capability=${cap}`);
    const services = res.data.services;
    console.log(`  📋 "${cap}" → ${services.length} service(s): ${services.map((s: any) => `${s.id} ($${s.price})`).join(', ')}`);
  }

  // Step 4: Simulate x402 payment flow
  console.log('\n💰 Step 4: Agent-to-agent service requests (x402 flow)...\n');

  // Alpha requests Beta's summarization
  const req1 = await gw('/service/beta-summarizer', 'GET');
  console.log(`  🔸 Alpha → Beta (summarization): HTTP ${req1.status}`);
  if (req1.status === 402) {
    console.log(`    💳 Payment Required: $${req1.data.amount} ${req1.data.asset} on ${req1.data.network}`);
    console.log(`    📬 Send to: ${req1.data.recipient || '(gateway)'}`);

    // Simulate payment proof (in production, this would be a real tx hash)
    const req1paid = await gw('/service/beta-summarizer?q=summarize+this+code', 'GET', undefined, {
      'x-payment-proof': '0x' + 'a'.repeat(64),
      'x-buyer-address': agents[0].address,
      'x-payment-amount': '0.005',
    });
    console.log(`    ✅ Service delivered: latency=${req1paid.data.latencyMs}ms, verified=${req1paid.data.txVerified}`);
  }

  // Beta requests Gamma's analysis
  const req2 = await gw('/service/gamma-analyst', 'GET');
  console.log(`\n  🔸 Beta → Gamma (data-analysis): HTTP ${req2.status}`);
  if (req2.status === 402) {
    console.log(`    💳 Payment Required: $${req2.data.amount} ${req2.data.asset}`);
    const req2paid = await gw('/service/gamma-analyst?q=analyze+token+metrics', 'GET', undefined, {
      'x-payment-proof': '0x' + 'b'.repeat(64),
      'x-buyer-address': agents[1].address,
      'x-payment-amount': '0.02',
    });
    console.log(`    ✅ Service delivered: latency=${req2paid.data.latencyMs}ms`);
  }

  // Gamma requests Alpha's code review
  const req3 = await gw('/service/alpha-reviewer', 'GET');
  console.log(`\n  🔸 Gamma → Alpha (code-review): HTTP ${req3.status}`);
  if (req3.status === 402) {
    console.log(`    💳 Payment Required: $${req3.data.amount} ${req3.data.asset}`);
    const req3paid = await gw('/service/alpha-reviewer?q=review+contract.sol', 'GET', undefined, {
      'x-payment-proof': '0x' + 'c'.repeat(64),
      'x-buyer-address': agents[2].address,
      'x-payment-amount': '0.01',
    });
    console.log(`    ✅ Service delivered: latency=${req3paid.data.latencyMs}ms`);
  }

  // Step 5: Check reputation
  console.log('\n\n⭐ Step 5: Agent reputation after transactions...\n');
  for (const agent of agents) {
    const rep = await gw(`/reputation/${agent.address}`);
    console.log(`  ${agent.name}: ${rep.data.txCount} txs, ${rep.data.successCount} successful`);
  }

  // Step 6: Check spending
  console.log('\n📊 Step 6: Spending summaries...\n');
  for (const agent of agents) {
    const spend = await gw('/spending', 'GET', undefined, {
      'x-buyer-address': agent.address,
    });
    console.log(`  ${agent.name}: $${spend.data.totalSpent} spent across ${spend.data.txCount} txs`);
  }

  // Step 7: Transaction log
  console.log('\n📜 Step 7: Transaction log...\n');
  const txlog = await gw('/txlog?limit=10');
  console.log(`  ${txlog.data.count} total transactions (${txlog.data.verified} verified)`);
  for (const tx of txlog.data.transactions.slice(-3)) {
    console.log(`  • ${tx.buyer.slice(0, 10)}... → ${tx.service} | $${tx.amount} | ${tx.type}`);
  }

  // Step 8: Health check
  console.log('\n💚 Step 8: Gateway health...\n');
  const health = await gw('/health');
  console.log(`  Status: ${health.data.status}`);
  console.log(`  Services: ${health.data.services}`);
  console.log(`  Transactions: ${health.data.transactions}`);
  console.log(`  Network: ${health.data.network}`);
  console.log(`  Identity: ${health.data.identity}`);
  console.log(`  Features: ${health.data.features.join(', ')}`);

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Demo complete! Agents successfully traded services on Arbitrum.');
  console.log('═'.repeat(60) + '\n');
}

run().catch(console.error);

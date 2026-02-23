const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

function safeReplace(label, search, replacement) {
    let count = 0;
    let pos = 0;
    while ((pos = c.indexOf(search, pos)) !== -1) { count++; pos += search.length; }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times, aborting'); process.exit(1); }
    c = c.replace(search, () => replacement);
    console.log(label + ': OK');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: Passar fmtCurrency para Dashboard (usar contexto único)
// ─────────────────────────────────────────────────────────────────────────────
const s8 = [
    `          {activeTab === 'dashboard' && (`,
    `            <Dashboard`,
    `              transactions={transactions}`,
    `              dueAlerts={dueAlerts}`,
    `              budgets={budgets}`,
    `              goals={goals}`,
    `              categories={categories}`,
    `              wallets={wallets}`,
    `            />`,
    `          )}`,
].join(R);
const r8 = [
    `          {activeTab === 'dashboard' && (`,
    `            <Dashboard`,
    `              transactions={transactions}`,
    `              dueAlerts={dueAlerts}`,
    `              budgets={budgets}`,
    `              goals={goals}`,
    `              categories={categories}`,
    `              wallets={wallets}`,
    `              fmtCurrency={fmtCurrency}`,
    `            />`,
    `          )}`,
].join(R);
safeReplace('fmtCurrency to Dashboard', s8, r8);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 9: Aceitar fmtCurrency no Dashboard component signature
// ─────────────────────────────────────────────────────────────────────────────
const s9 = `const Dashboard = React.memo(({ transactions, dueAlerts, budgets = [], goals = [], categories, wallets = [] }) => {`;
const r9 = `const Dashboard = React.memo(({ transactions, dueAlerts, budgets = [], goals = [], categories, wallets = [], fmtCurrency }) => {`;
safeReplace('Dashboard props', s9, r9);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 10: Usar fmtCurrency nos cards do Dashboard (substitui R$ ...toFixed)
// Localiza os card-value values dentro do Dashboard
// ─────────────────────────────────────────────────────────────────────────────

// Helper para Dashboard: fallback se fmtCurrency não disponível
const s10 = [
    `const Dashboard = React.memo(({ transactions, dueAlerts, budgets = [], goals = [], categories, wallets = [], fmtCurrency }) => {`,
    `  const now = new Date();`,
].join(R);
const r10 = [
    `const Dashboard = React.memo(({ transactions, dueAlerts, budgets = [], goals = [], categories, wallets = [], fmtCurrency }) => {`,
    `  // Fallback para BRL se fmtCurrency não disponível`,
    `  const fmt = fmtCurrency || ((v) => 'R$ ' + v.toFixed(2));`,
    `  const now = new Date();`,
].join(R);
safeReplace('Dashboard fmt fallback', s10, r10);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

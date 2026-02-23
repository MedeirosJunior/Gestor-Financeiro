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

// STEP A: Card Entradas
safeReplace('card entradas value',
    `          <div className="card-value">R$ {totalEntradas.toFixed(2)}</div>`,
    `          <div className="card-value">{fmt(totalEntradas)}</div>`
);

// STEP B: Card Despesas
safeReplace('card despesas value',
    `          <div className="card-value">R$ {totalDespesas.toFixed(2)}</div>`,
    `          <div className="card-value">{fmt(totalDespesas)}</div>`
);

// STEP C: Card Saldo
safeReplace('card saldo value',
    `          <div className="card-value">R$ {saldo.toFixed(2)}</div>`,
    `          <div className="card-value">{fmt(saldo)}</div>`
);

// STEP D: Card Poupança (taxa percentual - não converter, só manter %)
// Busca tx poupança card (o label é POUPANÇA) - não precisa converter pois é %

// STEP E: Transaction values in recent list
// Encontra o amount dentro do dashboard recent transactions
safeReplace('dash recent tx amount',
    `                {transaction.type === 'entrada' ? '+' : '-'}R$ {parseFloat(transaction.value).toFixed(2)}`,
    `                {transaction.type === 'entrada' ? '+' : '-'}{fmt(parseFloat(transaction.value))}`
);

// STEP F: Budget spent amounts in dashboard
safeReplace('dash budget spent',
    `                  <span className={over ? 'text-danger' : ''}>R$ {spent.toFixed(2)}</span>`,
    `                  <span className={over ? 'text-danger' : ''}>{fmt(spent)}</span>`
);
safeReplace('dash budget limit',
    `                  <span style={{ color: '#94a3b8' }}>/ R$ {limit.toFixed(2)}</span>`,
    `                  <span style={{ color: '#94a3b8' }}>/ {fmt(limit)}</span>`
);

// STEP G: Goal amounts
safeReplace('dash goal curr',
    `              <span className="dash-goal-amounts">{fmt_brl(curr)} / {fmt_brl(target)}</span>`,
    `              <span className="dash-goal-amounts">{fmt(curr)} / {fmt(target)}</span>`
);

// STEP H: Wallet balances
safeReplace('dash wallet balance',
    `              <div className={\`dash-wallet-balance \${parseFloat(w.balance||0)>=0?'positive':'negative'}\`}>R$ {parseFloat(w.balance||0).toFixed(2)}</div>`,
    `              <div className={\`dash-wallet-balance \${parseFloat(w.balance||0)>=0?'positive':'negative'}\`}>{fmt(parseFloat(w.balance||0))}</div>`
);

// STEP I: Goal falta in alerts
safeReplace('due alerts goal falta',
    `                <span className="alert-value">Falta R$ {falta.toFixed(2)}</span>`,
    `                <span className="alert-value">Falta {fmt(falta)}</span>`
);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

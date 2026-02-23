const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

function safeReplaceNth(label, search, replacement, nth) {
    let count = 0;
    let pos = 0;
    let targetIdx = -1;
    while ((pos = c.indexOf(search, pos)) !== -1) {
        count++;
        if (count === nth) targetIdx = pos;
        pos += search.length;
    }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (targetIdx === -1) { console.error(label + ': occurrence ' + nth + ' not found (total: ' + count + ')'); process.exit(1); }
    c = c.substring(0, targetIdx) + replacement + c.substring(targetIdx + search.length);
    console.log(label + ' (nth=' + nth + '): OK (total occurrences: ' + count + ')');
}

function safeReplace(label, search, replacement) {
    let count = 0;
    let pos = 0;
    while ((pos = c.indexOf(search, pos)) !== -1) { count++; pos += search.length; }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times, aborting'); process.exit(1); }
    c = c.replace(search, () => replacement);
    console.log(label + ': OK');
}

// STEP E: Transaction values in dashboard (1st occurrence = dashboard)
safeReplaceNth('dash recent tx amount',
    `                {transaction.type === 'entrada' ? '+' : '-'}R$ {parseFloat(transaction.value).toFixed(2)}`,
    `                {transaction.type === 'entrada' ? '+' : '-'}{fmt(parseFloat(transaction.value))}`,
    1
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

// STEP I: Goal falta in alerts within dashboard
safeReplace('due alerts goal falta',
    `                <span className="alert-value">Falta R$ {falta.toFixed(2)}</span>`,
    `                <span className="alert-value">Falta {fmt(falta)}</span>`
);

// STEP H: Wallet balances in dashboard
safeReplace('dash wallet balance',
    `                  R$ {parseFloat(w.balance).toFixed(2)}`,
    `                  {fmt(parseFloat(w.balance))}`
);

// STEP G1: Goal curr amount
safeReplace('dash goal curr',
    `                    <span>R$ {curr.toFixed(2)}</span>`,
    `                    <span>{fmt(curr)}</span>`
);

// STEP G2: Goal target amount
safeReplace('dash goal target',
    `                    <span style={{ color: '#94a3b8' }}>/ R$ {target.toFixed(2)}</span>`,
    `                    <span style={{ color: '#94a3b8' }}>/ {fmt(target)}</span>`
);

// STEP G3: Goal falta in goals panel
safeReplace('dash goal falta inline',
    `                    {!done && <span className="dash-goal-falta">Falta R$ {falta.toFixed(2)}</span>}`,
    `                    {!done && <span className="dash-goal-falta">Falta {fmt(falta)}</span>}`
);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

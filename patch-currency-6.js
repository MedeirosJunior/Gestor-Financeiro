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
// STEP 6: Adicionar botão de moeda ao lado do seletor no header
// ─────────────────────────────────────────────────────────────────────────────
const s6 = [
    `              <div className="currency-selector-wrap">`,
    `                <select`,
].join(R);
const r6 = [
    `              <div className="currency-selector-wrap">`,
    `                <button`,
    `                  className="notif-bell-btn currency-rates-btn"`,
    `                  onClick={() => setCurrencyPanelOpen(p => !p)}`,
    `                  title="Taxas de c\u00E2mbio e conversor"`,
    `                  style={{ marginRight: '4px', fontSize: '0.75rem', padding: '5px 8px' }}`,
    `                >`,
    `                  \uD83D\uDCB1`,
    `                </button>`,
    `                <select`,
].join(R);
safeReplace('currency rates btn', s6, r6);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: Adicionar CurrencyConverter componente antes de function ButtonSpinner
// ─────────────────────────────────────────────────────────────────────────────
const s7 = `function ButtonSpinner({ loading, children, onClick, className = '', disabled = false, ...props }) {`;
const r7 = [
    `// Conversor rápido de BRL para outra moeda`,
    `function CurrencyConverter({ exchangeRates, activeCurrency, fmtCurrency }) {`,
    `  const [inputVal, setInputVal] = React.useState('');`,
    `  const rate = exchangeRates[activeCurrency] || 1;`,
    `  const converted = inputVal ? parseFloat(inputVal) * rate : null;`,
    `  return (`,
    `    <div className="mini-converter">`,
    `      <div className="mini-converter-row">`,
    `        <span className="mini-conv-label">R$</span>`,
    `        <input`,
    `          type="number"`,
    `          className="mini-conv-input"`,
    `          placeholder="0,00"`,
    `          value={inputVal}`,
    `          onChange={e => setInputVal(e.target.value)}`,
    `          min="0"`,
    `          step="0.01"`,
    `        />`,
    `      </div>`,
    `      {converted !== null && !isNaN(converted) && (`,
    `        <div className="mini-conv-result">`,
    `          = {fmtCurrency(parseFloat(inputVal))}`,
    `        </div>`,
    `      )}`,
    `    </div>`,
    `  );`,
    `}`,
    ``,
    `function ButtonSpinner({ loading, children, onClick, className = '', disabled = false, ...props }) {`,
].join(R);
safeReplace('CurrencyConverter component', s7, r7);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: Passar fmtCurrency para Dashboard no JSX
// ─────────────────────────────────────────────────────────────────────────────
const s8 = `              wallets={wallets}`;
// Find it only in the Dashboard JSX call (check surroundings)
{
    let idx = -1;
    let count = 0;
    let pos = 0;
    while ((pos = c.indexOf(s8, pos)) !== -1) { count++; idx = pos; pos += s8.length; }
    if (count !== 1) { console.error('wallets prop: found ' + count + ' times'); process.exit(1); }
}
const r8 = [
    `              wallets={wallets}`,
    `              fmtCurrency={fmtCurrency}`,
].join(R);
safeReplace('fmtCurrency to Dashboard', s8, r8);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

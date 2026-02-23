const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

// ─────────────────────────────────────────────────────────────
// STEP 1: Inserir CURRENCIES constant antes de function App()
// ─────────────────────────────────────────────────────────────
const s1 = 'function App() {';
const r1 = [
    `// Lista de moedas suportadas`,
    `const CURRENCIES = [`,
    `  { code: 'BRL', symbol: 'R$',  flag: '🇧🇷', name: 'Real Brasileiro' },`,
    `  { code: 'USD', symbol: '$',   flag: '🇺🇸', name: 'Dólar Americano' },`,
    `  { code: 'EUR', symbol: '€',   flag: '🇪🇺', name: 'Euro' },`,
    `  { code: 'GBP', symbol: '£',   flag: '🇬🇧', name: 'Libra Esterlina' },`,
    `  { code: 'ARS', symbol: '$',   flag: '🇦🇷', name: 'Peso Argentino' },`,
    `  { code: 'JPY', symbol: '¥',   flag: '🇯🇵', name: 'Iene Japonês' },`,
    `  { code: 'CLP', symbol: '$',   flag: '🇨🇱', name: 'Peso Chileno' },`,
    `  { code: 'MXN', symbol: '$',   flag: '🇲🇽', name: 'Peso Mexicano' },`,
    `  { code: 'PYG', symbol: 'Gs',  flag: '🇵🇾', name: 'Guarani Paraguaio' },`,
    `  { code: 'UYU', symbol: '$',   flag: '🇺🇾', name: 'Peso Uruguaio' },`,
    `];`,
    ``,
    `function App() {`,
].join(R);
if (!c.includes(s1)) { console.error('SEARCH 1 NOT FOUND'); process.exit(1); }
c = c.replace(s1, r1);
console.log('Step 1 OK');

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: Inserir estados de moeda + taxas após [sendingEmail, setSendingEmail]
// ─────────────────────────────────────────────────────────────────────────
const s2 = `  const [sendingEmail, setSendingEmail] = useState(false);${R}${R}  // Estado para conectividade da API`;
const r2 = [
    `  const [sendingEmail, setSendingEmail] = useState(false);`,
    ``,
    `  // Estado de moeda ativa e taxas de câmbio`,
    `  const [activeCurrency, setActiveCurrency] = useState(() => localStorage.getItem('activeCurrency') || 'BRL');`,
    `  const [exchangeRates, setExchangeRates] = useState({ BRL: 1 });`,
    `  const [ratesLastUpdate, setRatesLastUpdate] = useState('');`,
    `  const [loadingRates, setLoadingRates] = useState(false);`,
    `  const [currencyWidgetOpen, setCurrencyWidgetOpen] = useState(false);`,
    ``,
    `  // Estado para conectividade da API`,
].join(R);
if (!c.includes(s2)) { console.error('SEARCH 2 NOT FOUND'); process.exit(1); }
c = c.replace(s2, r2);
console.log('Step 2 OK');

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Partial write OK');

const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

// Safe replace: usa função para evitar o problema de $ especial no replacement
function safeReplace(label, search, replacement) {
    let count = 0;
    let pos = 0;
    while ((pos = c.indexOf(search, pos)) !== -1) { count++; pos += search.length; }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times, aborting'); process.exit(1); }
    // Usa função como replacement para evitar interpretação de $ especial
    c = c.replace(search, () => replacement);
    console.log(label + ': OK');
}

// ─────────────────────────────────────────────────────────────
// STEP 1: Inserir CURRENCIES constant antes de function App()
// ─────────────────────────────────────────────────────────────
const currencies_block = [
    `// Lista de moedas suportadas`,
    `const CURRENCIES = [`,
    `  { code: 'BRL', symbol: 'R$',  flag: '\uD83C\uDDE7\uD83C\uDDF7', name: 'Real Brasileiro' },`,
    `  { code: 'USD', symbol: '$',   flag: '\uD83C\uDDFA\uD83C\uDDF8', name: 'Dolar Americano' },`,
    `  { code: 'EUR', symbol: '\u20AC',   flag: '\uD83C\uDDEA\uD83C\uDDFA', name: 'Euro' },`,
    `  { code: 'GBP', symbol: '\u00A3',   flag: '\uD83C\uDDEC\uD83C\uDDE7', name: 'Libra Esterlina' },`,
    `  { code: 'ARS', symbol: '$',   flag: '\uD83C\uDDE6\uD83C\uDDF7', name: 'Peso Argentino' },`,
    `  { code: 'JPY', symbol: '\u00A5',   flag: '\uD83C\uDDEF\uD83C\uDDF5', name: 'Iene Japones' },`,
    `  { code: 'CLP', symbol: '$',   flag: '\uD83C\uDDE8\uD83C\uDDF1', name: 'Peso Chileno' },`,
    `  { code: 'MXN', symbol: '$',   flag: '\uD83C\uDDF2\uD83C\uDDFD', name: 'Peso Mexicano' },`,
    `  { code: 'PYG', symbol: 'Gs',  flag: '\uD83C\uDDF5\uD83C\uDDFE', name: 'Guarani Paraguaio' },`,
    `  { code: 'UYU', symbol: '$',   flag: '\uD83C\uDDFA\uD83C\uDDFE', name: 'Peso Uruguaio' },`,
    `];`,
    ``,
    `function App() {`,
].join(R);
safeReplace('CURRENCIES constant', `function App() {`, currencies_block);

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: Inserir estados de moeda após [sendingEmail, setSendingEmail]
// ─────────────────────────────────────────────────────────────────────────
const s2 = [
    `  const [sendingEmail, setSendingEmail] = useState(false);`,
    ``,
    `  // Estado para conectividade da API`,
].join(R);
const r2 = [
    `  const [sendingEmail, setSendingEmail] = useState(false);`,
    ``,
    `  // Estado de moeda ativa e taxas de cambio`,
    `  const [activeCurrency, setActiveCurrency] = useState(() => localStorage.getItem('activeCurrency') || 'BRL');`,
    `  const [exchangeRates, setExchangeRates] = useState({ BRL: 1 });`,
    `  const [ratesLastUpdate, setRatesLastUpdate] = useState('');`,
    `  const [loadingRates, setLoadingRates] = useState(false);`,
    `  const [currencyPanelOpen, setCurrencyPanelOpen] = useState(false);`,
    ``,
    `  // Estado para conectividade da API`,
].join(R);
safeReplace('currency states', s2, r2);

// ─────────────────────────────────────────────────────────────────────────
// STEP 3: Inserir fetchExchangeRates + fmtCurrency antes de allNotifications
// ─────────────────────────────────────────────────────────────────────────
const s3 = `  // Agrega todas as notificacoes ativas`;
const r3 = [
    `  // Buscar taxas de cambio (base: BRL)`,
    `  const fetchExchangeRates = React.useCallback(async () => {`,
    `    setLoadingRates(true);`,
    `    try {`,
    `      const res = await fetch(config.API_URL + '/exchange-rates');`,
    `      if (res.ok) {`,
    `        const data = await res.json();`,
    `        setExchangeRates(data.rates || { BRL: 1 });`,
    `        setRatesLastUpdate(data.time_last_update || '');`,
    `      }`,
    `    } catch (e) { console.warn('exchange-rates error:', e.message); }`,
    `    finally { setLoadingRates(false); }`,
    `  }, []);`,
    ``,
    `  useEffect(() => {`,
    `    if (isAuthenticated) fetchExchangeRates();`,
    `  }, [isAuthenticated, fetchExchangeRates]);`,
    ``,
    `  useEffect(() => {`,
    `    localStorage.setItem('activeCurrency', activeCurrency);`,
    `  }, [activeCurrency]);`,
    ``,
    `  // Converte valor de BRL para moeda ativa`,
    `  const convertCurrency = React.useCallback((brlValue) => {`,
    `    if (activeCurrency === 'BRL') return brlValue;`,
    `    const rate = exchangeRates[activeCurrency];`,
    `    return rate ? brlValue * rate : brlValue;`,
    `  }, [activeCurrency, exchangeRates]);`,
    ``,
    `  // Formata valor na moeda ativa`,
    `  const fmtCurrency = React.useCallback((brlValue) => {`,
    `    const curr = CURRENCIES.find(x => x.code === activeCurrency) || CURRENCIES[0];`,
    `    const val = convertCurrency(brlValue);`,
    `    const decimals = (activeCurrency === 'JPY' || activeCurrency === 'CLP' || activeCurrency === 'PYG') ? 0 : 2;`,
    `    return curr.symbol + ' ' + val.toFixed(decimals);`,
    `  }, [activeCurrency, convertCurrency]);`,
    ``,
    `  // Agrega todas as notificacoes ativas`,
].join(R);
safeReplace('fetchExchangeRates + fmtCurrency', s3, r3);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

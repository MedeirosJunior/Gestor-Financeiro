const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

function safeReplace(label, search, replacement) {
    const count = c.split(search).length - 1;
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times, aborting'); process.exit(1); }
    c = c.replace(search, replacement);
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
].join(R);
safeReplace('CURRENCIES constant', `function App() {`, currencies_block + `function App() {`);

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: Inserir estados de moeda após [sendingEmail, setSendingEmail]
// ─────────────────────────────────────────────────────────────────────────
const currency_states = [
    `  const [sendingEmail, setSendingEmail] = useState(false);`,
    ``,
    `  // Estado de moeda ativa e taxas de cambio`,
    `  const [activeCurrency, setActiveCurrency] = useState(() => localStorage.getItem('activeCurrency') || 'BRL');`,
    `  const [exchangeRates, setExchangeRates] = useState({ BRL: 1 });`,
    `  const [ratesLastUpdate, setRatesLastUpdate] = useState('');`,
    `  const [loadingRates, setLoadingRates] = useState(false);`,
    `  const [currencyPanelOpen, setCurrencyPanelOpen] = useState(false);`,
    ``,
].join(R);
safeReplace('currency states',
    `  const [sendingEmail, setSendingEmail] = useState(false);\r\n\r\n  // Estado para conectividade da API`,
    currency_states + `  // Estado para conectividade da API`
);

// ─────────────────────────────────────────────────────────────────────────
// STEP 3: Inserir fetchExchangeRates + fmtCurrency antes de allNotifications
// ─────────────────────────────────────────────────────────────────────────
const fetch_block = [
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
    `  // Formata valor convertido com símbolo`,
    `  const fmtCurrency = React.useCallback((brlValue) => {`,
    `    const curr = CURRENCIES.find(x => x.code === activeCurrency) || CURRENCIES[0];`,
    `    const val = convertCurrency(brlValue);`,
    `    const opts = activeCurrency === 'BRL' ? 2 : (activeCurrency === 'JPY' || activeCurrency === 'CLP' || activeCurrency === 'PYG' ? 0 : 2);`,
    `    return curr.symbol + ' ' + val.toFixed(opts);`,
    `  }, [activeCurrency, convertCurrency]);`,
    ``,
    `  // Agrega todas as notificacoes ativas`,
].join(R);
safeReplace('fetchExchangeRates + fmtCurrency',
    `  // Agrega todas as notificacoes ativas`,
    fetch_block
);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Partial done. Lines:', c.split('\n').length);

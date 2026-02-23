const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

// Simula step 1 com currencies completo
const currencies_block = [
    '// Lista de moedas suportadas',
    'const CURRENCIES = [',
    "  { code: 'BRL', symbol: 'R$' },",
    '];',
    '',
    'function App() {',
].join(R);

c = c.replace('function App() {', currencies_block);
console.log('lines after step1:', c.split('\n').length);
// Verifica s2
const s2 = ['  const [sendingEmail, setSendingEmail] = useState(false);', '', '  // Estado para conectividade da API'].join(R);
let count = 0;
let pos = 0;
while ((pos = c.indexOf(s2, pos)) !== -1) { count++; pos += s2.length; }
console.log('s2 count after step1:', count);

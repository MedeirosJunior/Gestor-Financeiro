const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';
const cb_simple = ['// A', 'const B = [];', 'function App() {'].join(R);
const c2 = c.replace('function App() {', cb_simple);
console.log('orig lines:', c.split('\n').length, 'new lines:', c2.split('\n').length);

// Now try real one
const currencies_block = [
    '// Lista de moedas suportadas',
    'const CURRENCIES = [',
    "  { code: 'BRL', symbol: 'R$' },",
    '];',
    '',
    'function App() {',
].join(R);
const c3 = c.replace('function App() {', currencies_block);
console.log('real replace new lines:', c3.split('\n').length);

const fs = require('fs');
const c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const ci = c.indexOf('login-info');
console.log('=== around login-info ===');
console.log(JSON.stringify(c.slice(ci - 100, ci + 30)));
const fi = c.indexOf('<form onSubmit={handleSubmit}>');
console.log('\n=== around form open ===');
console.log(JSON.stringify(c.slice(fi - 120, fi + 35)));

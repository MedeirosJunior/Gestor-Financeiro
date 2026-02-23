const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const old = "API_URL + '/send-email-summary'";
const rep = "config.API_URL + '/send-email-summary'";
if (!c.includes(old)) { console.error('NOT FOUND'); process.exit(1); }
c = c.replace(old, rep);
fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Fixed');

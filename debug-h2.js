const fs = require('fs');
const c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
let pos = 0;
while ((pos = c.indexOf('<h2>', pos)) !== -1) {
    const chunk = c.slice(pos, pos + 40);
    if (chunk.includes('Login') || chunk.toLowerCase().includes('login')) {
        console.log('Found at', pos);
        for (let i = 0; i < Math.min(chunk.length, 25); i++) {
            process.stdout.write('  [' + i + '] U+' + chunk.charCodeAt(i).toString(16).padStart(4, '0') + ' ' + JSON.stringify(chunk[i]) + '\n');
        }
        break;
    }
    pos++;
}
console.log('\nIndexOf test:');
console.log('U+1F510 match:', c.indexOf('\uD83D\uDD10'));
console.log('U+1F512 match:', c.indexOf('\uD83D\uDD12'));
console.log('literal lock:', c.indexOf('\uD83D\uDD10 Login'));
console.log('literal key:', c.indexOf('\uD83D\uDD11 Login'));

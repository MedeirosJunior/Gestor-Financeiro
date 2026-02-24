/**
 * Corrige o App.jsx que tem bytes isolados de Windows-1252 (Latin-1)
 * misturados com sequências UTF-8 válidas.
 *
 * Estratégia: percorre byte a byte; se encontrar uma sequência UTF-8 válida
 * mantém como está; se encontrar um byte isolado no range 0x80–0xFF (inválido
 * como UTF-8 standalone) trata como Windows-1252 e converte para UTF-8.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'gestor-financeiro-frontend', 'src', 'App.jsx');

// Tabela Windows-1252 → Unicode para os bytes 0x80–0x9F
// (0xA0–0xFF mapeiam 1:1 no Latin-1)
const W1252_MAP = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
    0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
    0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
    0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
    0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
    0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
};

function w1252ToCodePoint(byte) {
    if (W1252_MAP[byte]) return W1252_MAP[byte];
    return byte; // 0xA0–0xFF mapeiam 1:1
}

function isContinuation(b) {
    return (b & 0xC0) === 0x80;
}

const src = fs.readFileSync(filePath);
const out = [];
let i = 0;
let fixed = 0;

while (i < src.length) {
    const b = src[i];

    if (b < 0x80) {
        // ASCII puro — copia diretamente
        out.push(b);
        i++;
    } else if (b >= 0xF0 && b <= 0xF7 &&
        i + 3 < src.length &&
        isContinuation(src[i + 1]) &&
        isContinuation(src[i + 2]) &&
        isContinuation(src[i + 3])) {
        // Sequência UTF-8 de 4 bytes válida — mantém
        out.push(src[i], src[i + 1], src[i + 2], src[i + 3]);
        i += 4;
    } else if (b >= 0xE0 && b <= 0xEF &&
        i + 2 < src.length &&
        isContinuation(src[i + 1]) &&
        isContinuation(src[i + 2])) {
        // Sequência UTF-8 de 3 bytes válida — mantém
        out.push(src[i], src[i + 1], src[i + 2]);
        i += 3;
    } else if (b >= 0xC2 && b <= 0xDF &&
        i + 1 < src.length &&
        isContinuation(src[i + 1])) {
        // Sequência UTF-8 de 2 bytes válida — mantém
        out.push(src[i], src[i + 1]);
        i += 2;
    } else {
        // Byte isolado inválido em UTF-8 → trata como Windows-1252 e converte
        const cp = w1252ToCodePoint(b);
        const encoded = Buffer.from(String.fromCodePoint(cp), 'utf8');
        for (const eb of encoded) out.push(eb);
        fixed++;
        i++;
    }
}

const result = Buffer.from(out);
fs.writeFileSync(filePath, result);

// Contagem final de U+FFFD
const finalText = result.toString('utf8');
const remaining = (finalText.match(/\uFFFD/g) || []).length;

console.log(`✅ Processados ${src.length} bytes → ${result.length} bytes`);
console.log(`🔧 Bytes isolados convertidos: ${fixed}`);
console.log(`⚠️  U+FFFD restantes: ${remaining}`);

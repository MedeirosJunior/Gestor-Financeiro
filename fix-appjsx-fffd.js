/**
 * fix-appjsx-fffd.js
 * Substitui todas as ocorrências de U+FFFD (caracteres destruídos por conversão
 * incorreta de encoding) no App.jsx pelos caracteres corretos.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
    __dirname,
    'gestor-financeiro-frontend',
    'src',
    'App.jsx'
);

let src = fs.readFileSync(filePath, 'utf8');
const FFFD = '\uFFFD'; // caractere de substituição

// ── Verificação inicial ─────────────────────────────────────────────────────
const before = (src.match(/\uFFFD/g) || []).length;
console.log(`U+FFFD antes: ${before}`);

// ── Helper para substituições seguras ──────────────────────────────────────
function replace(from, to) {
    let count = 0;
    while (src.includes(from)) {
        src = src.replace(from, to);
        count++;
    }
    if (count) console.log(`  [${count}x] "${from.replace(/\uFFFD/g, '?')}" → "${to}"`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ACENTOS CORROMPIDOS (cada U+FFFD = 1 caractere Latin-1 perdido)
// ═══════════════════════════════════════════════════════════════════════════

// ção / ção / ção
replace(`recupera${FFFD}${FFFD}o`, 'recuperação');
replace(`Recupera${FFFD}${FFFD}o`, 'Recuperação');
replace(`solicitar recupera${FFFD}${FFFD}o`, 'solicitar recuperação');
replace(`distribui${FFFD}${FFFD}o`, 'distribuição');
replace(`Distribui${FFFD}${FFFD}o`, 'Distribuição');
replace(`notifica${FFFD}${FFFD}o`, 'notificação');
replace(`conex${FFFD}o`, 'conexão');

// ó
replace(`c${FFFD}digo`, 'código');
replace(`C${FFFD}digo`, 'Código');
replace(`inv${FFFD}lido`, 'inválido');
replace(`v${FFFD}lido`, 'válido');

// â
replace(`c${FFFD}mbio`, 'câmbio');
replace(`C${FFFD}mbio`, 'Câmbio');

// á
replace(`R${FFFD}pido`, 'Rápido');

// í
replace(`M${FFFD}nimo`, 'Mínimo');
replace(`m${FFFD}nimo`, 'mínimo');
replace(`dispon${FFFD}vel`, 'disponível');

// ê
replace(`M${FFFD}s`, 'Mês');   // "por Mês"

// ã
replace(`n${FFFD}o`, 'não');   // "não coincidem"

// ç
replace(`Fa${FFFD}a`, 'Faça');  // "Faça login"

// ═══════════════════════════════════════════════════════════════════════════
// 2. SEPARADORES INLINE (U+FFFD entre texto e valor monetário)
// ═══════════════════════════════════════════════════════════════════════════
replace(` ${FFFD} R$ `, ' — R$ ');   // "descrição — R$ 100"
replace(` ${FFFD} `, ' — ');       // "nome — 80% concluída"

// ═══════════════════════════════════════════════════════════════════════════
// 3. SÍMBOLOS DE MOEDA
// ═══════════════════════════════════════════════════════════════════════════
replace(`symbol: '${FFFD}', flag`, "symbol: '€', flag"); // EUR  (linha 347)
replace(`symbol: '${FFFD}', flag`, "symbol: '£', flag"); // GBP  (linha 348 – segunda ocorrência já corrigida)
replace(`symbol: '${FFFD}', flag`, "symbol: '¥', flag"); // JPY  (linha 350)

// Caso genérico residual
replace(`'${FFFD}'`, "'?'");  // fallback para não deixar FFFD visível

// ═══════════════════════════════════════════════════════════════════════════
// 4. FLAGS (pares de emojis regionais — cada flag = 2×4 bytes = 8 U+FFFD)
// ═══════════════════════════════════════════════════════════════════════════
// Cada bandeira regionaleindicador unicode ocupa 2 code points de 4 bytes
// = 8 bytes UTF-8, que ao ser corrompido vira 8 U+FFFD.
// Como cada regional indicator fica 4 bytes → 4 U+FFFD, uma flag = `${FFFD.repeat(8)}`
const F8 = FFFD.repeat(8);
const F4 = FFFD.repeat(4);

replace(`'BRL', symbol: 'R$', flag: '${F8}'`, `'BRL', symbol: 'R$', flag: '🇧🇷'`);
replace(`'USD', symbol: '$', flag: '${F8}'`, `'USD', symbol: '$', flag: '🇺🇸'`);
replace(`'EUR', symbol: '€', flag: '${F8}'`, `'EUR', symbol: '€', flag: '🇪🇺'`);
replace(`'GBP', symbol: '£', flag: '${F8}'`, `'GBP', symbol: '£', flag: '🇬🇧'`);
replace(`'ARS', symbol: '$', flag: '${F8}'`, `'ARS', symbol: '$', flag: '🇦🇷'`);
replace(`'JPY', symbol: '¥', flag: '${F8}'`, `'JPY', symbol: '¥', flag: '🇯🇵'`);
replace(`'CLP', symbol: '$', flag: '${F8}'`, `'CLP', symbol: '$', flag: '🇨🇱'`);
replace(`'MXN', symbol: '$', flag: '${F8}'`, `'MXN', symbol: '$', flag: '🇲🇽'`);
replace(`'PYG', symbol: 'Gs', flag: '${F8}'`, `'PYG', symbol: 'Gs', flag: '🇵🇾'`);
replace(`'UYU', symbol: '$', flag: '${F8}'`, `'UYU', symbol: '$', flag: '🇺🇾'`);

// Fallback genérico para qualquer flag ainda quebrada
replace(F8, '🏳️');

// ═══════════════════════════════════════════════════════════════════════════
// 5. EMOJIS DE 4 BYTES (cada um = 4 U+FFFD)
// ═══════════════════════════════════════════════════════════════════════════

// Linha 1331: icon de notificação de vencimento: overdue=true → ⚠️, false → ✅
replace(`a.overdue ? '${F4}' : '${F4}'`, `a.overdue ? '🔴' : '🟢'`);

// Linha 1353: ícone orçamento: 100%+ → vermelho, abaixo → amarelo
replace(`pct >= 100 ? '${F4}' : '${F4}'`, `pct >= 100 ? '🔴' : '🟡'`);

// Linhas 1372, 1384, 1394: icon de meta
replace(`icon: '${F4}',`, `icon: '🎯',`);

// Linha 1489: botão câmbio
replace(`>${F4}</button>`, `>💱</button>`);

// Linha 1507: ícone standalone (provavelmente câmbio panel)
replace(`\n                  ${F4}\n`, '\n                  💱\n');

// Linha 1517: modo noturno
replace(`'☀️' : '${F4}'`, `'☀️' : '🌙'`);

// Linha 1713: header câmbio
replace(`>${F4} Taxas de`, `>💱 Taxas de`);

// Linha 1725: valor não disponível
replace(`? '${F4}'}`, `? '-'}`);
replace(`': '${FFFD}'}`, `': '-'}`);  // fallback para 1 FFFD

// Linha 1729: atualizado
replace(`>${F4} Atualizado:`, `>🕒 Atualizado:`);

// Linha 1731: conversor rápido
replace(`>${F4} Conversor`, `>🔄 Conversor`);

// Linha 1738: atualizar taxas
replace(`'${F4} Atualizar Taxas'`, `'🔄 Atualizar Taxas'`);

// Linha 1750: notificações
replace(`>${F4} Notificacoes`, `>🔔 Notificações`);
replace(`Notificacoes `, `Notificações `);

// Linha 1759: sem notificações
replace(`>${F4} Nenhuma notificacao`, `>✅ Nenhuma notificação`);
replace(`Nenhuma notificacao `, `Nenhuma notificação `);

// Linha 1779: label enviar e-mail
replace(`\n                ${F4} Enviar resumo por e-mail\n`, '\n                📧 Enviar resumo por e-mail\n');

// Linha 1790: header enviar e-mail
replace(`>${F4} Enviar Resumo por E-mail`, `>📧 Enviar Resumo por E-mail`);

// Linha 1805: botão enviar
replace(`'${F4} Enviar'`, `'📤 Enviar'`);

// Linha 2080: esqueceu a senha
replace(`${F4} Esqueceu a senha?`, `🔑 Esqueceu a senha?`);

// Linha 2087: título recuperar
replace(`>${F4} Recuperar Senha`, `>🔑 Recuperar Senha`);

// Linha 2088: subtitle recuperar (o c?digo = o código)
replace(`o c${FFFD}digo`, 'o código');
replace(`v${FFFD}lido por`, 'válido por');

// Linha 2090: label e-mail
replace(`>${F4} E-mail cadastrado:`, `>📧 E-mail cadastrado:`);

// Linha 2101: botão enviar código
replace(`Enviar C${FFFD}digo`, 'Enviar Código');

// Linha 2111: título nova senha
replace(`>${F4} Nova Senha`, `>🔐 Nova Senha`);

// Linha 2114: modo demo separador
replace(`Modo demo ${FFFD} C`, 'Modo demo — C');

// Linha 2118: label código recebido
replace(`>${F4} C${FFFD}digo recebido:`, `>🔑 Código recebido:`);

// Linha 2132: label nova senha
replace(`>${F4} Nova senha:`, `>🔒 Nova senha:`);

// Linha 2136: label confirmar
replace(`>${F4} Confirmar nova senha:`, `>🔒 Confirmar nova senha:`);

// Linha 4434: distribuição de despesas
replace(`>${F4} Distribui`, `>📊 Distribui`);

// Linha 4514: entradas vs despesas
replace(`>${F4} Entradas vs Despesas`, `>📈 Entradas vs Despesas`);

// Linha 4528: saldo mensal
replace(`>${F4} Saldo Mensal`, `>💰 Saldo Mensal`);

// Linha 1999: toast modo demo
replace(`'⚠️ Modo demo: c${FFFD}digo exibido na tela'`, `'⚠️ Modo demo: código exibido na tela'`);
replace(`'C${FFFD}digo enviado para o e-mail!'`, `'Código enviado para o e-mail!'`);

// Linha 2001
replace(`Erro ao solicitar recupera${FFFD}${FFFD}o`, 'Erro ao solicitar recuperação');

// Linha 2030
replace(`'C${FFFD}digo inv${FFFD}lido ou expirado'`, `'Código inválido ou expirado'`);

// Linha 2649
replace(`fmtCurrency n${FFFD}o dispon${FFFD}vel`, 'fmtCurrency não disponível');

// ── Fallback final: qualquer FFFD ainda restante ────────────────────────────
const remaining = (src.match(/\uFFFD/g) || []).length;
if (remaining > 0) {
    console.log(`\n⚠️  ${remaining} U+FFFD ainda restantes:`);
    const lines = src.split('\n');
    lines.forEach((l, idx) => {
        if (l.includes(FFFD)) console.log(`  L${idx + 1}: ${l.trim().slice(0, 100)}`);
    });
}

// ── Grava ──────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, src, 'utf8');
const after = (src.match(/\uFFFD/g) || []).length;
console.log(`\n✅ Pronto! U+FFFD: ${before} → ${after}`);

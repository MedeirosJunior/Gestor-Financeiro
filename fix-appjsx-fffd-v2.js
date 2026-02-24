/**
 * fix-appjsx-fffd-v2.js  — corrige U+FFFD restantes
 * Emojis regulares (4 bytes UTF-8) → 2 × U+FFFD (par surrogado)
 * Flags regionais (2 code points de 4 bytes) → 4 × U+FFFD
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
const FFFD = '\uFFFD';
const F2 = FFFD.repeat(2); // emoji 4 bytes (1 emoji comum)
const F4 = FFFD.repeat(4); // flag emoji (2 regional indicators)

const before = (src.match(/\uFFFD/g) || []).length;
console.log(`U+FFFD antes: ${before}`);

function replace(from, to) {
    let count = 0;
    while (src.includes(from)) {
        src = src.replace(from, to);
        count++;
    }
    if (count) console.log(`  [${count}x] "${from.replace(/\uFFFD/g, '?')}" → "${to}"`);
}

// ── Corrige símbolos de moeda que foram trocados erroneamente ──────────────
src = src.replace("'GBP', symbol: '€', flag:", "'GBP', symbol: '£', flag:");
src = src.replace("'JPY', symbol: '€', flag:", "'JPY', symbol: '¥', flag:");

// ── FLAGS (4 × U+FFFD) ──────────────────────────────────────────────────────
replace(`'BRL', symbol: 'R$', flag: '${F4}'`, `'BRL', symbol: 'R$', flag: '🇧🇷'`);
replace(`'USD', symbol: '$', flag: '${F4}'`, `'USD', symbol: '$', flag: '🇺🇸'`);
replace(`'EUR', symbol: '€', flag: '${F4}'`, `'EUR', symbol: '€', flag: '🇪🇺'`);
replace(`'GBP', symbol: '£', flag: '${F4}'`, `'GBP', symbol: '£', flag: '🇬🇧'`);
replace(`'ARS', symbol: '$', flag: '${F4}'`, `'ARS', symbol: '$', flag: '🇦🇷'`);
replace(`'JPY', symbol: '¥', flag: '${F4}'`, `'JPY', symbol: '¥', flag: '🇯🇵'`);
replace(`'CLP', symbol: '$', flag: '${F4}'`, `'CLP', symbol: '$', flag: '🇨🇱'`);
replace(`'MXN', symbol: '$', flag: '${F4}'`, `'MXN', symbol: '$', flag: '🇲🇽'`);
replace(`'PYG', symbol: 'Gs', flag: '${F4}'`, `'PYG', symbol: 'Gs', flag: '🇵🇾'`);
replace(`'UYU', symbol: '$', flag: '${F4}'`, `'UYU', symbol: '$', flag: '🇺🇾'`);

// ── EMOJIS REGULARES (2 × U+FFFD) ──────────────────────────────────────────

// notificação: vencido
replace(`a.overdue ? '${F2}' : '${F2}'`, `a.overdue ? '🔴' : '🟢'`);

// orçamento: atingido
replace(`pct >= 100 ? '${F2}' : '${F2}'`, `pct >= 100 ? '🔴' : '🟡'`);

// ícones de meta (genérico)
replace(`icon: '${F2}',`, `icon: '🎯',`);

// botão câmbio
replace(`>${F2}</button>`, `>💱</button>`);

// standalone (ex: ícone na área de câmbio)
replace(`\n                  ${F2}\n`, '\n                  💱\n');

// modo noturno / dark mode
replace(`'☀️' : '${F2}'`, `'☀️' : '🌙'`);

// taxa de câmbio header
replace(`>${F2} Taxas de`, `>💱 Taxas de`);

// valor não disponível — fallback passado pelo F2 simples
replace(`? '${F2}'}`, `? '-'}`);

// atualizado (data)
replace(`>${F2} Atualizado:`, `>🕒 Atualizado:`);

// conversor rápido
replace(`>${F2} Conversor`, `>🔄 Conversor`);

// atualizar taxas
replace(`'${F2} Atualizar Taxas'`, `'🔄 Atualizar Taxas'`);

// notificações badge
replace(`>${F2} Notificações`, `>🔔 Notificações`);

// sem notificações
replace(`>${F2} Nenhuma`, `>✅ Nenhuma`);

// enviar e-mail (label)
replace(`\n                ${F2} Enviar resumo por e-mail`, '\n                📧 Enviar resumo por e-mail');
replace(`\n              ${F2} Enviar resumo por e-mail`, '\n              📧 Enviar resumo por e-mail');
// fallback em caso de indentação diferente
replace(`${F2} Enviar resumo por e-mail`, '📧 Enviar resumo por e-mail');

// enviar e-mail (header)
replace(`>${F2} Enviar Resumo por E-mail`, `>📧 Enviar Resumo por E-mail`);

// botão enviar
replace(`'${F2} Enviar'`, `'📤 Enviar'`);

// login: esqueceu a senha
replace(`${F2} Esqueceu a senha?`, `🔑 Esqueceu a senha?`);

// recuperar senha
replace(`>${F2} Recuperar Senha`, `>🔑 Recuperar Senha`);

// E-mail label
replace(`>${F2} E-mail cadastrado:`, `>📧 E-mail cadastrado:`);

// nova senha título
replace(`>${F2} Nova Senha`, `>🔐 Nova Senha`);

// código recebido
replace(`>${F2} Código recebido:`, `>🔑 Código recebido:`);

// nova senha label
replace(`>${F2} Nova senha:`, `>🔒 Nova senha:`);

// confirmar nova senha label
replace(`>${F2} Confirmar nova senha:`, `>🔒 Confirmar nova senha:`);

// distribuição de despesas
replace(`>${F2} Distribuição de Despesas`, `>📊 Distribuição de Despesas`);

// entradas vs despesas
replace(`>${F2} Entradas vs Despesas`, `>📈 Entradas vs Despesas`);

// saldo mensal
replace(`>${F2} Saldo Mensal`, `>💰 Saldo Mensal`);

// ── Residuais não cobertos acima ───────────────────────────────────────────
const remaining = (src.match(/\uFFFD/g) || []).length;
if (remaining > 0) {
    console.log(`\n⚠️  ${remaining} U+FFFD ainda restantes:`);
    src.split('\n').forEach((l, idx) => {
        if (l.includes(FFFD)) console.log(`  L${idx + 1}: ${l.trim().slice(0, 120)}`);
    });
}

fs.writeFileSync(filePath, src, 'utf8');
console.log(`\n✅ Pronto! U+FFFD: ${before} → ${(src.match(/\uFFFD/g) || []).length}`);

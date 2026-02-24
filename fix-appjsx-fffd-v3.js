/**
 * fix-appjsx-fffd-v3.js  — usa split/join para evitar RangeError em arquivos grandes
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
const F2 = FFFD.repeat(2);
const F4 = FFFD.repeat(4);

const before = (src.match(/\uFFFD/g) || []).length;
console.log(`U+FFFD antes: ${before}`);

/** Global replace com split/join (seguro para arquivos grandes) */
function rep(from, to) {
    if (!src.includes(from)) return;
    const parts = src.split(from);
    const count = parts.length - 1;
    src = parts.join(to);
    console.log(`  [${count}x] "${from.replace(/\uFFFD/g, '?')}" → "${to}"`);
}

// ── Corrige símbolos de moeda errôneos da v1 ──────────────────────────────
rep("'GBP', symbol: '€', flag:", "'GBP', symbol: '£', flag:");
rep("'JPY', symbol: '€', flag:", "'JPY', symbol: '¥', flag:");

// ── FLAGS (4 × U+FFFD) ──────────────────────────────────────────────────────
rep(`'BRL', symbol: 'R$', flag: '${F4}'`, `'BRL', symbol: 'R$', flag: '🇧🇷'`);
rep(`'USD', symbol: '$', flag: '${F4}'`, `'USD', symbol: '$', flag: '🇺🇸'`);
rep(`'EUR', symbol: '€', flag: '${F4}'`, `'EUR', symbol: '€', flag: '🇪🇺'`);
rep(`'GBP', symbol: '£', flag: '${F4}'`, `'GBP', symbol: '£', flag: '🇬🇧'`);
rep(`'ARS', symbol: '$', flag: '${F4}'`, `'ARS', symbol: '$', flag: '🇦🇷'`);
rep(`'JPY', symbol: '¥', flag: '${F4}'`, `'JPY', symbol: '¥', flag: '🇯🇵'`);
rep(`'CLP', symbol: '$', flag: '${F4}'`, `'CLP', symbol: '$', flag: '🇨🇱'`);
rep(`'MXN', symbol: '$', flag: '${F4}'`, `'MXN', symbol: '$', flag: '🇲🇽'`);
rep(`'PYG', symbol: 'Gs', flag: '${F4}'`, `'PYG', symbol: 'Gs', flag: '🇵🇾'`);
rep(`'UYU', symbol: '$', flag: '${F4}'`, `'UYU', symbol: '$', flag: '🇺🇾'`);

// ── EMOJIS REGULARES (2 × U+FFFD por emoji 4 bytes) ────────────────────────
rep(`a.overdue ? '${F2}' : '${F2}'`, `a.overdue ? '🔴' : '🟢'`);
rep(`pct >= 100 ? '${F2}' : '${F2}'`, `pct >= 100 ? '🔴' : '🟡'`);
rep(`icon: '${F2}',`, `icon: '🎯',`);

// botão câmbio e ícone standalone
rep(`>${F2}</button>`, `>💱</button>`);
rep(`'☀️' : '${F2}'`, `'☀️' : '🌙'`);

// câmbio header / conversor / atualizar
rep(`>${F2} Taxas de`, `>💱 Taxas de`);
rep(`>${F2} Atualizado:`, `>🕒 Atualizado:`);
rep(`>${F2} Conversor`, `>🔄 Conversor`);
rep(`'${F2} Atualizar Taxas'`, `'🔄 Atualizar Taxas'`);

// notificações
rep(`>${F2} Notificações`, `>🔔 Notificações`);
rep(`>${F2} Nenhuma`, `>✅ Nenhuma`);

// e-mail
rep(`${F2} Enviar resumo por e-mail`, `📧 Enviar resumo por e-mail`);
rep(`>${F2} Enviar Resumo por E-mail`, `>📧 Enviar Resumo por E-mail`);
rep(`'${F2} Enviar'`, `'📤 Enviar'`);

// login / recuperação de senha
rep(`${F2} Esqueceu a senha?`, `🔑 Esqueceu a senha?`);
rep(`>${F2} Recuperar Senha`, `>🔑 Recuperar Senha`);
rep(`>${F2} E-mail cadastrado:`, `>📧 E-mail cadastrado:`);
rep(`>${F2} Nova Senha`, `>🔐 Nova Senha`);
rep(`>${F2} Código recebido:`, `>🔑 Código recebido:`);
rep(`>${F2} Nova senha:`, `>🔒 Nova senha:`);
rep(`>${F2} Confirmar nova senha:`, `>🔒 Confirmar nova senha:`);

// gráficos
rep(`>${F2} Distribuição de Despesas`, `>📊 Distribuição de Despesas`);
rep(`>${F2} Entradas vs Despesas`, `>📈 Entradas vs Despesas`);
rep(`>${F2} Saldo Mensal`, `>💰 Saldo Mensal`);

// Standalone: ícone solto (ex: painel câmbio) – qualquer F2 restante num contexto de JSX
rep(`\n                  ${F2}\n`, '\n                  💱\n');
rep(`\n                ${F2}\n`, '\n                💱\n');

// ── Residuais ──────────────────────────────────────────────────────────────
const remaining = (src.match(/\uFFFD/g) || []).length;
if (remaining > 0) {
    console.log(`\n⚠️  ${remaining} U+FFFD ainda restantes:`);
    src.split('\n').forEach((l, idx) => {
        if (l.includes(FFFD)) console.log(`  L${idx + 1}: ${l.trim().slice(0, 120)}`);
    });
}

fs.writeFileSync(filePath, src, 'utf8');
console.log(`\n✅ Pronto! U+FFFD: ${before} → ${(src.match(/\uFFFD/g) || []).length}`);

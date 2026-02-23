const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

function safeReplace(label, search, replacement) {
    let count = 0;
    let pos = 0;
    while ((pos = c.indexOf(search, pos)) !== -1) { count++; pos += search.length; }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times, aborting'); process.exit(1); }
    c = c.replace(search, () => replacement);
    console.log(label + ': OK');
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: Adicionar seletor de moeda no header (ao lado do sino)
// ─────────────────────────────────────────────────────────────────────────────
const s4_search = '              <div className="notif-bell-wrap">';
const s4_replace = [
    `              <div className="currency-selector-wrap">`,
    `                <select`,
    `                  className="currency-select"`,
    `                  value={activeCurrency}`,
    `                  onChange={e => setActiveCurrency(e.target.value)}`,
    `                  title="Selecionar moeda"`,
    `                >`,
    `                  {CURRENCIES.map(cur => (`,
    `                    <option key={cur.code} value={cur.code}>{cur.flag} {cur.code}</option>`,
    `                  ))}`,
    `                </select>`,
    `              </div>`,
    `              <div className="notif-bell-wrap">`,
].join(R);
safeReplace('currency selector in header', s4_search, s4_replace);

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: Adicionar widget conversor de moeda + info taxas na aba de Relatorios
// Localiza o fim do painel de email (modal) antes do ToastContainer
// Adiciona um conversor rápido como componente após os modais
// ─────────────────────────────────────────────────────────────────────────────

// Busca o painel de notificações footer para injetar seção de taxas
const s5_search = [
    `      {/* Painel de Notificacoes */}`,
].join(R);
const s5_replace = [
    `      {/* Painel de taxas e conversor rapido */}`,
    `      {currencyPanelOpen && (`,
    `        <div className="notif-overlay" onClick={() => setCurrencyPanelOpen(false)}>`,
    `          <div className="notif-panel currency-panel" onClick={e => e.stopPropagation()}>`,
    `            <div className="notif-panel-header">`,
    `              <span>\uD83D\uDCB1 Taxas de C\u00E2mbio (base: BRL)</span>`,
    `              <button className="notif-close-btn" onClick={() => setCurrencyPanelOpen(false)}>\u2715</button>`,
    `            </div>`,
    `            {loadingRates ? (`,
    `              <div className="notif-empty">\u23F3 Atualizando taxas...</div>`,
    `            ) : (`,
    `              <>`,
    `                <div className="rates-grid">`,
    `                  {CURRENCIES.filter(x => x.code !== 'BRL').map(cur => (`,
    `                    <div key={cur.code} className={'rate-item' + (activeCurrency === cur.code ? ' rate-active' : '')} onClick={() => setActiveCurrency(cur.code)}>`,
    `                      <span className="rate-flag">{cur.flag}</span>`,
    `                      <span className="rate-code">{cur.code}</span>`,
    `                      <span className="rate-val">{exchangeRates[cur.code] ? exchangeRates[cur.code].toFixed(4) : '—'}</span>`,
    `                    </div>`,
    `                  ))}`,
    `                </div>`,
    `                {ratesLastUpdate && <div className="rates-updated">\uD83D\uDD04 Atualizado: {ratesLastUpdate}</div>}`,
    `                <div className="currency-mini-converter">`,
    `                  <h4 style={{margin:'0 0 10px',fontSize:'0.9rem'}}>\uD83D\uDD01 Conversor R\u00E1pido</h4>`,
    `                  <CurrencyConverter exchangeRates={exchangeRates} activeCurrency={activeCurrency} fmtCurrency={fmtCurrency} />`,
    `                </div>`,
    `              </>`,
    `            )}`,
    `            <div className="notif-panel-footer">`,
    `              <button className="notif-email-btn" onClick={fetchExchangeRates} disabled={loadingRates}>`,
    `                {loadingRates ? '\u23F3 Atualizando...' : '\uD83D\uDD04 Atualizar Taxas'}`,
    `              </button>`,
    `            </div>`,
    `          </div>`,
    `        </div>`,
    `      )}`,
    ``,
    `      {/* Painel de Notificacoes */}`,
].join(R);
safeReplace('currency panel', s5_search, s5_replace);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

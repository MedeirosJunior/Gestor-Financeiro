const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
const R = '\r\n';

// ──────────────────────────────────────────────────────────
// STEP 1: Inserir estados de notificação após bloco darkMode
// ──────────────────────────────────────────────────────────
const s1 = `  }, [darkMode]);${R}${R}  // Estado para conectividade da API`;
const r1 = [
    `  }, [darkMode]);`,
    ``,
    `  // Estado para painel de notificacoes`,
    `  const [notifOpen, setNotifOpen] = useState(false);`,
    `  const [readNotifIds, setReadNotifIds] = useState(() => {`,
    `    try { return new Set(JSON.parse(localStorage.getItem('readNotifIds') || '[]')); }`,
    `    catch { return new Set(); }`,
    `  });`,
    `  const [emailModalOpen, setEmailModalOpen] = useState(false);`,
    `  const [emailInput, setEmailInput] = useState('');`,
    `  const [sendingEmail, setSendingEmail] = useState(false);`,
    ``,
    `  // Estado para conectividade da API`,
].join(R);

if (!c.includes(s1)) { console.error('SEARCH 1 NOT FOUND'); process.exit(1); }
c = c.replace(s1, r1);
console.log('Step 1 OK');

// ──────────────────────────────────────────────────────────────────────────────────────────────
// STEP 2: Inserir allNotifications useMemo + helpers antes de   const isAdmin = currentUser...
// ──────────────────────────────────────────────────────────────────────────────────────────────
const s2 = `  const isAdmin = currentUser?.email === 'junior395@gmail.com';`;
const r2 = [
    `  // Agrega todas as notificacoes ativas`,
    `  const allNotifications = useMemo(() => {`,
    `    const items = [];`,
    `    const now = new Date();`,
    `    const currentMonth = now.toISOString().slice(0, 7);`,
    ``,
    `    // 1. Despesas recorrentes vencidas / proximas do vencimento`,
    `    dueAlerts.forEach(a => items.push({`,
    `      id: 'exp-' + a.id + '-' + a.nextDue,`,
    `      type: a.overdue ? 'overdue' : 'due-soon',`,
    `      priority: a.overdue ? 0 : 1,`,
    `      icon: a.overdue ? '🔴' : '🟡',`,
    `      title: a.overdue ? 'Despesa Vencida' : ('Vence em ' + a.daysUntilDue + ' dia(s)'),`,
    `      body: a.description + ' — R$ ' + parseFloat(a.value).toFixed(2),`,
    `      date: a.nextDue,`,
    `    }));`,
    ``,
    `    // 2. Orcamentos estourados ou quase (>=80%) no mes atual`,
    `    const allCats = [...(categories?.despesa || []), ...(categories?.entrada || [])];`,
    `    const monthTrans = transactions.filter(t => t.date.startsWith(currentMonth) && t.type === 'despesa');`,
    `    budgets.filter(b => b.period === 'monthly' || b.period === 'mensal').forEach(b => {`,
    `      const catIds = allCats.filter(c => c.name.toLowerCase() === b.category.toLowerCase()).map(c => c.id);`,
    `      const spent = monthTrans`,
    `        .filter(t => catIds.includes(t.category))`,
    `        .reduce((s, t) => s + parseFloat(t.value || 0), 0);`,
    `      const limit = parseFloat(b.limit_value);`,
    `      if (limit > 0) {`,
    `        const pct = (spent / limit) * 100;`,
    `        if (pct >= 80) {`,
    `          items.push({`,
    `            id: 'budget-' + b.id + '-' + currentMonth,`,
    `            type: pct >= 100 ? 'over-budget' : 'near-budget',`,
    `            priority: pct >= 100 ? 0 : 1,`,
    `            icon: pct >= 100 ? '🔴' : '🟡',`,
    `            title: pct >= 100 ? 'Orcamento Estourado' : 'Orcamento Quase no Limite',`,
    `            body: b.category + ': R$ ' + spent.toFixed(2) + ' / R$ ' + limit.toFixed(2) + ' (' + pct.toFixed(0) + '%)',`,
    `            date: currentMonth,`,
    `          });`,
    `        }`,
    `      }`,
    `    });`,
    ``,
    `    // 3. Metas: prazo vencido, proximo (<=30d) ou 100% alcancada`,
    `    goals.forEach(g => {`,
    `      const curr = parseFloat(g.current_amount || 0);`,
    `      const target = parseFloat(g.target_amount);`,
    `      const pct = target > 0 ? (curr / target * 100) : 0;`,
    `      if (pct >= 100) {`,
    `        items.push({`,
    `          id: 'goal-done-' + g.id,`,
    `          type: 'goal-achieved',`,
    `          priority: 2,`,
    `          icon: '🏆',`,
    `          title: 'Meta Alcancada!',`,
    `          body: g.name + ' — R$ ' + curr.toFixed(2) + ' / R$ ' + target.toFixed(2),`,
    `          date: g.deadline || '',`,
    `        });`,
    `      } else if (g.deadline) {`,
    `        const diff = Math.ceil((new Date(g.deadline + 'T00:00:00') - now) / 86400000);`,
    `        if (diff < 0) {`,
    `          items.push({`,
    `            id: 'goal-overdue-' + g.id,`,
    `            type: 'goal-overdue',`,
    `            priority: 0,`,
    `            icon: '🔴',`,
    `            title: 'Meta com Prazo Vencido',`,
    `            body: g.name + ' — ' + pct.toFixed(0) + '% concluida',`,
    `            date: g.deadline,`,
    `          });`,
    `        } else if (diff <= 30) {`,
    `          items.push({`,
    `            id: 'goal-dl-' + g.id,`,
    `            type: 'goal-deadline',`,
    `            priority: 1,`,
    `            icon: '🎯',`,
    `            title: 'Meta vence em ' + diff + ' dia(s)',`,
    `            body: g.name + ' — ' + pct.toFixed(0) + '% concluida',`,
    `            date: g.deadline,`,
    `          });`,
    `        }`,
    `      }`,
    `    });`,
    ``,
    `    return items.sort((a, b) => a.priority - b.priority);`,
    `    // eslint-disable-next-line react-hooks/exhaustive-deps`,
    `  }, [dueAlerts, budgets, goals, transactions, categories]);`,
    ``,
    `  const unreadCount = allNotifications.filter(n => !readNotifIds.has(n.id)).length;`,
    ``,
    `  const markAllRead = () => {`,
    `    const ids = allNotifications.map(n => n.id);`,
    `    const newSet = new Set([...readNotifIds, ...ids]);`,
    `    setReadNotifIds(newSet);`,
    `    localStorage.setItem('readNotifIds', JSON.stringify([...newSet]));`,
    `  };`,
    ``,
    `  const handleSendEmail = async () => {`,
    `    if (!emailInput.trim()) return;`,
    `    setSendingEmail(true);`,
    `    try {`,
    `      const token = localStorage.getItem('token');`,
    `      const res = await fetch(API_URL + '/send-email-summary', {`,
    `        method: 'POST',`,
    `        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },`,
    `        body: JSON.stringify({ email: emailInput, notifications: allNotifications }),`,
    `      });`,
    `      if (res.ok) { toast.success('Resumo enviado por e-mail!'); setEmailModalOpen(false); }`,
    `      else { const d = await res.json(); toast.error(d.message || 'Erro ao enviar e-mail'); }`,
    `    } catch { toast.error('Erro ao enviar e-mail'); }`,
    `    finally { setSendingEmail(false); }`,
    `  };`,
    ``,
    `  const isAdmin = currentUser?.email === 'junior395@gmail.com';`,
].join(R);

if (!c.includes(s2)) { console.error('SEARCH 2 NOT FOUND'); process.exit(1); }
c = c.replace(s2, r2);
console.log('Step 2 OK');

// ──────────────────────────────────────────────────────────────────────────
// STEP 3: Adicionar sino (bell) no header ao lado do botão darkmode
// ──────────────────────────────────────────────────────────────────────────

// Identify current darkmode button block using unique surrounding text
const oldBellMarker = `              <button${R}                className="darkmode-btn"${R}                onClick={() => setDarkMode(dm => !dm)}`;
if (!c.includes(oldBellMarker)) { console.error('SEARCH 3 NOT FOUND'); process.exit(1); }

// Find the closing of the darkmode button to get full replacement target
const dmBtnStart = c.indexOf(oldBellMarker);
const dmBtnClose = c.indexOf('</button>', dmBtnStart) + '</button>'.length;
const oldDmBtn = c.substring(dmBtnStart, dmBtnClose);

const newBellAndDm = [
    `              <div className="notif-bell-wrap">`,
    `                <button`,
    `                  className="notif-bell-btn"`,
    `                  onClick={() => setNotifOpen(o => !o)}`,
    `                  title="Notificacoes"`,
    `                >`,
    `                  🔔`,
    `                  {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}`,
    `                </button>`,
    `              </div>`,
    `              <button`,
    `                className="darkmode-btn"`,
    `                onClick={() => setDarkMode(dm => !dm)}`,
    `                title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}`,
    `                style={{ marginLeft: '6px' }}`,
    `              >`,
    `                {darkMode ? '\u2600\uFE0F' : '\uD83C\uDF19'}`,
    `              </button>`,
].join(R);

c = c.substring(0, dmBtnStart) + newBellAndDm + c.substring(dmBtnClose);
console.log('Step 3 OK');

// ──────────────────────────────────────────────────────────────────────────────────
// STEP 4: Adicionar painel de notificações + modal de email antes do ToastContainer
// ──────────────────────────────────────────────────────────────────────────────────
const s4 = `      <ToastContainer />${R}    </div>${R}  );${R}}`;
const notifPanel = [
    `      {/* Painel de Notificacoes */}`,
    `      {notifOpen && (`,
    `        <div className="notif-overlay" onClick={() => setNotifOpen(false)}>`,
    `          <div className="notif-panel" onClick={e => e.stopPropagation()}>`,
    `            <div className="notif-panel-header">`,
    `              <span>🔔 Notificacoes {allNotifications.length > 0 && '(' + allNotifications.length + ')'}</span>`,
    `              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>`,
    `                {allNotifications.length > 0 && (`,
    `                  <button className="notif-mark-read" onClick={markAllRead}>\u2705 Lidas</button>`,
    `                )}`,
    `                <button className="notif-close-btn" onClick={() => setNotifOpen(false)}>\u2715</button>`,
    `              </div>`,
    `            </div>`,
    `            {allNotifications.length === 0 ? (`,
    `              <div className="notif-empty">\uD83C\uDF89 Nenhuma notificacao no momento</div>`,
    `            ) : (`,
    `              <div className="notif-list">`,
    `                {allNotifications.map(n => (`,
    `                  <div key={n.id} className={'notif-item notif-type-' + n.type + (readNotifIds.has(n.id) ? ' read' : ' unread')}>`,
    `                    <span className="notif-item-icon">{n.icon}</span>`,
    `                    <div className="notif-item-content">`,
    `                      <div className="notif-item-title">{n.title}</div>`,
    `                      <div className="notif-item-body">{n.body}</div>`,
    `                      {n.date && <div className="notif-item-date">{n.date}</div>}`,
    `                    </div>`,
    `                  </div>`,
    `                ))}`,
    `              </div>`,
    `            )}`,
    `            <div className="notif-panel-footer">`,
    `              <button`,
    `                className="notif-email-btn"`,
    `                onClick={() => { setEmailInput(currentUser?.email || ''); setEmailModalOpen(true); }}`,
    `              >`,
    `                \uD83D\uDCE7 Enviar resumo por e-mail`,
    `              </button>`,
    `            </div>`,
    `          </div>`,
    `        </div>`,
    `      )}`,
    ``,
    `      {/* Modal de e-mail */}`,
    `      {emailModalOpen && (`,
    `        <div className="modal-overlay" onClick={() => setEmailModalOpen(false)}>`,
    `          <div className="modal-content notif-email-modal" onClick={e => e.stopPropagation()}>`,
    `            <h3 style={{ marginTop: 0, marginBottom: '10px' }}>\uD83D\uDCE7 Enviar Resumo por E-mail</h3>`,
    `            <p style={{ color: '#94a3b8', marginBottom: '14px', fontSize: '14px', lineHeight: 1.5 }}>`,
    `              Enviaremos um resumo das suas notificacoes ativas para:`,
    `            </p>`,
    `            <input`,
    `              type="email"`,
    `              className="input-field"`,
    `              placeholder="seu@email.com"`,
    `              value={emailInput}`,
    `              onChange={e => setEmailInput(e.target.value)}`,
    `              style={{ marginBottom: '14px', width: '100%', boxSizing: 'border-box' }}`,
    `            />`,
    `            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>`,
    `              <button className="cancel-btn" onClick={() => setEmailModalOpen(false)}>Cancelar</button>`,
    `              <button className="submit-btn" onClick={handleSendEmail} disabled={sendingEmail}>`,
    `                {sendingEmail ? '\u23F3 Enviando...' : '\uD83D\uDCE4 Enviar'}`,
    `              </button>`,
    `            </div>`,
    `          </div>`,
    `        </div>`,
    `      )}`,
    ``,
    `      <ToastContainer />`,
    `    </div>`,
    `  );`,
    `}`,
].join(R);

if (!c.includes(s4)) { console.error('SEARCH 4 NOT FOUND'); process.exit(1); }
c = c.replace(s4, notifPanel);
console.log('Step 4 OK');

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('All done. Lines: ' + c.split('\n').length);

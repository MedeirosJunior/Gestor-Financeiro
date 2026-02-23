const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
c = c.replace(/\r\n/g, '\n');

function safeReplace(label, search, replacement) {
    let count = 0, pos = 0;
    while ((pos = c.indexOf(search, pos)) !== -1) { count++; pos += search.length; }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times'); process.exit(1); }
    c = c.replace(search, () => replacement);
    console.log(label + ': OK');
}

// STEP 1: Wrap the login h2 + form inside {!forgotStep && (<> ... </>)}
// The h2 contains mojibake emoji - search by the " Login</h2>" suffix
const h2Tag = c.indexOf(' Login</h2>');
if (h2Tag === -1) { console.error('Login h2 not found'); process.exit(1); }
// go back to the < that starts <h2>
const h2Start = c.lastIndexOf('<h2>', h2Tag);
if (h2Start === -1) { console.error('h2 start not found'); process.exit(1); }
const formOpen = c.indexOf('<form onSubmit={handleSubmit}>');
if (formOpen === -1) { console.error('form open not found'); process.exit(1); }
console.log('h2Start:', h2Start, 'formOpen:', formOpen);
const loginOpenStr = c.slice(h2Start, formOpen + '<form onSubmit={handleSubmit}>'.length);
const loginOpenReplacement = '{!forgotStep && (<>\n        ' + loginOpenStr;
c = c.slice(0, h2Start) + loginOpenReplacement + c.slice(formOpen + '<form onSubmit={handleSubmit}>'.length);
console.log('Step 1 wrap h2+form: OK');

// STEP 2: Close wrapper + add recovery forms before login-info
safeReplace('close wrapper + recovery forms',
    `            Entrar\n          </ButtonSpinner>\n        </form>\n\n        <div className="login-info">`,

    `            Entrar
          </ButtonSpinner>
        </form>
        <div className="forgot-link-wrap">
          <button
            type="button"
            className="forgot-link"
            onClick={() => { setForgotStep('email'); setForgotEmail(credentials.email || ''); }}
          >
            \uD83D\uDD11 Esqueceu a senha?
          </button>
        </div>
        </>)}

        {forgotStep === 'email' && (
          <form onSubmit={handleForgotRequest} className="forgot-form">
            <h2>\uD83D\uDD11 Recuperar Senha</h2>
            <p className="forgot-info">Informe seu e-mail para receber o c\u00F3digo (v\u00E1lido por 15 min).</p>
            <div className="form-group">
              <label>\uD83D\uDCE7 E-mail cadastrado:</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                required
                autoFocus
              />
            </div>
            <ButtonSpinner type="submit" className="login-btn" loading={forgotLoading}>
              Enviar C\u00F3digo
            </ButtonSpinner>
            <button type="button" className="forgot-back-btn" onClick={() => setForgotStep(null)}>
              \u2190 Voltar ao login
            </button>
          </form>
        )}

        {forgotStep === 'reset' && (
          <form onSubmit={handleResetPassword} className="forgot-form">
            <h2>\uD83D\uDD11 Nova Senha</h2>
            {demoCode && (
              <div className="demo-code-box">
                \u26A0\uFE0F Modo demo \u2014 C\u00F3digo: <strong>{demoCode}</strong>
              </div>
            )}
            <div className="form-group">
              <label>\uD83D\uDD11 C\u00F3digo recebido:</label>
              <input
                type="text"
                inputMode="numeric"
                value={forgotCode}
                onChange={e => setForgotCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                autoFocus
                style={{ letterSpacing: '6px', fontSize: '1.3rem', textAlign: 'center' }}
              />
            </div>
            <div className="form-group">
              <label>\uD83D\uDD12 Nova senha:</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="M\u00EDnimo 6 caracteres" required minLength={6} />
            </div>
            <div className="form-group">
              <label>\uD83D\uDD12 Confirmar nova senha:</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" required />
            </div>
            <ButtonSpinner type="submit" className="login-btn" loading={forgotLoading}>
              Redefinir Senha
            </ButtonSpinner>
            <button type="button" className="forgot-back-btn" onClick={() => setForgotStep('email')}>
              \u2190 Voltar
            </button>
          </form>
        )}

        <div className="login-info">`
);

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

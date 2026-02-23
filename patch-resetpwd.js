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

// Step 1: Wrap login h2+form with {!forgotStep && (<> ... </>)}
// and add "Esqueceu a senha?" link + recovery forms
// Target: from <h2>🔐 Login</h2> through </form>\n\n        <div className="login-info">
const loginBlockStart = `        <h2>\uD83D\uDD10 Login</h2>
        <form onSubmit={handleSubmit}>`;

// Check the actual content
const testIdx = c.indexOf('<h2>');
let around = c.slice(testIdx, testIdx + 60);
console.log('h2 area:', JSON.stringify(around));

// Find the closing form right before login-info  
const closingAnchor = `          </ButtonSpinner>
        </form>

        <div className="login-info">`;

safeReplace('login form closing + recovery forms',
    closingAnchor,
    `          </ButtonSpinner>
        </form>
        <div className="forgot-link-wrap">
          <button type="button" className="forgot-link" onClick={() => { setForgotStep('email'); setForgotEmail(credentials.email || ''); }}>
            \uD83D\uDD11 Esqueceu a senha?
          </button>
        </div>
        </>)}
        {forgotStep === 'email' && (
          <form onSubmit={handleForgotRequest} className="forgot-form">
            <h2>\uD83D\uDD11 Recuperar Senha</h2>
            <p className="forgot-info">Informe seu e-mail para receber o c\u00F3digo de recupera\u00E7\u00E3o (v\u00E1lido por 15 min).</p>
            <div className="form-group">
              <label>\uD83D\uDCE7 E-mail cadastrado:</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="Digite seu e-mail" required autoFocus />
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
              <input type="text" inputMode="numeric" value={forgotCode} onChange={e => setForgotCode(e.target.value)} placeholder="000000" maxLength={6} required autoFocus style={{ letterSpacing: '6px', fontSize: '1.3rem', textAlign: 'center' }} />
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

// Step 2: Wrap login h2 + form open with {!forgotStep}
// Find the h2 Login tag
const h2Search = c.slice(c.indexOf('<h2>'), c.indexOf('<h2>') + 25);
console.log('h2 content:', JSON.stringify(h2Search));

// Now do the actual replacement - find h2 through the form
// We need to find "<h2>...Login...</h2>\n        <form onSubmit={handleSubmit}>"
// Let's search dynamically:
const formIdx = c.indexOf('<form onSubmit={handleSubmit}>');
if (formIdx === -1) { console.error('form not found'); process.exit(1); }

// Look backwards for the <h2> before this form
const h2Idx = c.lastIndexOf('<h2>', formIdx);
if (h2Idx === -1) { console.error('h2 before form not found'); process.exit(1); }

const oldSection = c.slice(h2Idx - 8, formIdx + '<form onSubmit={handleSubmit}>'.length);
console.log('oldSection:', JSON.stringify(oldSection));

const newSection = oldSection.replace(
    /^(\s*)(.*<h2>.*<\/h2>\s*<form onSubmit=\{handleSubmit\}>)$/s,
    '$1{!forgotStep && (<>\n$1$2'
);

if (oldSection === newSection) {
    console.error('Step 2 replacement did not change anything');
    process.exit(1);
}
c = c.slice(0, h2Idx - 8) + newSection + c.slice(formIdx + '<form onSubmit={handleSubmit}>'.length);
console.log('Step 2 (wrap login form): OK');

fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

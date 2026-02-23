const fs = require('fs');
let c = fs.readFileSync('gestor-financeiro-frontend/src/App.jsx', 'utf8');
// Normalize CRLF → LF for consistent matching
c = c.replace(/\r\n/g, '\n');

function safeReplace(label, search, replacement) {
    let count = 0, pos = 0;
    while ((pos = c.indexOf(search, pos)) !== -1) { count++; pos += search.length; }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (count > 1) { console.error(label + ': FOUND ' + count + ' times, aborting'); process.exit(1); }
    c = c.replace(search, () => replacement);
    console.log(label + ': OK');
}

function safeReplaceNth(label, search, replacement, nth) {
    let count = 0, pos = 0, targetIdx = -1;
    while ((pos = c.indexOf(search, pos)) !== -1) {
        count++;
        if (count === nth) targetIdx = pos;
        pos += search.length;
    }
    if (count === 0) { console.error(label + ': NOT FOUND'); process.exit(1); }
    if (targetIdx === -1) { console.error(label + ': occurrence ' + nth + ' not found (total: ' + count + ')'); process.exit(1); }
    c = c.substring(0, targetIdx) + replacement + c.substring(targetIdx + search.length);
    console.log(label + ' (nth=' + nth + '): OK (total: ' + count + ')');
}

// =====================================================
// STEP 1: Dashboard card values → fmt()
// =====================================================
safeReplace('dash card entradas value',
    `          <div className="card-value">R$ {totalEntradas.toFixed(2)}</div>`,
    `          <div className="card-value">{fmt(totalEntradas)}</div>`
);
safeReplace('dash card despesas value',
    `          <div className="card-value">R$ {totalDespesas.toFixed(2)}</div>`,
    `          <div className="card-value">{fmt(totalDespesas)}</div>`
);
safeReplace('dash card saldo value',
    `          <div className="card-value">R$ {saldo.toFixed(2)}</div>`,
    `          <div className="card-value">{fmt(saldo)}</div>`
);

// =====================================================
// STEP 2: Relatorios signature + fmt + REPORT_COLORS + pieData
// =====================================================
safeReplace('relatorios signature',
    `function Relatorios({ transactions, loadingExport, setLoadingExport, categories }) {`,
    `function Relatorios({ transactions, loadingExport, setLoadingExport, categories, fmtCurrency }) {`
);

// Add fmt + REPORT_COLORS after selectedYear state
safeReplace('relatorios fmt setup',
    `  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const monthlyData = transactions.filter(t =>`,
    `  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const fmt = fmtCurrency || ((v) => 'R$ ' + v.toFixed(2));
  const REPORT_COLORS = ['#6366f1', '#e74c3c', '#f59e0b', '#2ecc71', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

  const monthlyData = transactions.filter(t =>`
);

// Add pieData computation after annualTotals
safeReplace('relatorios pieData',
    `  const annualTotals = annualData.reduce((acc, row) => ({
    entradas: acc.entradas + row.entradas,
    despesas: acc.despesas + row.despesas,
    saldo: acc.saldo + row.saldo
  }), { entradas: 0, despesas: 0, saldo: 0 });`,
    `  const annualTotals = annualData.reduce((acc, row) => ({
    entradas: acc.entradas + row.entradas,
    despesas: acc.despesas + row.despesas,
    saldo: acc.saldo + row.saldo
  }), { entradas: 0, despesas: 0, saldo: 0 });

  const reportPieData = Object.entries(categoriesData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));`
);

// =====================================================
// STEP 3: Pass fmtCurrency to Relatorios in App JSX
// =====================================================
safeReplace('relatorios fmtcurrency prop',
    `            <Relatorios
              transactions={transactions}
              loadingExport={loadingExport}
              setLoadingExport={setLoadingExport}
              categories={categories}
            />`,
    `            <Relatorios
              transactions={transactions}
              loadingExport={loadingExport}
              setLoadingExport={setLoadingExport}
              categories={categories}
              fmtCurrency={fmtCurrency}
            />`
);

// =====================================================
// STEP 4: Monthly summary → fmt()
// =====================================================
safeReplace('relatorios monthly entradas',
    `R$ {totalEntradas.toFixed(2)}</p>
              <p>`,
    `{fmt(totalEntradas)}</p>
              <p>`
);
safeReplace('relatorios monthly despesas',
    `R$ {totalDespesas.toFixed(2)}</p>
              <p className={totalEntradas - totalDespesas`,
    `{fmt(totalDespesas)}</p>
              <p className={totalEntradas - totalDespesas`
);
safeReplace('relatorios monthly saldo',
    `R$ {(totalEntradas - totalDespesas).toFixed(2)}`,
    `{fmt(totalEntradas - totalDespesas)}`
);

// =====================================================
// STEP 5: Add PieChart before categories-report (monthly mode)
// =====================================================
safeReplace('relatorios monthly pie insert',
    `          <div className="categories-report">
            <h3>`,
    `          {reportPieData.length > 0 && (
            <div className="report-pie-section">
              <h3>\uD83E\uDD67 Distribui\u00E7\u00E3o de Despesas</h3>
              <div className="report-pie-wrapper">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={reportPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {reportPieData.map((_, i) => (
                        <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [fmt(value), undefined]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="report-pie-legend">
                  {reportPieData.map((entry, i) => (
                    <div key={i} className="report-pie-item">
                      <span className="report-pie-dot" style={{ background: REPORT_COLORS[i % REPORT_COLORS.length] }} />
                      <span className="report-pie-name">{entry.name}</span>
                      <span className="report-pie-val">{fmt(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="categories-report">
            <h3>`
);

// =====================================================
// STEP 6: Annual summary → fmt()
// =====================================================
safeReplace('relatorios annual entradas',
    `R$ {annualTotals.entradas.toFixed(2)}</p>
              <p>`,
    `{fmt(annualTotals.entradas)}</p>
              <p>`
);
safeReplace('relatorios annual despesas summ',
    `R$ {annualTotals.despesas.toFixed(2)}</p>
              <p className={annualTotals.saldo`,
    `{fmt(annualTotals.despesas)}</p>
              <p className={annualTotals.saldo`
);
safeReplace('relatorios annual saldo summ',
    `R$ {annualTotals.saldo.toFixed(2)}
              </p>`,
    `{fmt(annualTotals.saldo)}
              </p>`
);

// =====================================================
// STEP 7: Add annual charts (BarChart + LineChart) between summary and export
// =====================================================
safeReplace('relatorios annual chart insert',
    `          <div className="export-buttons">
            <ButtonSpinner onClick={() => exportToPDF('annual')}`,
    `          <div className="report-annual-charts">
            <div className="report-chart-card">
              <h3>\uD83D\uDCCA Entradas vs Despesas por M\u00EAs</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={annualData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [fmt(value), undefined]} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#2ecc71" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#e74c3c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="report-chart-card">
              <h3>\uD83D\uDCC8 Saldo Mensal</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={annualData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : (v <= -1000 ? '-' + (Math.abs(v) / 1000).toFixed(0) + 'k' : v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [fmt(value), undefined]} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="export-buttons">
            <ButtonSpinner onClick={() => exportToPDF('annual')}`
);

// =====================================================
// STEP 8: Annual table R$ values
// =====================================================
safeReplace('annual table entradas cell',
    `                    <td className="text-success">R$ {row.entradas.toFixed(2)}</td>`,
    `                    <td className="text-success">{fmt(row.entradas)}</td>`
);
safeReplace('annual table despesas cell',
    `                    <td className="text-danger">R$ {row.despesas.toFixed(2)}</td>`,
    `                    <td className="text-danger">{fmt(row.despesas)}</td>`
);
safeReplace('annual table saldo cell',
    `                    <td className={row.saldo >= 0 ? 'text-success' : 'text-danger'}>R$ {row.saldo.toFixed(2)}</td>`,
    `                    <td className={row.saldo >= 0 ? 'text-success' : 'text-danger'}>{fmt(row.saldo)}</td>`
);

// =====================================================
// STEP 9: Annual totals row R$ values
// =====================================================
safeReplace('annual totals entradas cell',
    `                  <td className="text-success">R$ {annualTotals.entradas.toFixed(2)}</td>`,
    `                  <td className="text-success">{fmt(annualTotals.entradas)}</td>`
);
safeReplace('annual totals despesas cell',
    `                  <td className="text-danger">R$ {annualTotals.despesas.toFixed(2)}</td>`,
    `                  <td className="text-danger">{fmt(annualTotals.despesas)}</td>`
);
safeReplace('annual totals saldo cell',
    `                  <td className={annualTotals.saldo >= 0 ? 'text-success' : 'text-danger'}>R$ {annualTotals.saldo.toFixed(2)}</td>`,
    `                  <td className={annualTotals.saldo >= 0 ? 'text-success' : 'text-danger'}>{fmt(annualTotals.saldo)}</td>`
);

// =====================================================
// SAVE
// =====================================================
fs.writeFileSync('gestor-financeiro-frontend/src/App.jsx', c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);

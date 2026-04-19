import fs from 'fs';
import path from 'path';

/**
 * Generates and saves an HTML test report to the project root
 * @param {Object} testData - Test execution data
 * @param {string} projectRoot - Root path to save the report
 */
export function saveHTMLReport(testData, projectRoot) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(projectRoot, 'custom-reports');
  const reportPath = path.join(reportDir, `report-${timestamp}.html`);

  // Ensure report directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const statusColor = testData.status === 'PASS' ? '#10b981' : '#ef4444';
  const statusIcon = testData.status === 'PASS' ? '✅' : '❌';

  const stepsHTML = testData.steps.map(step => `
    <tr>
      <td>${step.name}</td>
      <td style="color: ${step.status === 'PASS' ? '#10b981' : '#ef4444'}; font-weight: 600;">
        ${step.status === 'PASS' ? '✅' : '❌'} ${step.status}
      </td>
    </tr>
  `).join('');

  const errorsHTML = testData.errors.length
    ? `<div class="errors"><h3>Errors</h3><pre>${testData.errors.join('\n\n')}</pre></div>`
    : '';

  const lastResponseHTML = testData.lastResponse
    ? `<div class="response"><h3>Last API Response</h3><pre>${JSON.stringify(testData.lastResponse, null, 2)}</pre></div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Report - ${testData.testName}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
    h1 { color: #60a5fa; }
    h3 { color: #94a3b8; margin-top: 1.5rem; }
    .card { background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.5rem; margin: 1rem 0; }
    .status { font-size: 2rem; font-weight: 700; color: ${statusColor}; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th { background: rgba(59,130,246,0.2); padding: 0.75rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
    td { padding: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .errors { background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .response { background: rgba(59,130,246,0.1); border: 1px solid #3b82f6; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    pre { overflow-x: auto; font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; }
    .meta span { color: #94a3b8; margin-right: 1.5rem; }
  </style>
</head>
<body>
  <h1>🧪 Test Execution Report</h1>
  <div class="card">
    <div class="status">${statusIcon} ${testData.status}</div>
    <h2>${testData.testName}</h2>
    <div class="meta">
      <span>🌐 Browser: ${testData.browser}</span>
      <span>⏱️ Duration: ${testData.duration || 'N/A'}</span>
      <span>🗓️ Run: ${testData.startTime?.toLocaleString()}</span>
    </div>
  </div>

  <div class="card">
    <h3>📋 Test Steps</h3>
    <table>
      <thead><tr><th>Step</th><th>Result</th></tr></thead>
      <tbody>${stepsHTML}</tbody>
    </table>
  </div>

  ${errorsHTML}
  ${lastResponseHTML}
</body>
</html>`;

  fs.writeFileSync(reportPath, html, 'utf8');
  console.log(`\n📄 HTML Report saved: ${reportPath}`);
}

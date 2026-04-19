// Test Mapping Configuration
const mapping = {
  "TC001": "tests/farmerMilkCollectionFlow.spec.js",
  "TC002": "tests/payment.spec.ts",
  "TC003": "tests/logout.spec.ts"
};

// DOM Elements
const form = {
  envSelect: document.getElementById('envSelect'),
  displayUrl: document.getElementById('displayUrl'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  githubPat: document.getElementById('githubPat'),
  savePatCheckbox: document.getElementById('savePatCheckbox'),
  runBtn: document.getElementById('runBtn'),
  statusPanel: document.getElementById('status-container'),
  statusText: document.getElementById('status-text'),
  statusIndicator: document.getElementById('status-indicator')
};

// Constants
const REPO_OWNER = "ShubhamK-STPL";
const REPO_NAME = "NewTestFramwk";
const WORKFLOW_ID = "playwright.yml";

// Loaded environment config
let environments = [];
let selectedEnv = null;

// ─── Load environments on startup ────────────────────────────────────────────
async function loadEnvironments() {
  try {
    const res = await fetch('./environments.json');
    if (!res.ok) throw new Error('environments.json not found');
    const data = await res.json();
    environments = data.environments;

    // Populate dropdown
    form.envSelect.innerHTML = '<option value="" disabled selected>-- Select an Environment --</option>';
    environments.forEach((env, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = env.name;
      form.envSelect.appendChild(opt);
    });
  } catch (e) {
    form.envSelect.innerHTML = '<option value="" disabled selected>⚠️ environments.json missing – copy from template</option>';
    console.error('Failed to load environments.json:', e.message);
  }
}

// Update fields when env is selected
form.envSelect.addEventListener('change', () => {
  const idx = parseInt(form.envSelect.value);
  selectedEnv = environments[idx];

  // Set read-only URL display
  form.displayUrl.value = selectedEnv.url;

  // Pre-fill credentials (user can still edit them)
  form.username.value = selectedEnv.username;
  form.password.value = selectedEnv.password;

  // Enable run button
  form.runBtn.disabled = false;
});

// ─── Main Execution Flow ──────────────────────────────────────────────────────
form.runBtn.addEventListener('click', async () => {
  if (!selectedEnv) {
    alert("Please select an environment first.");
    return;
  }

  const checkboxes = document.querySelectorAll('input[name="testcase"]:checked');
  const selectedTCs = Array.from(checkboxes).map(cb => cb.value);
  const mode = document.querySelector('input[name="mode"]:checked').value;

  if (selectedTCs.length === 0) {
    alert("Please select at least one Test Case.");
    return;
  }

  // Map to file paths
  const files = selectedTCs.map(tc => mapping[tc]).filter(Boolean);

  const data = {
    url: form.displayUrl.value,          // from env dropdown (read-only)
    username: form.username.value,        // editable by user
    password: form.password.value,        // editable by user
    testIds: selectedTCs,
    tests: files,
    pat: form.githubPat.value
  };

  if (mode === 'headed') {
    executeHeaded(data);
  } else {
    if (!data.pat) {
      alert("GitHub PAT is required for headless CI execution.");
      return;
    }
    
    // Save PAT logic
    if (form.savePatCheckbox.checked) {
      localStorage.setItem('saved_github_pat', data.pat);
    } else {
      localStorage.removeItem('saved_github_pat');
    }

    executeHeadless(data);
  }
});

// ─── Headed: Generate & Download BAT ─────────────────────────────────────────
function executeHeaded({ url, username, password, tests, pat }) {
  // Use PAT in clone URL for private repo support
  const remoteUrl = pat 
    ? `https://${pat}@github.com/ShubhamK-STPL/NewTestFramwk.git`
    : `https://github.com/ShubhamK-STPL/NewTestFramwk.git`;

  const batContent = `
@echo off
setlocal

:: Configuration
set BASE_URL=${url}
set USERNAME=${username}
set PASSWORD=${password}
set TARGET_DIR=%USERPROFILE%\\Documents\\SmokeTests
set REPO_DIR=%TARGET_DIR%\\NewTestFramwk

echo ======================================================
echo Playwright Automation - Parallel Execution (Headed)
echo ======================================================
echo Target Environment: ${url}
echo.

:: Ensure Target Directory exists
if not exist "%TARGET_DIR%" (
  echo [INFO] Creating directory: %TARGET_DIR%
  mkdir "%TARGET_DIR%"
)

cd /d "%TARGET_DIR%"

:: Clone or Pull
if exist "%REPO_DIR%" (
  echo [INFO] Existing repository found. Updating...
  cd /d "%REPO_DIR%"
  git pull
) else (
  echo [INFO] Cloning repository...
  git clone "${remoteUrl}"
  cd /d "%REPO_DIR%"
)

:: Install Dependencies (Smart)
if not exist "node_modules" (
  echo [INFO] node_modules missing. Installing dependencies (this may take a while)...
  call npm install
)

:: Run Playwright
echo.
echo [RUNNING] Starting Playwright tests...
call npx playwright test ${tests.join(" ")} --headed

:: Show Report
echo.
echo [DONE] Opening HTML Report...
call npx playwright show-report

pause
`;

  const blob = new Blob([batContent.trim()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `run_tests_${new Date().getTime()}.bat`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  updateUI({ status: 'passed', text: 'BAT File Downloaded! Please run it locally.' });
}

// ─── Headless: Trigger GitHub Action ─────────────────────────────────────────
async function executeHeadless(data) {
  updateUI({ status: 'queued', text: 'Triggering GitHub Action Workflow...' });

  try {
    const success = await triggerWorkflow(data);

    if (success) {
      setTimeout(() => pollStatus(updateUI, data.pat), 3000);
    } else {
      updateUI({ status: 'failed', text: 'Workflow trigger failed. Check PAT and Permissions.' });
    }
  } catch (error) {
    updateUI({ status: 'failed', text: `Error: ${error.message}` });
  }
}

// ─── GitHub API – Trigger Workflow ───────────────────────────────────────────
async function triggerWorkflow(data) {
  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_ID}/dispatches`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${data.pat}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json"
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          url: data.url,
          username: data.username,
          password: data.password,
          tests: data.testIds.join(",")
        }
      })
    }
  );

  return response.ok;
}

// ─── GitHub API – Get Latest Run ─────────────────────────────────────────────
async function getLatestRun(pat) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1`,
    {
      headers: {
        "Authorization": `Bearer ${pat}`,
        "Accept": "application/vnd.github.v3+json"
      }
    }
  );

  if (!res.ok) throw new Error("Failed to fetch runs.");
  const data = await res.json();
  return data.workflow_runs[0];
}

// ─── GitHub API – Poll Status ─────────────────────────────────────────────────
async function pollStatus(updateFn, pat) {
  let statusStr = "queued";

  while (statusStr === "queued" || statusStr === "in_progress") {
    try {
      const run = await getLatestRun(pat);

      if (!run) {
        updateFn({ status: 'queued', text: 'Waiting for run to appear...' });
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      statusStr = run.status;
      const conclusion = run.conclusion;

      updateFn({ status: statusStr, conclusion, url: run.html_url });

      if (statusStr === "completed") break;

    } catch (err) {
      console.warn("Polling error:", err);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
}

// ─── UI Status Updater ────────────────────────────────────────────────────────
function updateUI({ status, conclusion, url, text }) {
  form.statusPanel.classList.remove('hidden');
  form.statusIndicator.className = 'status-indicator pulse';

  if (status === "queued") {
    form.statusIndicator.classList.add('queued');
    form.statusText.innerText = text || "🟡 Queued in Pipeline...";
  } else if (status === "in_progress" || status === "running") {
    form.statusIndicator.classList.add('running');
    form.statusText.innerText = text || "🔵 Running End-to-End Tests...";
  } else {
    form.statusIndicator.classList.remove('pulse');
    if (conclusion === "success" || status === "passed") {
      form.statusIndicator.classList.add('passed');
      form.statusText.innerHTML = `🟢 ${text || "Passed!"} ${url ? `<a href="${url}" target="_blank" class="status-link">View Report ↗</a>` : ''}`;
    } else {
      form.statusIndicator.classList.add('failed');
      form.statusText.innerHTML = `🔴 ${text || "Failed"} ${url ? `<a href="${url}" target="_blank" class="status-link">View Logs ↗</a>` : ''}`;
    }
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
// Load saved PAT from LocalStorage if it exists
const savedPat = localStorage.getItem('saved_github_pat');
if (savedPat) {
  form.githubPat.value = savedPat;
  form.savePatCheckbox.checked = true;
}

loadEnvironments();

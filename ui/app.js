// Test Mapping Configuration
const mapping = {
  "TC001": "tests/login.spec.ts",
  "TC002": "tests/payment.spec.ts",
  "TC003": "tests/logout.spec.ts"
};

// DOM Elements
const form = {
  url: document.getElementById('url'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  githubPat: document.getElementById('githubPat'),
  runBtn: document.getElementById('runBtn'),
  statusPanel: document.getElementById('status-container'),
  statusText: document.getElementById('status-text'),
  statusIndicator: document.getElementById('status-indicator')
};

// Constants (Update these for your specific repo!)
const REPO_OWNER = "<owner>";
const REPO_NAME = "<repo>";
const WORKFLOW_ID = "run.yml";

// Main Execution Flow
form.runBtn.addEventListener('click', async () => {
  // Collect Data
  const checkboxes = document.querySelectorAll('input[name="testcase"]:checked');
  const selectedTCs = Array.from(checkboxes).map(cb => cb.value);
  const mode = document.querySelector('input[name="mode"]:checked').value;
  
  if (selectedTCs.length === 0) {
    alert("Please select at least one Test Case.");
    return;
  }

  // Map to files
  const files = selectedTCs.map(tc => mapping[tc]).filter(Boolean);

  const data = {
    url: form.url.value,
    username: form.username.value,
    password: form.password.value,
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
    executeHeadless(data);
  }
});

// Headed Logic: Generate BAT
function executeHeaded({ url, username, password, tests }) {
  const batContent = `
@echo off
cd %USERPROFILE%\\Documents

IF NOT EXIST SmokeTests (
  mkdir SmokeTests
)

cd SmokeTests

IF EXIST playwright-repo (
  cd playwright-repo
  git pull
) ELSE (
  git clone https://github.com/your-org/playwright-repo.git
  cd playwright-repo
)

npm install

set BASE_URL=${url}
set USERNAME=${username}
set PASSWORD=${password}

echo Running Playwright Tests...
npx playwright test ${tests.join(" ")} --headed

echo Opening Report...
npx playwright show-report

pause
`;

  // Trigger download utilizing Blob capabilities in Browser
  const blob = new Blob([batContent.trim()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `run_tests_${new Date().getTime()}.bat`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  updateUI({ status: 'passed', text: 'BAT File Downloaded! Please run it locally.' });
}

// Headless Logic: GitHub API Trigger
async function executeHeadless(data) {
  updateUI({ status: 'queued', text: 'Triggering GitHub Action Workflow...' });
  
  try {
    const success = await triggerWorkflow(data);
    
    if (success) {
      // Small buffer to allow GitHub API to register the new run
      setTimeout(() => pollStatus(updateUI, data.pat), 3000);
    } else {
      updateUI({ status: 'failed', text: 'Workflow trigger failed. Check PAT and Permissions.' });
    }
  } catch (error) {
    updateUI({ status: 'failed', text: `Error: ${error.message}` });
  }
}

// GitHub API Integration - Trigger
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
          tests: data.tests.join(",")
        }
      })
    }
  );

  return response.ok;
}

// GitHub API Integration - Get Latest Run
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
  return data.workflow_runs[0]; // latest run
}

// Core Polling logic
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

      updateFn({
        status: statusStr,
        conclusion: conclusion,
        url: run.html_url
      });

      // Break safely if it's finished
      if (statusStr === "completed") break;

    } catch(err) {
      console.warn("Polling error:", err);
    }

    await new Promise(r => setTimeout(r, 5000)); // 5 sec heartbeat
  }
}

// Status UI Updater Engine
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
    // Completed state
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

Browser UI (Static App)
   ↓
Decision Layer (JS in browser)

Headless Mode:
   → GitHub Workflow Trigger (via API)
   → Poll GitHub Runs API
   → Show Status + Report Link

Headed Mode:
   → Generate BAT File
   → User runs locally
🔷 🔹 1. Test Mapping (Clean + Scalable)
test-mapping.json
{
  "TC001": "tests/login.spec.ts",
  "TC002": "tests/payment.spec.ts",
  "TC003": "tests/logout.spec.ts"
}
UI Change (Important)

Instead of showing file names:

const selectedTCs = ["TC001", "TC002"];

Map them:

import mapping from './test-mapping.json';

const files = selectedTCs.map(tc => mapping[tc]);
🔷 🔹 2. Headed Mode (Updated BAT - Smart + Idempotent)
@echo off

cd %USERPROFILE%\Documents

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

set BASE_URL={{url}}
set USERNAME={{username}}
set PASSWORD={{password}}

npx playwright test {{tests}} --headed

npx playwright show-report

pause
JS Generator (Updated)
function generateBat({ url, username, password, tests }) {
  return `
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

npx playwright test ${tests.join(" ")} --headed

npx playwright show-report

pause
`;
}
🔷 🔹 3. Headless Mode (Direct GitHub Trigger from UI)

⚠️ Reality:

Requires GitHub Personal Access Token (PAT)
Must be stored in browser (not secure, but OK for MVP/internal)
Trigger Workflow
async function triggerWorkflow(data) {
  const response = await fetch(
    "https://api.github.com/repos/<owner>/<repo>/actions/workflows/run.yml/dispatches",
    {
      method: "POST",
      headers: {
        "Authorization": "Bearer YOUR_GITHUB_PAT",
        "Content-Type": "application/json"
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
🔷 🔹 4. Poll GitHub for Execution Status (Core Feature)

This is the real upgrade.

Step 1: Get Latest Workflow Run
async function getLatestRun() {
  const res = await fetch(
    "https://api.github.com/repos/<owner>/<repo>/actions/runs",
    {
      headers: {
        "Authorization": "Bearer YOUR_GITHUB_PAT"
      }
    }
  );

  const data = await res.json();
  return data.workflow_runs[0]; // latest run
}
Step 2: Poll Status
async function pollStatus(updateUI) {
  let status = "queued";

  while (status === "queued" || status === "in_progress") {
    const run = await getLatestRun();

    status = run.status;
    const conclusion = run.conclusion;

    updateUI({
      status,
      conclusion,
      url: run.html_url
    });

    await new Promise(r => setTimeout(r, 5000)); // 5 sec polling
  }
}
Step 3: UI Status Display
function updateUI({ status, conclusion, url }) {
  const el = document.getElementById("status");

  if (status === "queued") {
    el.innerText = "🟡 Queued...";
  } else if (status === "in_progress") {
    el.innerText = "🔵 Running...";
  } else {
    if (conclusion === "success") {
      el.innerHTML = `🟢 Passed <a href="${url}" target="_blank">View Report</a>`;
    } else {
      el.innerHTML = `🔴 Failed <a href="${url}" target="_blank">View Logs</a>`;
    }
  }
}
🔷 🔹 5. Updated GitHub Workflow (Important Fix)
name: Playwright Run

on:
  workflow_dispatch:
    inputs:
      url:
      username:
      password:
      tests:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - run: npm install

      - name: Run Tests
        run: |
          npx playwright test ${{ github.event.inputs.tests }} --reporter=html

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
🔷 🔹 Final Flow (Clean)
User selects:
  URL + Creds + TC + Mode

IF Headless:
  ↓
Trigger GitHub Workflow
  ↓
Poll GitHub every 5 sec
  ↓
Show:
   🟡 Queued
   🔵 Running
   🟢 Passed (Report link)
   🔴 Failed (Logs link)

IF Headed:
  ↓
Download BAT
  ↓
User runs locally
  ↓
Auto:
  - Create folder
  - Pull latest
  - Install deps
  - Run tests
  - Show report
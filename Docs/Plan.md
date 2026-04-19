COMPLETE SYSTEM FLOW (Your Setup)
[ USER UI ]
   ↓
Select:
  - URL
  - Credentials
  - Test Cases (TC IDs)
  - Mode (Headless / Headed)

   ↓
[ BROWSER LOGIC (JS) ]
   ↓
Convert selection → ENV format + mapped test files

   ↓
Decision Split:
 ┌───────────────────────────────┐
 │                               │
 │        HEADLESS MODE          │
 │                               │
 └───────────────────────────────┘
                 ↓
        Trigger GitHub Action
                 ↓
        GitHub Runner starts
                 ↓
        Dynamic Runner executes
                 ↓
        Playwright runs tests
                 ↓
        HTML Report generated
                 ↓
        UI polls GitHub API
                 ↓
        Show:
         - Queued
         - Running
         - Passed / Failed
         - Report link


 ┌───────────────────────────────┐
 │                               │
 │         HEADED MODE           │
 │                               │
 └───────────────────────────────┘
                 ↓
        Generate .BAT file
                 ↓
        User downloads & runs
                 ↓
        Local setup (auto)
          - Create folder
          - Git pull/clone
          - Install deps
                 ↓
        Dynamic Runner executes
                 ↓
        Playwright runs (headed)
                 ↓
        Report opens locally
🔷 🔹 STEP-BY-STEP FLOW (CLEAR)
🟢 1. User Interaction (UI Layer)

User selects:

{
  "url": "https://qa.app.com",
  "username": "testuser",
  "password": "pass",
  "testIds": ["TC001", "TC002"],
  "mode": "headless"
}
🟡 2. Mapping Happens (Browser Side)
TC001 → tests/smoke/login.spec.ts
TC002 → tests/regression/payment.spec.ts

Also collects:

Tags → @smoke | @payment
🔵 3. Mode Decision
🔷 🚀 HEADLESS FLOW (CI Execution)
Step 1: Trigger GitHub Action

UI calls GitHub API:

workflow_dispatch → inputs:
  BASE_URL
  USERNAME
  PASSWORD
  TEST_IDS
Step 2: GitHub Runner Starts
Ubuntu Runner spins up
↓
Code checkout
↓
npm install
Step 3: Dynamic Runner Executes
Reads TEST_IDS
↓
Maps → files + tags
↓
Builds command

Example:

npx playwright test tests/smoke/login.spec.ts tests/regression/payment.spec.ts --grep "@smoke|@payment"
Step 4: Playwright Execution
Browser (headless) launches
↓
Global setup (login/session)
↓
Tests run
↓
Results generated
Step 5: Report Generation
playwright-report/
↓
Uploaded as artifact
Step 6: UI Polling (Important)

UI keeps checking:

Queued → Running → Completed

Final display:

🟢 Passed → Report link
🔴 Failed → Logs link
🔷 💻 HEADED FLOW (Local Execution)
Step 1: Generate BAT File

UI creates:

run_tests.bat

With:

ENV variables
Selected test files
Step 2: User Runs BAT
Double-click
Step 3: Auto Setup
Check:
  SmokeTests folder exists?
    YES → git pull
    NO  → git clone

Install dependencies
Step 4: Dynamic Runner Executes

Same as CI:

Reads TEST_IDS
Maps → files
Runs Playwright
Step 5: Headed Execution
Browser opens visibly
↓
Tests run step-by-step
↓
Useful for debugging
Step 6: Report Opens
npx playwright show-report
↓
HTML report opens in browser
🔷 🔥 CORE ENGINE (Same for Both Modes)

This is your single source of truth:

Dynamic Runner
   ↓
Reads ENV
   ↓
Maps TC IDs
   ↓
Builds command
   ↓
Executes Playwright

👉 That’s why your system stays clean.

🔷 🧠 KEY DESIGN PRINCIPLES (Why This Works)
✅ 1. Single Execution Engine
No duplication between CI & local
✅ 2. Mapping Layer
UI doesn’t know file structure
Framework controls everything
✅ 3. Tag-Based Filtering
Flexible execution
Scales easily
✅ 4. Environment Driven
No hardcoding
Fully dynamic
🔷 ⚠️ REAL-WORLD EDGE CASES (You Should Handle)
❗ Invalid TC ID
TC999 → ignore or show error
❗ Empty Selection
No TC → block execution
❗ GitHub Rate Limit
Too many polls → throttle (5–10 sec)
❗ Parallel Runs Conflict
Same user → multiple runs → confusion
🔷 🚀 FINAL SUMMARY
UI → Selection
   ↓
Mapping → Convert TC → Files
   ↓
Decision:
   Headless → GitHub CI
   Headed   → Local BAT
   ↓
Dynamic Runner (Core Engine)
   ↓
Playwright Execution
   ↓
Report Generation
   ↓
Result Display (UI / Local)
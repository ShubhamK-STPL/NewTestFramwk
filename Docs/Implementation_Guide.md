# Playwright Dynamic Framework - Implementation Guide

This document provides a detailed step-by-step breakdown of how the Playwright Testing Framework and its Browser UI Dashboard were built, mirroring the architectural plans defined in `Plan.md` and `Ref.md`.

---

## 1. Project Foundation & Playwright Setup
The first step was to initialize a Node.js workspace and install the necessary Playwright automation dependencies.

**Dependencies Installed:**
```bash
npm init -y
npm install -D @playwright/test @types/node
npx playwright install --with-deps chromium
```

**Playwright Configuration:**
The `playwright.config.ts` was set up to dynamically respond to environment variables. This allows the executing systems (the UI's BAT file or GitHub Actions) to enforce configurations completely externally without modifying test code.

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60000,
  use: {
    headless: process.env.HEADLESS === 'true',
    baseURL: process.env.BASE_URL,
    trace: 'on-first-retry',
  },
  reporter: [['html', { open: 'never' }], ['list']]
});
```

---

## 2. Dynamic Execution Engine
A central "Single Source of Truth" routing engine was created to translate generic Test Case IDs passed from the UI into hard Playwright execution commands.

1. **Mapping Engine**: A `config/test-mapping.json` file was created to keep a strict registry mapping UI IDs directly to File paths.
    ```json
    {
      "TC001": "tests/login.spec.ts",
      "TC002": "tests/payment.spec.ts"
    }
    ```

2. **The Dynamic Runner script** (`runner/dynamic_runner.js`):
    It isolates execution complexity. When triggered by the GitHub CI action, it parses the selected IDs and constructs the execution command automatically.
    ```javascript
    const mapping = require('../config/test-mapping.json');
    const { execSync } = require('child_process');

    const testIds = process.env.TEST_IDS.split(',');
    const files = testIds.map(tc => mapping[tc]).filter(Boolean);

    const command = `npx playwright test ${files.join(" ")}`;
    execSync(command, { stdio: 'inherit' });
    ```

---

## 3. GitHub Actions CI Integration (Headless Flow)
To support remote "Headless" execution, we implemented a custom GitHub `workflow_dispatch` action inside `.github/workflows/playwright.yml`.

This is the remote environment that the Browser UI securely pings to start tests in the cloud. It accepts inputs directly from the API and binds them natively to the Linux environment variables our Dynamic Runner utilizes:

```yaml
on:
  workflow_dispatch:
    inputs:
      url:
        required: true
      username:
        required: true
      password:
        required: true
      tests:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      ...
      - name: Run Tests (Dynamic)
        run: |
          export BASE_URL=${{ github.event.inputs.url }}
          export USERNAME=${{ github.event.inputs.username }}
          export PASSWORD=${{ github.event.inputs.password }}
          export TEST_IDS=${{ github.event.inputs.tests }}
          export HEADLESS=true

          node runner/dynamic_runner.js
```

---

## 4. Frontend Dashboard UI (`ui/`)
A sleek, premium, static "vanilla" App was created to serve as your testing Control Panel (available on `http://localhost:8080/ui/` during development). 

- **Structure**: `ui/index.html` holds the component groupings.
- **Aesthetics**: `ui/style.css` contains advanced glassmorphism implementations, fluid pulse animations, gradients, and hovering logic.
- **Brain**: `ui/app.js` runs directly on the user's browser, handling the dual-execution logic described in `Ref.md`:

### A. Headed Mode (.BAT Generation)
Generates dynamic Batch code holding runtime configurations. The browser then converts the text block into a downloadable Blob.
```javascript
const batContent = `
set BASE_URL=${url}
set USERNAME=${username}
set PASSWORD=${password}
npx playwright test ${tests.join(" ")} --headed
`;

const blob = new Blob([batContent.trim()], { type: 'text/plain' });
// Triggers an invisible <a> tag click to force download
```

### B. Headless Mode (API Trigger)
Connects to Github REST API endpoints securely to trigger the `playwright.yml` workflow and regularly loops the `runs` API to fetch a status.
```javascript
await fetch(
  "https://api.github.com/repos/ShubhamK-STPL/NewTestFramwk/actions/workflows/playwright.yml/dispatches",
  {
    method: "POST",
    headers: { "Authorization": `Bearer ${pat}` },
    body: JSON.stringify({
      ref: "main",
      inputs: { url, username, password, tests }
    })
  }
);
```

---

## 5. Summary of Core Flows
**Headed Flow**:
`User Clicks Run -> UI Generates script strings -> Browser Downloads run_tests.bat -> User executes BAT contextually on their OS.`

**Headless Flow**:
`User Supplies PAT + Clicks Run -> UI JSON POSTs to GitHub Actions API -> GitHub spins Ubuntu Runner -> Workflow exports vars -> Runner passes execution to dynamic_runner.js -> UI loops every 5 seconds to map Runner Status Object to DOM visuals.`

---

## 6. Manual Local Execution (Headed Mode Bypassing UI)
If a developer or QA engineer wants to run tests visually on their local machine without going through the web UI to generate a `.bat` file, they can execute Playwright manually from their terminal.

There are two primary ways to run tests manually on your terminal (Powershell):

### A. Using the Core Dynamic Engine
You can pass the environment variables directly to the `dynamic_runner.js` script so it automatically handles the mapping for you.

```powershell
# 1. Set environment variables
$env:TEST_IDS="TC001,TC002"
$env:BASE_URL="https://webuat.hitechdairy.in/login"
$env:USERNAME="ShauryaTechnosoftPvt"
$env:PASSWORD="Stpl@123"
$env:HEADLESS="false"

# 2. Run the dynamic execution engine
node runner/dynamic_runner.js
```

### B. Standard Playwright CLI (Direct bypass)
If you know the exact file path from the `test-mapping.json`, you can simply pass the variables and invoke Playwright's native CLI directly.

```powershell
# 1. Set environment variables
$env:BASE_URL="https://webuat.hitechdairy.in/login"
$env:USERNAME="ShauryaTechnosoftPvt"
$env:PASSWORD="Stpl@123"

# 2. Execute Playwright natively in headed mode
npx playwright test tests/login.spec.ts --headed
```

After execution, you can manually open the beautiful graphical report by running:
```bash
npx playwright show-report
```

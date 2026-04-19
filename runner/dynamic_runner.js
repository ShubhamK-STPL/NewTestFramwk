const mapping = require('../config/test-mapping.json');
const { execSync } = require('child_process');

if (!process.env.TEST_IDS) {
  console.error("TEST_IDS environment variable is missing. Are you running this directly?");
  process.exit(1);
}

const testIds = process.env.TEST_IDS.split(',');

const files = testIds
  .map(tc => mapping[tc])
  .filter(Boolean);

if (files.length === 0) {
  console.error("No valid test cases found for the provided TEST_IDS.");
  process.exit(1);
}

const command = `npx playwright test ${files.join(" ")}`;

console.log("Executing:", command);

execSync(command, { stdio: 'inherit' });

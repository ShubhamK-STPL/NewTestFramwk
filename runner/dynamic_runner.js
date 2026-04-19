import { createRequire } from 'module';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mappingPath = path.join(__dirname, '../config/test-mapping.json');
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

if (!process.env.TEST_IDS) {
  console.error("TEST_IDS environment variable is missing.");
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

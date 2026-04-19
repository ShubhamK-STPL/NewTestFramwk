const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function run() {
  const payloadPath = path.join(__dirname, '../payload.json');
  const mappingPath = path.join(__dirname, '../config/mapping.json');

  if (!fs.existsSync(payloadPath) || !fs.existsSync(mappingPath)) {
    console.error('Payload or mapping file is missing.');
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

  const filesToRun = [];
  const tagsToRun = [];

  payload.testIds.forEach(id => {
    if (mapping[id]) {
      if (!filesToRun.includes(mapping[id].file)) {
        filesToRun.push(mapping[id].file);
      }
      if (!tagsToRun.includes(mapping[id].tags)) {
        tagsToRun.push(mapping[id].tags);
      }
    } else {
      console.warn(`Warning: Mapping not found for test ID: ${id}`);
    }
  });

  if (filesToRun.length === 0) {
    console.error('No valid test files found for selected Test IDs.');
    process.exit(1);
  }

  // Construct command
  let isHeaded = payload.mode && payload.mode.toLowerCase() === 'headed';
  const grepArg = tagsToRun.join('|');
  const envVars = {
    ...process.env,
    TEST_URL: payload.url,
    TEST_USERNAME: payload.username,
    TEST_PASSWORD: payload.password,
    BASE_URL: payload.url
  };

  const args = [
    'playwright',
    'test',
    ...filesToRun
  ];

  if (grepArg) {
      args.push(`--grep=${grepArg}`);
  }

  if (isHeaded) {
    args.push('--headed');
  }

  console.log(`\n🚀 Executing Dynamic Runner`);
  console.log(`URL: ${payload.url}`);
  console.log(`Mode: ${isHeaded ? 'Headed' : 'Headless'}`);
  console.log(`Files: ${filesToRun.join(', ')}`);
  console.log(`Tags: ${grepArg}\n`);
  
  // Use spawn
  const child = spawn('npx', args, {
    stdio: 'inherit',
    env: envVars,
    shell: true
  });

  child.on('close', (code) => {
    console.log(`Playwright process exited with code ${code}`);
    process.exit(code);
  });
}

run();

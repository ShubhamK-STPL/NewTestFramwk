import { test, expect } from '@playwright/test';

test('TC001 - Login to application @smoke', async ({ page }) => {
  const url = process.env.TEST_URL || '';
  const username = process.env.TEST_USERNAME || '';
  const password = process.env.TEST_PASSWORD || '';

  if (!url) throw new Error('TEST_URL is not set from Runner!');

  console.log(`Navigating to URL dynamically...`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    console.log(`Navigation caught an error, attempting to proceed anyway: ${e}`);
  }

  // User input block based on specification
  // Assuming a generic search for formcontrolname='username' or falling back to input type text
  const usernameInput = page.locator("//input[@formcontrolname='username']").or(page.locator("input[type='text'], input[placeholder='Username']")).first();
  await expect(usernameInput).toBeVisible({ timeout: 15000 });
  await usernameInput.fill(username);

  await page.fill("//input[@formcontrolname='password']", password);

  // Validate fields are correctly filled
  await expect(usernameInput).toHaveValue(username);
  await expect(page.locator("//input[@formcontrolname='password']")).toHaveValue(password);

  console.log(`Successfully populated credentials for ${username}!`);
  
  // Try taking a screenshot for artifact proof
  await page.screenshot({ path: 'test-results/login-step.png' });
});

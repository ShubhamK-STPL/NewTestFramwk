import { test, expect } from '@playwright/test';
import Tesseract from 'tesseract.js';
import { saveHTMLReport } from '../utils/report-generator.js';
import path from 'path';

/**
 * ===================================
 * HELPER FUNCTIONS
 * ===================================
 */

/**
 * Solves CAPTCHA by extracting it from canvas using Tesseract OCR
 * @param {Page} page - Playwright page object
 */
async function solveCaptcha(page) {
  // Locate the CAPTCHA canvas element
  const captchaCanvas = page.locator('#captcha1');
  const captchaPath = 'captcha.png';

  // Capture CAPTCHA image from canvas
  await captchaCanvas.screenshot({ path: captchaPath });

  // Use Tesseract to recognize text from CAPTCHA image
  const result = await Tesseract.recognize(captchaPath, 'eng');

  // Extract and clean CAPTCHA text (remove special characters)
  const captchaText = result.data.text
    .replace(/[^a-zA-Z0-9]/g, '')
    .trim();

  // Trim first character if text length > 1
  const trimmedCaptcha =
    captchaText.length > 1 ? captchaText.slice(1) : captchaText;

  console.log('OCR Captcha:', captchaText);
  console.log('Trimmed Captcha:', trimmedCaptcha);

  // Fill the CAPTCHA textbox with recognized text
  await page.getByRole('textbox', { name: 'Captcha' }).fill(trimmedCaptcha);
}

/**
 * Verifies login page is displayed and enters credentials
 * @param {Page} page - Playwright page object
 */
async function verifyLoginPageAndEnterCredentials(page) {
  // Wait explicitly for the Angular form to render the username input (up to 15 seconds)
  const usernameInput = page.locator("//input[@formcontrolname='username']");
  await usernameInput.waitFor({ state: 'visible', timeout: 15000 });

  // Verify dashboard header is visible
  await expect(page.getByText('2026')).toBeVisible();

  // Enter username and password credentials
  await usernameInput.fill('ShauryaTechnosoftPvt');
  await page.fill("//input[@formcontrolname='password']", 'Stpl@123');
}

/**
 * Handles confirmation popups that may appear during workflow
 * @param {Page} page - Playwright page object
 * @param {string} text - Text to identify the popup
 */
async function handlePopupIfVisible(page, text) {
  try {
    // Wait for popup with specified text
    await page.getByText(text).waitFor({ timeout: 3000 });
    // Click "Yes" button if popup appears
    await page.getByRole('button', { name: 'Yes' }).click();
  } catch (error) {
    console.log(`Popup not shown: ${text}`);
  }
}

/**
 * Retries a given async function up to maxRetries times
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {string} stepName - Name of the step being retried (for logging)
 */
async function retryOperation(fn, maxRetries = 3, stepName = 'Operation') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📍 ${stepName} - Attempt ${attempt}/${maxRetries}`);
      return await fn();
    } catch (error) {
      console.error(`❌ ${stepName} failed on attempt ${attempt}: ${error.message}`);
      if (attempt === maxRetries) {
        console.error(`🚨 ${stepName} failed after ${maxRetries} attempts`);
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

/**
 * Searches for a farmer in the list by scrolling if necessary
 * @param {Page} page - Playwright page object
 * @param {string} farmerName - Name of farmer to search for
 * @param {number} maxScrolls - Maximum number of scrolls to attempt
 */
async function findAndSelectFarmer(page, farmerName, maxScrolls = 5) {
  for (let scrollAttempt = 0; scrollAttempt < maxScrolls; scrollAttempt++) {
    try {
      console.log(`🔍 Searching for farmer: "${farmerName}" (Scroll attempt ${scrollAttempt + 1}/${maxScrolls})`);

      // Try to find the farmer row
      const farmerRow = page.getByRole('row', { name: farmerName });

      // Check if row is visible
      const isVisible = await farmerRow.isVisible({ timeout: 2000 }).catch(() => false);

      if (isVisible) {
        console.log(`✅ Farmer found: "${farmerName}"`);
        // Click the button in the row
        await farmerRow.getByRole('button').click();
        return true;
      }

      if (scrollAttempt < maxScrolls - 1) {
        // Scroll down in the table to find the farmer
        const tableBody = page.locator('tbody, .mat-mdc-table, table');
        if (await tableBody.isVisible().catch(() => false)) {
          console.log(`⬇️  Scrolling down to find more farmers...`);
          await tableBody.evaluate(el => el.scrollBy(0, 300));
          await page.waitForTimeout(500);
        }
      }
    } catch (error) {
      console.log(`⏭️  Scroll attempt ${scrollAttempt + 1} - continuing search...`);
    }
  }

  throw new Error(`Farmer "${farmerName}" not found after ${maxScrolls} scroll attempts`);
}

/**
 * ===================================
 * MAIN TEST SUITE
 * ===================================
 */

test.use({ launchOptions: { args: ['--disable-ipv6'] } });

test('HitechDairy – Login + Farmer Milk Collection Flow', async ({ page }) => {
  test.setTimeout(180000); // 3 minutes timeout for complete E2E flow
  // Test data object to store results
  const testData = {
    testName: 'HitechDairy – Login + Farmer Milk Collection Flow',
    status: 'FAIL',
    errors: [],
    steps: [],
    lastResponse: null,
    browser: 'Chromium',
    startTime: new Date()
  };

  try {

    // ==========================================
    // STEP 1: LOGIN WITH CAPTCHA RETRY LOGIC
    // ==========================================

    // Navigate to login page
    await retryOperation(
      async () => {
         // Use production URL with domcontentloaded to prevent timeouts on slow background resources
        await page.goto('https://hitechdairy.in/login', { waitUntil: 'domcontentloaded' });

        // Removed waitForLoadState('networkidle') as it causes 30s timeouts if external tracking/map scripts hang
      },
      3,
      'Navigate to login page'
    );

    let loggedIn = false;

    // Retry entire login flow up to 3 times
    for (let loginAttempt = 1; loginAttempt <= 3; loginAttempt++) {
      try {
        console.log(`\n🔐 LOGIN ATTEMPT: ${loginAttempt}/3`);

        // Enter username and password
        await retryOperation(
          async () => {
            await verifyLoginPageAndEnterCredentials(page);
          },
          2,
          'Enter credentials'
        );

        // Retry CAPTCHA solving up to 3 attempts
        for (let captchaAttempt = 1; captchaAttempt <= 3; captchaAttempt++) {
          try {
            console.log(`  🔁 CAPTCHA Attempt: ${captchaAttempt}/3`);

            // Solve CAPTCHA using OCR
            await retryOperation(
              async () => {
                await solveCaptcha(page);
              },
              2,
              'Solve CAPTCHA'
            );

            // Click login button
            await page.getByRole('button', { name: 'Login' }).click();

            // Wait for successful redirect to dashboard
            await page.waitForURL('**/dashboard', { timeout: 5000 });
            loggedIn = true;
            console.log('✅ Login successful on attempt ' + loginAttempt);
            break;
          } catch (error) {
            console.log(`  ❌ CAPTCHA attempt ${captchaAttempt} failed: ${error.message}`);
            if (captchaAttempt < 3) {
              await page.reload();
              await verifyLoginPageAndEnterCredentials(page);
            }
          }
        }

        if (loggedIn) break;
      } catch (error) {
        console.error(`❌ Login attempt ${loginAttempt} failed: ${error.message}`);
        if (loginAttempt < 3) {
          await page.reload();
        }
      }
    }

    // Assert login was successful
    expect(loggedIn).toBeTruthy();
    testData.steps.push({ name: 'Login with CAPTCHA', status: loggedIn ? 'PASS' : 'FAIL' });

    // ==========================================
    // STEP 2: VERIFY DASHBOARD
    // ==========================================

    await retryOperation(
      async () => {
        // Verify organization logo is visible
        const orgLogo = page.locator("//img[@class='org-logo']");
        await expect(orgLogo).toBeVisible({ timeout: 5000 });
        // Verify welcome message on dashboard
        await expect(page.getByText('Welcome to Hitech Dairy ERP')).toBeVisible({ timeout: 5000 });
        testData.steps.push({ name: 'Verify dashboard', status: 'PASS' });
      },
      3,
      'Verify dashboard'
    ).catch((error) => {
      testData.steps.push({ name: 'Verify dashboard', status: 'FAIL' });
      throw error;
    });

    // ==========================================
    // STEP 3: NAVIGATE TO FARMER MILK COLLECTION
    // ==========================================

    await retryOperation(
      async () => {
        // Click on menu tab
        await page.getByRole('tab').nth(1).click();
        await page.waitForTimeout(1000);
        // Click on Milk Procurement button
        await page.getByRole('button', { name: 'Milk Procurement' }).click();
        await page.waitForTimeout(1000);
        // Navigate to Farmer Milk Collection section
        await page
          .getByLabel('Milk Procurement Farmer Milk')
          .getByText('Farmer Milk Collection')
          .click();
        testData.steps.push({ name: 'Navigate to Farmer Milk Collection', status: 'PASS' });
      },
      3,
      'Navigate to Farmer Milk Collection'
    ).catch((error) => {
      testData.steps.push({ name: 'Navigate to Farmer Milk Collection', status: 'FAIL' });
      throw error;
    });

    // Click Add Collection button
    await retryOperation(
      async () => {
        await page.getByRole('button', { name: 'Add Collection' }).click();
        // Wait for the form page to load
        await page.waitForURL(
          '**/procurement/milk-procurement/farmer-milk-collection',
          { timeout: 5000 }
        );
        testData.steps.push({ name: 'Open collection form', status: 'PASS' });
      },
      3,
      'Open collection form'
    ).catch((error) => {
      testData.steps.push({ name: 'Open collection form', status: 'FAIL' });
      throw error;
    });

    // ==========================================
    // STEP 4: PREPARE TEST DATA
    // ==========================================

    // FAT values to try (in order of preference)
    const fatValues = ['3.7', '5.7', '4.1', '5.5', '4.7', '5.9', '5.5'];
    const snf = '8.7';
    let fatValueUsed = null;

    // ==========================================
    // STEP 5: FILL COLLECTION FORM
    // ==========================================

    await retryOperation(
      async () => {
        try {
          // Select Organization Name dropdown
          //   await page.getByText('Select Organization Name').click();
          //   await page.waitForTimeout(500);
          //   await page.getByText('Amul Dairy Pvt Ltd').click();
          //   await page.waitForTimeout(500);

          // Select Unit Name dropdown
          await page.getByText('Select Unit Name').click();
          await page.waitForTimeout(500);
          await page.getByText('Gowardhan Sanstha').click();
          await page.waitForTimeout(500);
          // Click search button to find farmer details
          await page.getByRole('button', { name: 'search' }).click();
          await page.waitForTimeout(1000);
          testData.steps.push({ name: 'Fill collection form', status: 'PASS' });
        } catch (error) {
          console.error('Error in form fill: ' + error.message);
          testData.steps.push({ name: 'Fill collection form', status: 'FAIL' });
          throw error;
        }
      },
      3,
      'Fill collection form'
    );

    // ==========================================
    // STEP 6: INTERCEPT CUSTOMER DETAILS API CALL
    // ==========================================

    const farmerNameToSearch = 'VARAD MADHUKAR GUNJAL'; // Configure this farmer name

    await retryOperation(
      async () => {
        try {
          // Wait for customer details API response
          const customerDetailsResponsePromise = page.waitForResponse(
            response =>
              response.url().includes(
                '/MilkCollection/GetCustomerFatBasedDetailsByCustomerAccNobyGroupId'
              ) &&
              response.request().method() === 'GET',
            { timeout: 10000 }
          );

          // Find and select farmer using scroll if necessary
          await findAndSelectFarmer(page, farmerNameToSearch, 5);

          // Handle confirmation popup if it appears
          try {
            await page.getByText('Do You Want To Make Another').waitFor({ timeout: 3000 });
            await page.getByRole('button', { name: 'Yes' }).click();
          } catch {
            console.log('Confirmation popup not shown');
          }

          // Get the API response
          const customerDetailsResponse = await customerDetailsResponsePromise;

          // ==========================================
          // STEP 7: VALIDATE CUSTOMER DETAILS API
          // ==========================================

          // Verify HTTP status code is 200
          expect(customerDetailsResponse.status()).toBe(200);

          // Parse and validate API response body
          const responseBody2 = await customerDetailsResponse.json();

          console.log('Customer Details API Response:', responseBody2);

          // Assert API response status
          expect(responseBody2.statusCode).toBe('200');
          expect(responseBody2.statusMessage).toBe(
            'Customer Account records are fetched successfully.'
          );

          testData.steps.push({ name: 'Select farmer and validate details', status: 'PASS' });
        } catch (error) {
          console.error('Error: ' + error.message);
          testData.steps.push({ name: 'Select farmer and validate details', status: 'FAIL' });
          throw error;
        }
      },
      3,
      'Select farmer and validate customer details'
    );

    // ==========================================
    // STEP 8-10: SMART RETRY FOR COLLECTION (ENTRY + VERIFY + SUBMIT)
    // ==========================================

    await retryOperation(
      async () => {
        // Try each FAT value until one works
        for (let fatIndex = 0; fatIndex < fatValues.length; fatIndex++) {
          try {
            const currentFat = fatValues[fatIndex];
            console.log(`\n📊 Attempting Collection with FAT value: ${currentFat}`);

            // Generate random quantity between 20 and 200 (NEW for each retry)
            const randomQuantity = Math.floor(Math.random() * (200 - 20 + 1)) + 20;
            console.log(`   Quantity for this attempt: ${randomQuantity}`);

            // Fill Quantity field (mat-input-7)
            const quantityField = page.locator('#mat-input-7');
            await expect(quantityField).toBeVisible({ timeout: 5000 });
            await quantityField.clear();
            await page.waitForTimeout(200);
            await quantityField.fill(randomQuantity.toString());
            await page.waitForTimeout(500);
            await quantityField.press('Tab');
            await page.waitForTimeout(500);

            // Fill FAT field (mat-input-8)
            const fatField = page.locator('#mat-input-8');
            await expect(fatField).toBeVisible({ timeout: 5000 });
            await fatField.clear();
            await page.waitForTimeout(200);
            await fatField.fill(currentFat.replace('.0', ''));
            await page.waitForTimeout(500);
            await fatField.press('Tab');
            await page.waitForTimeout(500);

            // Fill SNF field (mat-input-10)
            const snfField = page.locator('#mat-input-10');
            await expect(snfField).toBeVisible({ timeout: 5000 });
            await snfField.clear();
            await page.waitForTimeout(200);
            await snfField.fill(snf.replace('.0', ''));
            await page.waitForTimeout(1000);

            // Check if values are accepted (wait for any error message)
            const errorElement = page.locator('[role="alert"], .error, .mat-error');
            const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);

            const invalidFatLocator1 = page.locator('text=Messagelist.invalid_fat');
            const invalidFatLocator2 = page.locator(/invalid fat/i);
            const hasInvalidFat1 = await invalidFatLocator1.isVisible({ timeout: 1000 }).catch(() => false);
            const hasInvalidFat2 = await invalidFatLocator2.isVisible({ timeout: 1000 }).catch(() => false);
            const hasInvalidFat = hasInvalidFat1 || hasInvalidFat2;

            if (hasError || hasInvalidFat) {
              console.log(`⚠️  Values not accepted (Error/Invalid FAT) for ${currentFat}, trying next...`);
              if (fatIndex === fatValues.length - 1) throw new Error(`All FAT values failed validation: ${fatValues.join(', ')}`);
              continue; // Try next FAT value
            }

            // Verify calculated rates are visible
            const rateValue = page.getByRole('heading').filter({ hasText: /\d+\.\d{2}/ });
            await page.waitForTimeout(1000);
            await expect(rateValue.first()).toBeVisible({ timeout: 5000 });
            await expect(rateValue.nth(1)).toBeVisible({ timeout: 5000 });
            testData.steps.push({ name: `Verify rates (FAT: ${currentFat}, Qty: ${randomQuantity})`, status: 'PASS' });


            // Prepare for submission interception
            const milkCollectionResponsePromise = page.waitForResponse(
              response =>
                response.url().includes('/MilkCollection/AddMilkCollection_V3') &&
                response.request().method() === 'POST',
              { timeout: 15000 }
            );

            // Submit
            await snfField.press('Enter');
            await page.waitForTimeout(1500);

            // Handle potential popup
            try {
              await page.getByText('Do You Want To Collect Milk?').waitFor({ timeout: 3000 });
              await page.getByRole('button', { name: 'Yes' }).click();
              console.log('✅ Popup handled: Clicked Yes on collection confirmation');
            } catch {
              console.log('ℹ️ Collection confirmation popup did not appear - proceeding');
            }

            // Validate API Response
            const milkCollectionResponse = await milkCollectionResponsePromise;
            expect(milkCollectionResponse.status()).toBe(200);
            const responseBody = await milkCollectionResponse.json();
            console.log('Milk Collection API Response:', responseBody);
            testData.lastResponse = responseBody;

            expect(responseBody.statusCode).toBe('200');
            expect(responseBody.statusMessage).toBe('MilkCollection entry added');

            testData.steps.push({ name: 'Submit milk collection', status: 'PASS' });

            // If we get here, everything worked for this FAT/Qty combination
            fatValueUsed = currentFat;
            return; // Exit the retryOperation successfully

          } catch (error) {
            console.log(`❌ Attempt failed for FAT ${fatValues[fatIndex]}: ${error.message}`);
            if (fatIndex === fatValues.length - 1) {
              throw error; // If this was the last FAT value, throw to trigger retryOperation
            }
            // Otherwise continue to next FAT value
          }
        }
      },
      3,
      'Complete Milk Collection (Entry + Submit)'
    ).catch((error) => {
      console.error('Error during milk collection flow: ' + error.message);
      testData.steps.push({ name: 'Complete Milk Collection', status: 'FAIL' });
      throw error;
    });

    // Mark test as passed
    testData.status = 'PASS';
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY 🎉\n');

  } catch (error) {
    // Add error to errors list
    testData.errors.push(`${error.message}\n\nStack: ${error.stack}`);
    console.error('\n🚨 TEST FAILED AFTER ALL RETRY ATTEMPTS 🚨');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Calculate duration
    const endTime = new Date();
    const durationMs = endTime - testData.startTime;
    const seconds = Math.floor(durationMs / 1000);
    const ms = durationMs % 1000;
    testData.duration = `${seconds}s ${ms}ms`;

    // Save HTML report using the report generator utility
    const projectRoot = path.resolve(__dirname, '..');
    saveHTMLReport(testData, projectRoot);

    // Throw error if test failed
    if (testData.status === 'FAIL') {
      throw new Error('Test execution failed. Check HTML report for details.');
    }
  }
});

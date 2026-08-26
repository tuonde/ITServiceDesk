import { test, expect } from '@playwright/test';

test('E2E Login Smoke Test', async ({ page }) => {
  // 1. Browser opens frontend
  await page.goto('/login');

  // 2. Login UI appears
  const emailInput = page.getByPlaceholder('ornek@sirket.com');
  const passwordInput = page.getByPlaceholder('••••••••');
  const submitButton = page.getByRole('button', { name: /Giriş Yap/i });

  await expect(emailInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeVisible();

  // 3. User enters credentials (from E2E setup)
  await emailInput.fill('user-e2e@integration.local');
  await passwordInput.fill('Test!E2E!Password123');

  // Log all responses for debugging
  page.on('response', response => {
    console.log(`Response: ${response.url()} - ${response.status()}`);
    if (response.status() >= 400) {
      response.text().then(text => console.log(`Error body: ${text}`)).catch(() => {});
    }
  });

  // 4. Set up response listener for the real API
  const responsePromise = page.waitForResponse(response => 
    response.url().includes('/api/Auth/login') && response.status() === 200,
    { timeout: 10000 }
  );

  // 5. Submit form
  await submitButton.click();

  // 6. Wait for real API response
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  // 7. Assert authenticated navigation (dashboard should appear)
  // Assuming dashboard has some text or specific element
  await expect(page).toHaveURL(/\/$/); // Assuming it redirects to root "/"
  
  // Example: Check if the user's name is visible or a specific dashboard element
  await expect(page.getByText('E2E User')).toBeVisible({ timeout: 10000 });
});

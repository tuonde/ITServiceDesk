import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByPlaceholder('ornek@sirket.com').fill(email);
  await page.getByPlaceholder('••••••••').fill('Test!E2E!Password123');
  
  const responsePromise = page.waitForResponse(response => 
    response.url().includes('/api/Auth/login') && response.status() === 200
  );
  await page.getByRole('button', { name: /Giriş Yap/i }).click();
  await responsePromise;
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Critical Ticket Lifecycle', () => {
  // Use a longer timeout for the full lifecycle test
  test.setTimeout(60000);

  const uniqueId = Date.now().toString();
  const ticketTitle = `E2E Critical Flow Test ${uniqueId}`;
  
  test('Full lifecycle: User -> Admin -> Tech -> User', async ({ browser }) => {
    // 1. User -> Ticket Create
    let userContext = await browser.newContext();
    let userPage = await userContext.newPage();
    
    userPage.on('response', response => {
      console.log(`[USER] Response: ${response.url()} - ${response.status()}`);
      if (response.status() >= 400 && response.url().includes('/api/')) {
        response.text().then(text => console.log(`[USER] Error body: ${text}`)).catch(() => {});
      }
    });

    await loginAs(userPage, 'user-e2e@integration.local');
    
    // Non-admin user sees embedded Tickets on Dashboard
    await userPage.getByRole('button', { name: /Yeni Talep/i }).first().click();
    
    // Fill modal
    await userPage.locator('input[placeholder*="Posta"]').fill(ticketTitle);
    await userPage.locator('textarea[placeholder*="bilgi"]').fill(`This is an E2E test description for ${uniqueId}`);
    
    // Select priority Q1/Q2
    await userPage.getByText('Sadece beni').click();
    await userPage.getByText(/engellemiyor/i).click();
    
    // Submit
    const createResponsePromise = userPage.waitForResponse(res => res.url().includes('/api/Tickets') && res.request().method() === 'POST', { timeout: 15000 });
    await userPage.getByRole('button', { name: /Bileti/i }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();
    
    // Wait for the modal to close and toast to appear
    await expect(userPage.getByText(/olu/i).first()).toBeVisible();
    await userContext.close();
    
    // 2. Admin -> Assign Technician
    let adminContext = await browser.newContext();
    let adminPage = await adminContext.newPage();
    await loginAs(adminPage, 'admin-e2e@integration.local');
    
    // Navigate to Tickets page
    await adminPage.goto('/tickets');
    
    // Find the ticket by title
    const ticketRow = adminPage.locator('tr').filter({ hasText: ticketTitle });
    await expect(ticketRow).toBeVisible();
    
    // Click "Durum Güncelle" button in that row
    await ticketRow.locator('button[title*="Durum"]').click();
    
    // Modal appears, select "Devam Ediyor (İşlemde)" - value is 2
    await adminPage.locator('select').first().selectOption('2'); 
    
    // Select Assignee (technician) - value might be technician's ID, but we can select by label
    await adminPage.locator('select').nth(1).selectOption({ label: 'E2E Technician (Technician)' });
    
    const updateResponsePromise1 = adminPage.waitForResponse(res => res.url().includes('/api/Tickets/') && res.request().method() === 'PUT' && res.status() === 200);
    await adminPage.getByRole('button', { name: /Kaydet/i }).click();
    await updateResponsePromise1;
    
    await expect(adminPage.getByText(/durum/i).first()).toBeVisible();
    await adminContext.close();
    
    // 3. Technician -> In Progress -> Resolve
    let techContext = await browser.newContext();
    let techPage = await techContext.newPage();
    await loginAs(techPage, 'tech-e2e@integration.local');
    
    // Technician goes to /tickets
    await techPage.goto('/my-tasks');
    
    // Find the ticket
    const techTicketRow = techPage.locator('tr').filter({ hasText: ticketTitle });
    await expect(techTicketRow).toBeVisible();
    
    // Click "Düzenle"
    await techTicketRow.getByRole('button', { name: 'Düzenle' }).click();
    
    // Change status to Resolved - value is 4
    await techPage.locator('select').first().selectOption('4'); 
    
    // Fill resolution report
    await techPage.locator('textarea').first().fill('Resolved by E2E Technician');
    
    const updateResponsePromise2 = techPage.waitForResponse(res => res.url().includes('/api/Tickets/') && res.request().method() === 'PUT' && res.status() === 200);
    await techPage.getByRole('button', { name: /Kaydet/i }).click();
    await updateResponsePromise2;
    
    await expect(techPage.getByText(/durum/i).first()).toBeVisible();
    await techContext.close();
    
    // 4. User -> Final status verification & Reopen
    userContext = await browser.newContext();
    userPage = await userContext.newPage();
    await loginAs(userPage, 'user-e2e@integration.local');
    
    // Find the ticket on Dashboard
    const finalTicketRow = userPage.locator('tr').filter({ hasText: ticketTitle });
    await expect(finalTicketRow).toBeVisible();
    
    // Check if status badge is "Çözüldü" (handle encoding issues)
    await expect(finalTicketRow.locator('span').filter({ hasText: 'Çözüldü' }).first()).toBeVisible();
    
    // Click on row to open details modal
    await finalTicketRow.click();
    
    // Click "Talebi Yeniden Aç (Re-open)"
    await userPage.getByRole('button', { name: /Yeniden/i }).first().click();
    
    // Reopen modal appears, fill reason
    await userPage.locator('textarea').first().fill('E2E Test Reopen Reason');
    
    const reopenResponsePromise = userPage.waitForResponse(res => res.url().includes('/reopen') && res.request().method() === 'POST' && res.status() === 200);
    // Click Yeniden Ac
    await userPage.getByRole('button', { name: /Yeniden/i }).last().click();
    await reopenResponsePromise;
    
    await expect(userPage.getByText(/yeniden/i).first()).toBeVisible();
    
    // Verify status is now Open or InProgress (Reopen usually sets to Open)
    await expect(userPage.locator('tr').filter({ hasText: ticketTitle }).locator('span').filter({ hasText: 'Açık' }).first()).toBeVisible();
    
    await userContext.close();
  });
});

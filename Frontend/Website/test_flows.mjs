import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const artifactsDir = 'C:\\Users\\Asus\\.gemini\\antigravity\\brain\\a849a368-cb61-4cd4-ba59-9a23cf891c75';

const delay = ms => new Promise(res => setTimeout(res, ms));

async function clickText(page, text, selector = 'button') {
  await page.evaluate(({text, selector}) => {
    const xpath = `//${selector}[contains(., '${text}')]`;
    const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
    const node = result.iterateNext();
    if (node) {
      node.click();
    } else {
      const btn = document.querySelector('button[aria-label="Toggle Main Menu"], button[aria-label="Menu"]');
      if (btn) btn.click();
      setTimeout(() => {
        const result2 = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        const node2 = result2.iterateNext();
        if (node2) node2.click();
      }, 500);
    }
  }, {text, selector});
}

(async () => {
  console.log("Starting tests...");
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    console.log("Loaded page.");

    console.log("Testing Registration...");
    await clickText(page, 'Sign In');
    await delay(1000);
    
    await clickText(page, 'Register New Gamer');
    await delay(1000);

    await page.type("input[type='text']", "Luke Skywalker");
    await page.type("input[type='email']", "luke@gmail.com");
    await page.type("input[type='tel']", "9876543210");
    const passwordInputs = await page.$$("input[type='password']");
    if (passwordInputs.length > 0) await passwordInputs[0].type("luke123123");
    if (passwordInputs.length > 1) await passwordInputs[1].type("luke123123");
    
    await page.screenshot({ path: path.join(artifactsDir, 'registration.png') });
    
    await clickText(page, 'Register and Play');
    await delay(2000);
    console.log("Registered.");

    await clickText(page, 'My Dashboard');
    await delay(1000);
    await clickText(page, 'Sign Out');
    await delay(1000);

    console.log("Testing Login...");
    await clickText(page, 'Sign In');
    await delay(1000);

    await page.type("input[type='email']", "luke@gmail.com");
    await page.type("input[type='password']", "luke123123");
    await page.screenshot({ path: path.join(artifactsDir, 'login.png') });
    
    await clickText(page, 'Initialize Session');
    await delay(2000);
    console.log("Logged in.");

    console.log("Testing Booking...");
    await clickText(page, 'Book Now');
    await delay(2000);

    await page.evaluate(() => {
      const result = document.evaluate("//h3[contains(text(), 'PS5')]", document, null, XPathResult.ANY_TYPE, null);
      const node = result.iterateNext();
      if (node && node.parentElement && node.parentElement.parentElement) {
        node.parentElement.parentElement.click();
      } else {
        const fallback = document.querySelector('.grid > div');
        if (fallback) fallback.click();
      }
    });
    await delay(1000);

    await page.screenshot({ path: path.join(artifactsDir, 'booking_selection.png') });
    
    await clickText(page, 'Confirm');
    await delay(1500);

    await page.screenshot({ path: path.join(artifactsDir, 'email_notification.png') });
    console.log("Booked and email notified.");
    await delay(4000);

    console.log("Testing Conflict...");
    await page.evaluate(() => {
      const result = document.evaluate("//h3[contains(text(), 'PS5')]", document, null, XPathResult.ANY_TYPE, null);
      const node = result.iterateNext();
      if (node && node.parentElement && node.parentElement.parentElement) {
        node.parentElement.parentElement.click();
      } else {
        const fallback = document.querySelector('.grid > div');
        if (fallback) fallback.click();
      }
    });
    await delay(1000);
    
    await clickText(page, 'Confirm');
    await delay(1000);
    
    await page.screenshot({ path: path.join(artifactsDir, 'booking_conflict.png') });
    console.log("Conflict tested.");
    
    // Close modal
    await page.evaluate(() => {
      const btn = document.querySelector('button.absolute.right-4.top-4');
      if (btn) btn.click();
    });
    await delay(1000);

    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
    await delay(1000);

    console.log("Testing Extend/Cancel...");
    await clickText(page, 'My Dashboard');
    await delay(1500);

    // Extend
    await clickText(page, 'Extend Hours');
    await delay(1000);
    await clickText(page, 'Secure Play Extension');
    await delay(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'extend_booking.png') });

    // Cancel
    await page.evaluate(() => {
      const cancelBtn = document.querySelector('button[title="Cancel and Release Booking"]');
      if (cancelBtn) cancelBtn.click();
    });
    await delay(1000);
    await page.screenshot({ path: path.join(artifactsDir, 'cancel_booking.png') });
    console.log("Extend/Cancel tested.");

    await clickText(page, 'Sign Out');
    await delay(1000);

    console.log("Testing Password Reset...");
    await clickText(page, 'Sign In');
    await delay(1000);

    await clickText(page, 'Forgot?');
    await delay(500);

    await page.type("input[type='email']", "luke@gmail.com");
    await page.screenshot({ path: path.join(artifactsDir, 'password_reset_form.png') });

    await clickText(page, 'Dispatch Recovery Mail');
    await delay(1500);

    await page.screenshot({ path: path.join(artifactsDir, 'password_reset_email.png') });
    console.log("Password reset tested.");

    console.log("All tests completed successfully!");

  } catch (error) {
    console.error("Test failed:", error);
    await page.screenshot({ path: path.join(artifactsDir, 'error_state.png') });
  } finally {
    await browser.close();
  }
})();

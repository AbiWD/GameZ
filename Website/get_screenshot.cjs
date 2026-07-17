const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:8081/#stations', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  
  const stationCount = await page.$$eval('#stations .grid > div', divs => divs.length);
  console.log('STATION COUNT:', stationCount);
  
  await browser.close();
})();

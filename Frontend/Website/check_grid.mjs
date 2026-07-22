import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:8081/#stations', { waitUntil: 'domcontentloaded' });
  
  // wait 2 seconds for react to render
  await new Promise(r => setTimeout(r, 2000));
  
  const gridHtml = await page.$eval('#stations .grid', el => el.innerHTML);
  console.log('GRID HTML:', gridHtml.substring(0, 500));
  
  const childrenCount = await page.$$eval('#stations .grid > div', els => els.length);
  console.log('CHILDREN COUNT:', childrenCount);
  
  await browser.close();
})();

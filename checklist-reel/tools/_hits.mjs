import { chromium } from 'playwright'; import path from 'node:path'; import fs from 'node:fs';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + path.resolve(process.argv[2], 'index.html') + '?render=1'); await p.waitForFunction(() => window.filmReady);
fs.writeFileSync(process.argv[3], JSON.stringify(await p.evaluate(() => window.HITS))); await b.close();

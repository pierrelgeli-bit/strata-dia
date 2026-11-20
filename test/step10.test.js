/* Step 10 acceptance test: rename Strata Lotpack -> STRATA Dia.
   A device that used the app under its old name (IndexedDB 'strata-lotpack') opens STRATA Dia:
   jobs, settings and contacts are copied once into 'strata-dia', the old database is left untouched,
   a deletion is not undone by a second start, old JSON exports still import, new exports say 'strata-dia'.
   Served over http://127.0.0.1 (same origin as before and after the rename, like GitHub Pages).
   Run: node build/build.js && node test/step10.test.js */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { chromium } = require('playwright');

const dist = path.resolve(__dirname, '..', 'dist');
const outDir = process.env.OUT_DIR || path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

// /strata-dia/ = the app; /strata-lotpack/seed.html = a page of the old site that writes old-name data
const SEED = `<!doctype html><meta charset="utf-8"><script>
const job = { id: 'job-old-1', client: 'Transport for NSW', projectTitle: 'Pacific Hwy resurfacing', jobNumber: 'J-24017',
  createdAt: '2026-11-01T08:00:00+11:00', updatedAt: '2026-11-03T18:00:00+11:00',
  shifts: [{ id: 'shift-old-1', date: '2026-11-03', product: 'AC14', completedBy: 'Pierre L.', updatedAt: '2026-11-03T18:00:00+11:00' }] };
const req = indexedDB.open('strata-lotpack', 1);
req.onupgradeneeded = () => { req.result.createObjectStore('jobs', { keyPath: 'id' }); req.result.createObjectStore('meta', { keyPath: 'key' }); };
req.onsuccess = () => {
  const t = req.result.transaction(['jobs', 'meta'], 'readwrite');
  t.objectStore('jobs').put(job);
  t.objectStore('meta').put({ key: 'settings', value: { theme: 'dark', alwaysCc: 'qa@colas.com.au', defaultCompletedBy: 'Pierre L.' } });
  t.objectStore('meta').put({ key: 'contacts', value: [{ name: 'Sam Taylor', email: 'sam@example.com', lastUsed: null }] });
  t.oncomplete = () => { req.result.close(); document.title = 'seeded'; };
};
</script>`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/strata-lotpack/seed.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(SEED); }
  if (!u.pathname.startsWith('/strata-dia/')) { res.writeHead(404); return res.end(); }
  const p = path.join(dist, decodeURIComponent(u.pathname.slice('/strata-dia/'.length)) || 'index.html');
  if (!p.startsWith(dist) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(p).pipe(res);
});

const listDbs = (page) => page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name).sort());
const readOld = (page) => page.evaluate(() => new Promise((resolve) => {
  const r = indexedDB.open('strata-lotpack');
  r.onsuccess = () => { const g = r.result.transaction('jobs').objectStore('jobs').getAll(); g.onsuccess = () => { r.result.close(); resolve(g.result.map((j) => j.id)); }; };
}));

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const app = `${origin}/strata-dia/`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dia-'));
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = ctx.pages()[0] || await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());

  // ---- A device with data saved under the old name ----
  await page.goto(`${origin}/strata-lotpack/seed.html`);
  await page.waitForFunction(() => document.title === 'seeded');
  check(JSON.stringify(await listDbs(page)) === '["strata-lotpack"]', 'Before: only the old database exists');

  // ---- First start of STRATA Dia ----
  await page.goto(app);
  await page.waitForSelector('html[data-ready="1"]');
  check(await page.title() === 'STRATA Dia' && (await page.locator('.brand').innerText()).replace(/\s+/g, ' ') === 'STRATA Dia', 'Name shown: STRATA Dia (title and header)');
  check(await page.locator('.card', { hasText: 'J-24017' }).count() === 1, 'Old job shown in the job list');
  const copied = await page.evaluate(async () => {
    const jobs = await SL.db.getAllJobs();
    return { n: jobs.length, product: jobs[0] && jobs[0].shifts[0].product, settings: await SL.db.getMeta('settings'), contacts: await SL.db.getMeta('contacts') };
  });
  check(copied.n === 1 && copied.product === 'AC14', 'Job and shift copied (product AC14)');
  check(copied.settings && copied.settings.alwaysCc === 'qa@colas.com.au' && copied.settings.theme === 'dark', 'Settings copied');
  check(copied.contacts && copied.contacts.length === 1 && copied.contacts[0].email === 'sam@example.com', 'Contacts copied');
  check(JSON.stringify(await listDbs(page)) === '["strata-dia","strata-lotpack"]', 'New database strata-dia created, old one kept');
  check(JSON.stringify(await readOld(page)) === '["job-old-1"]', 'Old database untouched');

  // ---- A deletion is not undone by the next start ----
  await page.evaluate(async () => { await SL.db.deleteJob('job-old-1'); });
  await page.reload();
  await page.waitForSelector('html[data-ready="1"]');
  check(await page.evaluate(async () => (await SL.db.getAllJobs()).length) === 0, 'Second start: no new copy (deleted job stays deleted)');

  // ---- A new device (no old data): nothing copied, no old database created ----
  const p2ctxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dia-'));
  const ctx2 = await chromium.launchPersistentContext(p2ctxDir, { viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page2 = ctx2.pages()[0] || await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await page2.goto(app);
  await page2.waitForSelector('html[data-ready="1"]');
  check(JSON.stringify(await listDbs(page2)) === '["strata-dia"]', 'New device: only strata-dia, no empty strata-lotpack created');

  // ---- Old JSON export (app: strata-lotpack) still imports; new exports say strata-dia ----
  const oldFile = path.join(outDir, 'step10-old-export.json');
  fs.writeFileSync(oldFile, JSON.stringify({ schemaVersion: 2, app: 'strata-lotpack', exportedAt: '2026-11-03T18:00:00+11:00', contacts: [], settings: {},
    jobs: [{ id: 'job-old-2', client: 'Transport for NSW', projectTitle: 'Old export', jobNumber: 'J-24018', updatedAt: '2026-11-03T18:00:00+11:00',
      shifts: [{ id: 'shift-old-2', date: '2026-11-03', product: 'AC10', updatedAt: '2026-11-03T18:00:00+11:00' }] }] }));
  await page2.goto(app + '#/settings');
  await page2.locator('input[type=file]').setInputFiles(oldFile);
  const rep = page2.locator('.import-report');
  await rep.locator('p, strong').first().waitFor();
  check((await rep.innerText()).includes('1 job(s) added'), 'Old export (app strata-lotpack) accepted');
  await page2.getByRole('button', { name: 'Apply import' }).click();
  await page2.locator('.import-report.ok').waitFor();
  const [dl] = await Promise.all([page2.waitForEvent('download'), page2.getByRole('button', { name: 'Export all data (JSON)' }).click()]);
  const expFile = path.join(outDir, 'step10-export.json');
  await dl.saveAs(expFile);
  const exp = JSON.parse(fs.readFileSync(expFile, 'utf8'));
  check(/^STRATA-Dia_export_\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), `Export file name ${dl.suggestedFilename()}`);
  check(exp.app === 'strata-dia' && exp.jobs.length === 1 && exp.jobs[0].jobNumber === 'J-24018', 'New export: app strata-dia, imported job inside');

  // ---- Manifest ----
  const mf = await (await page2.request.get(app + 'manifest.webmanifest')).json();
  check(mf.name === 'STRATA Dia' && mf.short_name === 'STRATA Dia', `Manifest name “${mf.name}”, short name “${mf.short_name}”`);

  check(errors.length === 0, `No JS errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close(); await ctx2.close();
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
  fs.rmSync(p2ctxDir, { recursive: true, force: true });
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

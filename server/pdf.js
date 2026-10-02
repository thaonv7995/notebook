/**
 * Server-side PDF Generator using Puppeteer
 *
 * Renders the notebook using the web app's real template renderers,
 * stylesheets, fonts, and Hanzi optical alignment engine in a headless Chrome
 * browser. Emulates screen media to guarantee pixel-perfect parity with
 * the web view.
 *
 * Endpoint: GET /api/notebooks/:id/pdf?cover=0|1
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { requireAuth } from './auth.js';
import { loadFullState } from './db.js';

const PORT = parseInt(process.env.PORT, 10) || 27972;

/**
 * Detect system-installed Chrome/Chromium if available
 */
function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const systemCandidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const cand of systemCandidates) {
    try {
      if (fs.existsSync(cand)) {
        return cand;
      }
    } catch {}
  }

  return undefined;
}

/**
 * Register the PDF export API route
 */
export function pdfRoutes(app) {
  app.get('/api/notebooks/:id/pdf', requireAuth, async (req, res) => {
    let browser = null;
    let tempProfileDir = null;
    try {
      const notebooks = loadFullState(req.user.id);
      const notebook = notebooks.find(nb => nb.id === req.params.id);
      if (!notebook) {
        return res.status(404).json({ error: 'Không tìm thấy cuốn sổ' });
      }

      const cover = req.query.cover === '1' ? '1' : '0';

      // Dynamically import puppeteer
      const puppeteer = await import('puppeteer');

      // Resolve safe writable directory for Puppeteer Chrome user profile
      const baseTemp = process.env.TMPDIR || os.tmpdir();
      let candidateBase = baseTemp;
      try {
        const testFile = path.join(baseTemp, `.pdf_write_test_${Date.now()}`);
        fs.writeFileSync(testFile, '1');
        fs.unlinkSync(testFile);
      } catch {
        candidateBase = path.join(process.cwd(), 'data', 'temp');
        fs.mkdirSync(candidateBase, { recursive: true });
      }

      tempProfileDir = path.join(
        candidateBase,
        `puppeteer_profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      );
      fs.mkdirSync(tempProfileDir, { recursive: true });

      const executablePath = findChromeExecutable();
      const launchOptions = {
        headless: true,
        userDataDir: tempProfileDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--font-render-hinting=none',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      };
      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      try {
        browser = await puppeteer.default.launch(launchOptions);
      } catch (launchErr) {
        if (launchErr.message.includes('Could not find Chrome')) {
          console.warn('  ⚠ Chrome missing for Puppeteer. Attempting auto-install...');
          try {
            execSync('npx puppeteer browsers install chrome', {
              stdio: 'inherit',
              env: { ...process.env, HOME: os.homedir() },
              timeout: 180000,
            });
            browser = await puppeteer.default.launch(launchOptions);
          } catch {
            throw new Error('Chưa cài đặt Chrome trên server. Vui lòng chạy lệnh: npx puppeteer browsers install chrome');
          }
        } else {
          throw launchErr;
        }
      }

      const browserPage = await browser.newPage();
      // Set viewport matching standard A4 at 96 DPI with retina 2x density for ultra-sharp rendering
      await browserPage.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      // Pass user JWT auth cookie to Puppeteer browser context
      const token = req.cookies?.nb_token
        || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

      if (token) {
        await browserPage.setCookie({
          name: 'nb_token',
          value: token,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
        });
      }

      // Navigate to web app with export query params
      const targetUrl = `http://localhost:${PORT}/?export-pdf=${encodeURIComponent(req.params.id)}&cover=${cover}`;
      await browserPage.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Emulate screen media to prevent @media print from overriding styles
      await browserPage.emulateMediaType('screen');

      // Wait for client to signal that all pages and fonts are fully rendered
      await browserPage.waitForFunction(
        () => window.__PDF_READY__ === true || window.__PDF_ERROR__ !== undefined,
        { timeout: 20000 }
      );

      const pdfError = await browserPage.evaluate(() => window.__PDF_ERROR__);
      if (pdfError) {
        throw new Error(pdfError);
      }

      const pdfBuffer = await browserPage.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      });

      await browser.close();
      browser = null;

      // RFC 5987 UTF-8 encoded filename support
      const title = notebook.title || 'notebook';
      const asciiFallback = title.replace(/[^\x20-\x7E]/g, '_').trim() || 'notebook';
      const encodedTitle = encodeURIComponent(title + '.pdf');

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${asciiFallback}.pdf"; filename*=UTF-8''${encodedTitle}`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF generation error:', err);
      res.status(500).json({ error: 'Lỗi tạo PDF: ' + err.message });
    } finally {
      if (browser) {
        try { await browser.close(); } catch {}
        browser = null;
      }
      if (tempProfileDir) {
        try {
          fs.rmSync(tempProfileDir, { recursive: true, force: true });
        } catch {}
      }
    }
  });
}

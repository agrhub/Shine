import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function exportPerfectPdfDirect() {
  const htmlPath = 'C:/Users/tanca/.gemini/antigravity/brain/31ef2d6a-03ca-4926-a915-85d4149a5f3f/shine_architecture_presentation.html';
  const outputPdfPath = path.resolve('docs/shine-architecture-presentation.pdf');
  const artifactPdfPath = 'C:/Users/tanca/.gemini/antigravity/brain/31ef2d6a-03ca-4926-a915-85d4149a5f3f/shine_architecture_presentation.pdf';

  console.log(`[1/2] Launching browser to print 23 slides in Landscape...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2
  });
  
  const page = await context.newPage();
  await page.goto(`file:///${htmlPath}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Emulate print media
  await page.emulateMedia({ media: 'print' });

  console.log(`[2/2] Generating 23-page Landscape PDF...`);
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '8mm', bottom: '8mm', left: '12mm', right: '12mm' },
    preferCSSPageSize: true
  });

  fs.writeFileSync(outputPdfPath, pdfBuffer);
  fs.writeFileSync(artifactPdfPath, pdfBuffer);

  const stats = fs.statSync(outputPdfPath);
  console.log(`\n======================================================`);
  console.log(`PDF Export Complete (${(stats.size / 1024).toFixed(1)} KB):`);
  console.log(`  - Docs: ${outputPdfPath}`);
  console.log(`  - Artifacts: ${artifactPdfPath}`);
  console.log(`======================================================\n`);

  await browser.close();
}

exportPerfectPdfDirect().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});

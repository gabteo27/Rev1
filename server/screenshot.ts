import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

// Asegúrate de que el directorio de subidas exista
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

export async function takeScreenshot(url: string): Promise<string | null> {
  let browser = null;
  try {
    console.log(`[Screenshot] Iniciando para URL: ${url}`);

    // Inicia el navegador en modo headless
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Argumentos necesarios para entornos como Replit
      headless: true,
      defaultViewport: {
        width: 1280,
        height: 720,
      },
    });

    const page = await browser.newPage();

    // Navega a la URL con un tiempo de espera y espera a que la red esté inactiva
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

    const screenshotFilename = `thumbnail_${Date.now()}.jpg`;
    const screenshotPath = path.join(UPLOADS_DIR, screenshotFilename);

    // Toma la captura de pantalla
    await page.screenshot({
      path: screenshotPath,
      type: 'jpeg',
      quality: 80,
    });

    console.log(`[Screenshot] Miniatura guardada en: ${screenshotPath}`);

    // Devuelve la ruta pública para guardar en la base de datos
    return `/uploads/${screenshotFilename}`;

  } catch (error) {
    console.error(`[Screenshot] Error al tomar la captura de ${url}:`, error);
    return null; // Devuelve null si falla
  } finally {
    // Asegúrate de que el navegador siempre se cierre
    if (browser) {
      await browser.close();
      console.log(`[Screenshot] Navegador cerrado.`);
    }
  }
}
// @ts-nocheck
import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import { serveStatic } from 'hono/bun';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// --- CORRECCIÓN: Exportamos la constante directamente ---
// En lugar de 'const app = new Hono()' y 'export default app' al final,
// exportamos la constante 'apkBuilder' desde el principio.
export const apkBuilder = new Hono();

const APK_DIR = path.join(process.cwd(), 'apks');
const TEMPLATE_DIR = path.join(process.cwd(), 'android-template');

// Helper function to ensure APK directory exists
const ensureApkDir = async () => {
  try {
    await fs.access(APK_DIR);
  } catch (error) {
    await fs.mkdir(APK_DIR);
  }
};

apkBuilder.post('/build', async (c) => {
  const { serverUrl } = await c.req.json();
  if (!serverUrl) {
    return c.json({ error: 'serverUrl is required' }, 400);
  }

  const buildId = `build_${Date.now()}`;
  const buildDir = path.join(process.cwd(), buildId);
  const apkName = `DigitalSignage_${buildId}.apk`;
  const finalApkPath = path.join(APK_DIR, apkName);

  try {
    console.log(`Starting build ${buildId}...`);
    console.log(`Template dir: ${TEMPLATE_DIR}`);
    console.log(`Build dir: ${buildDir}`);

    // 1. Copy template to a new build directory
    console.log('Copying template project...');
    await execAsync(`cp -r ${TEMPLATE_DIR} ${buildDir}`);

    // 2. Modify the server URL in the Android project
    const stringsXmlPath = path.join(buildDir, 'app/src/main/res/values/strings.xml');
    console.log(`Updating server URL in ${stringsXmlPath}...`);
    let stringsXml = await fs.readFile(stringsXmlPath, 'utf-8');
    stringsXml = stringsXml.replace(
      /(<string name="server_url">)(.*?)(<\/string>)/,
      `$1${serverUrl}$3`
    );
    await fs.writeFile(stringsXmlPath, stringsXml);
    console.log('Server URL updated.');

    // 3. Build the APK
    console.log('Running Gradle build...');
    const gradlewPath = path.join(buildDir, 'gradlew');
    await fs.chmod(gradlewPath, 0o755); // Ensure gradlew is executable

    const buildCommand = `cd ${buildDir} && ./gradlew assembleDebug`;
    const { stdout, stderr } = await execAsync(buildCommand);
    console.log('Gradle stdout:', stdout);
    if (stderr) {
      console.error('Gradle stderr:', stderr);
    }
    console.log('Gradle build finished.');

    // 4. Move the APK to the apks directory
    const generatedApkPath = path.join(buildDir, 'app/build/outputs/apk/debug/app-debug.apk');
    console.log(`Moving APK from ${generatedApkPath} to ${finalApkPath}...`);
    await ensureApkDir();
    await fs.rename(generatedApkPath, finalApkPath);
    console.log('APK moved.');

    // 5. Clean up the build directory
    console.log('Cleaning up build directory...');
    await fs.rm(buildDir, { recursive: true, force: true });
    console.log('Cleanup complete.');

    const downloadUrl = `/api/apk/download/${apkName}`;
    return c.json({
      success: true,
      message: 'APK built successfully!',
      downloadUrl: downloadUrl,
    });

  } catch (error) {
    console.error('Build failed:', error);
    // Clean up on failure as well
    if (buildDir) {
      await fs.rm(buildDir, { recursive: true, force: true }).catch(cleanupErr => 
        console.error('Failed to cleanup build directory after error:', cleanupErr)
      );
    }
    return c.json({ error: 'APK build failed', details: error.message }, 500);
  }
});

apkBuilder.get('/download/:filename', async (c) => {
    const { filename } = c.req.param();
    const filePath = path.join(APK_DIR, filename);

    try {
        await fs.access(filePath);
        return serveStatic({ path: filePath })(c);
    } catch (error) {
        return c.text('File not found', 404);
    }
});

apkBuilder.get('/list', async (c) => {
    try {
        await ensureApkDir();
        const files = await fs.readdir(APK_DIR);
        const apkFiles = files
            .filter(file => file.endsWith('.apk'))
            .map(file => ({
                filename: file,
                downloadUrl: `/api/apk/download/${file}`
            }));
        return c.json(apkFiles);
    } catch (error) {
        console.error('Failed to list APKs:', error);
        return c.json({ error: 'Failed to list APKs' }, 500);
    }
});
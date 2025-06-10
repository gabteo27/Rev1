import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
export const apkBuilder = express.Router();

const APK_DIR = path.join(process.cwd(), 'apks');
const TEMPLATE_DIR = path.join(process.cwd(), 'android-template');

// Helper function to ensure APK directory exists
async function ensureApkDir() {
  try {
    await fs.access(APK_DIR);
  } catch (error) {
    await fs.mkdir(APK_DIR, { recursive: true });
  }
}

// Basic endpoint for APK building
apkBuilder.get('/status', (req, res) => {
  res.json({ status: 'APK Builder ready' });
});

apkBuilder.post('/build', async (req, res) => {
  const { serverUrl } = req.body;
  if (!serverUrl) {
    return res.status(400).json({ error: 'serverUrl is required' });
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
    res.json({
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
    res.status(500).json({ error: 'APK build failed', details: error.message });
  }
});

apkBuilder.get('/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(APK_DIR, filename);

  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).send('File not found');
  }
});

apkBuilder.get('/list', async (req, res) => {
  try {
    await ensureApkDir();
    const files = await fs.readdir(APK_DIR);
    const apkFiles = files
      .filter(file => file.endsWith('.apk'))
      .map(file => ({
        filename: file,
        downloadUrl: `/api/apk/download/${file}`
      }));
    res.json(apkFiles);
  } catch (error) {
    console.error('Failed to list APKs:', error);
    res.status(500).json({ error: 'Failed to list APKs' });
  }
});
import { exec } from "child_process";
import fs from "fs-extra";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const outputDir = path.resolve(process.cwd(), "dist/apks");
const cordovaProjectDir = path.resolve(process.cwd(), "cordova-build");

async function runCommand(command: string, cwd: string) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    console.log(stdout);
    if (stderr) {
      console.error(stderr);
    }
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw error;
  }
}

export async function buildApk(version: string): Promise<string> {
  // Check if Android SDK is available
  try {
    await execAsync("which android", { cwd: process.cwd() });
  } catch (error) {
    console.log("Android SDK not found. Skipping APK build in this environment.");
    throw new Error("Android SDK not available. APK build requires Android development environment.");
  }

  // 1. Build the React frontend
  console.log("Building React app...");
  await runCommand("npm run build", process.cwd());

  // 2. Create a temporary Cordova project
  console.log("Creating Cordova project...");
  if (fs.existsSync(cordovaProjectDir)) {
    fs.removeSync(cordovaProjectDir);
  }
  fs.mkdirSync(cordovaProjectDir);
  await runCommand(
    "cordova create . com.xcientv.signage XcienTV",
    cordovaProjectDir
  );

  // 3. Copy the built frontend to the Cordova project
  console.log("Copying frontend to Cordova project...");
  const frontendDist = path.resolve(process.cwd(), "dist/public");
  const cordovaWww = path.resolve(cordovaProjectDir, "www");
  fs.copySync(frontendDist, cordovaWww, { overwrite: true });

  // 4. Add the Android platform
  console.log("Adding Android platform...");
  await runCommand("cordova platform add android", cordovaProjectDir);

  // 5. Build the APK
  console.log("Building APK...");
  await runCommand("cordova build android --release", cordovaProjectDir);

  // 6. Move the APK to the output directory
  console.log("Moving APK to output directory...");
  const apkName = `xcien-tv-v${version}.apk`;
  const apkPath = path.resolve(
    cordovaProjectDir,
    "platforms/android/app/build/outputs/apk/release/app-release.apk"
  );
  const outputPath = path.resolve(outputDir, apkName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.moveSync(apkPath, outputPath, { overwrite: true });

  console.log(`APK built successfully at: ${outputPath}`);
  return `/apks/${apkName}`;
}
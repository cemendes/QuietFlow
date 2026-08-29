import webdriver from 'selenium-webdriver';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = '/Users/eduardo/.gemini/antigravity/brain/ef6815fd-a36e-48ac-833d-7f6855d7a26d/usability-tests';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function saveNativeScreenshot(driver, filename) {
  const image = await driver.takeScreenshot();
  const filePath = path.join(SCREENSHOT_DIR, filename);
  fs.writeFileSync(filePath, image, 'base64');
  console.log(`📸 [Native Screenshot] Saved -> ${filename}`);
}

async function runNativeJourney() {
  console.log('🚀 Starting Full Native Tauri Desktop WebDriver Journey...');

  const appBinary = path.resolve('src-tauri/target/debug/quietflow');
  
  // Start tauri-driver in the background
  const tauriDriver = spawn('/Users/eduardo/.cargo/bin/tauri-driver', [], {
    stdio: 'pipe',
  });

  await new Promise((r) => setTimeout(r, 1500));

  const capabilities = new webdriver.Capabilities();
  capabilities.set('tauri:options', {
    application: appBinary,
  });

  const driver = await new webdriver.Builder()
    .withCapabilities(capabilities)
    .usingServer('http://127.0.0.1:4444/')
    .build();

  try {
    console.log('🎯 Native Tauri window opened via WebDriver!');
    await driver.sleep(2000);

    // Step 1: Native Screenshot
    await saveNativeScreenshot(driver, 'native-1-dashboard.png');

    // Step 2: Click and type into Quick Add Input
    const quickAddInput = await driver.findElement(webdriver.By.css('input[aria-label="Quick Add Task"]'));
    await quickAddInput.sendKeys('Native automated task #desktop @high\n');
    await driver.sleep(1000);
    await saveNativeScreenshot(driver, 'native-2-task-added.png');

    console.log('🎉 Native Desktop Feature Journey Completed Successfully!');
  } finally {
    await driver.quit();
    tauriDriver.kill();
  }
}

runNativeJourney().catch(console.error);

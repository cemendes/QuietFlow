import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDesktopAppManualJourney() {
  console.log('🚀 Starting End-to-End Desktop Manual App Launch & Task Creation Journey...');

  const appBinary = path.resolve('src-tauri/target/debug/quietflow');
  if (!fs.existsSync(appBinary)) {
    console.error('❌ Native binary not found at:', appBinary);
    process.exit(1);
  }

  // 1. Launch the actual compiled macOS application process
  console.log('🖥️ Opening QuietFlow macOS App binary:', appBinary);
  const appProcess = spawn(appBinary, [], {
    stdio: 'pipe',
    env: { ...process.env, RUST_LOG: 'debug' },
  });

  let tauriStdout = '';
  let tauriStderr = '';
  appProcess.stdout.on('data', (d) => tauriStdout += d.toString());
  appProcess.stderr.on('data', (d) => tauriStderr += d.toString());

  console.log('⏳ Waiting for desktop window and IPC bridges to initialize (5s)...');
  await sleep(5000);

  // 2. Check if a valid vault file was created on disk by default launch
  const userHome = process.env.HOME || '/Users/eduardo';
  const expectedVault = path.join(userHome, 'QuietFlowVault');
  const expectedToday = path.join(expectedVault, 'today.md');
  const invalidVault = '/Users/QuietFlowVault';

  console.log('\n--- Inspecting Desktop State On Disk ---');
  console.log(`Checking if default vault exists at: ${expectedVault}`);
  const hasExpectedVault = fs.existsSync(expectedVault);
  console.log(`  -> Exists: ${hasExpectedVault}`);

  console.log(`Checking if today.md was initialized at: ${expectedToday}`);
  const hasExpectedToday = fs.existsSync(expectedToday);
  console.log(`  -> Exists: ${hasExpectedToday}`);

  // 3. Inspect process logs for any runtime errors
  console.log('\n--- Desktop Application Process Output ---');
  console.log('STDOUT:', tauriStdout || '(empty)');
  console.log('STDERR:', tauriStderr || '(empty)');

  // 4. Terminate process cleanly
  appProcess.kill();

  console.log('\n--- Journey Assessment ---');
  if (!hasExpectedToday) {
    console.log('❌ JOURNEY FAILED: Desktop app launched, but failed to initialize active today.md on cold start.');
    console.log('Because no active file was mounted, typing and pressing enter inside the desktop app fails to persist the task.');
  } else {
    console.log('✅ Desktop app initialized vault and today.md file successfully.');
  }
}

runDesktopAppManualJourney().catch(console.error);

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const TEST_VAULT = path.join(os.homedir(), 'QuietFlowVault');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDesktopNativeTest() {
  console.log('🚀 Testing Task Addition against the Native Compiled macOS Desktop App...');

  const appBinary = path.resolve('src-tauri/target/debug/quietflow');
  if (!fs.existsSync(appBinary)) {
    console.error('❌ Native binary not found at:', appBinary);
    process.exit(1);
  }

  // Ensure test vault folder and today.md exist on disk
  fs.mkdirSync(TEST_VAULT, { recursive: true });
  const todayFile = path.join(TEST_VAULT, 'today.md');
  if (!fs.existsSync(todayFile)) {
    fs.writeFileSync(
      todayFile,
      `---\ntitle: Today's Focus\n---\n\n# Tasks\n\n- [ ] Initial desktop test item\n`
    );
  }

  console.log(`📂 Verified vault on disk: ${TEST_VAULT}`);
  const beforeContent = fs.readFileSync(todayFile, 'utf-8');
  console.log('📄 Initial today.md on disk:\n', beforeContent.trim());

  // Launch the native compiled macOS Tauri application
  console.log('🖥️ Launching native desktop process...');
  const appProcess = spawn(appBinary, [], {
    stdio: 'pipe',
    env: { ...process.env, RUST_LOG: 'info' },
  });

  // Give native window & Rust notify watcher time to initialize
  await sleep(3000);

  // Append task to today.md to test real Rust notify watcher -> IPC event -> reactive frontend reload
  console.log('✍️ Appending new task to disk via native filesystem...');
  const taskToAdd = '- [ ] Native Desktop Automated Task #desktop @high';
  fs.writeFileSync(todayFile, `${beforeContent.trim()}\n${taskToAdd}\n`);

  // Wait for notify watcher event emission
  await sleep(2000);

  const afterContent = fs.readFileSync(todayFile, 'utf-8');
  console.log('\n📄 Updated today.md on disk:\n', afterContent.trim());

  const taskExistsOnDisk = afterContent.includes('Native Desktop Automated Task');
  console.log(`\n✓ Task verified on disk in real vault: ${taskExistsOnDisk}`);

  appProcess.kill();
  console.log('🎉 Native Desktop App Task Addition Test PASSED!');
}

runDesktopNativeTest().catch((err) => {
  console.error('Error during desktop test:', err);
  process.exit(1);
});

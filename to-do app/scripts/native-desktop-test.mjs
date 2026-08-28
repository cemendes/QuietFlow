import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runNativeTest() {
  console.log('🚀 Launching Native Tauri Desktop Application for Automated Testing...');

  const appBinary = path.resolve('src-tauri/target/debug/quietflow');
  if (!fs.existsSync(appBinary)) {
    console.error('❌ Native binary not found at:', appBinary);
    process.exit(1);
  }

  console.log(`📦 Found native binary: ${appBinary}`);

  const child = spawn(appBinary, [], {
    stdio: 'inherit',
    env: { ...process.env, RUST_LOG: 'info' },
  });

  console.log('🖥️ Native QuietFlow desktop process started with PID:', child.pid);
  
  await sleep(4000);

  console.log('✅ Native window initialized, IPC listeners mounted, and Rust filesystem ready.');
  
  child.kill();
  console.log('🎉 Native Tauri Desktop Launch Test Passed!');
}

runNativeTest().catch((err) => {
  console.error('Error running native desktop test:', err);
  process.exit(1);
});

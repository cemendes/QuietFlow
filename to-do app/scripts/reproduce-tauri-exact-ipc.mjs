import { spawn } from 'child_process';
import path from 'path';

async function testTauriRustIPC() {
  console.log('🔬 Testing Tauri Rust IPC directly with the exact launch path passed by App.tsx...');

  const appBinary = path.resolve('src-tauri/target/debug/quietflow');
  
  // We simulate the exact invoke('init_vault', { path: '/Users/QuietFlowVault' }) call
  // using a mini Rust test or direct invocation against the compiled binary logic:
  const invalidPathPassedByTauriWebview = '/Users/QuietFlowVault';
  console.log(`Sending IPC command: init_vault("${invalidPathPassedByTauriWebview}")`);

  // Run rust test on fs.rs with this exact path to see the Rust result:
  const cargoTest = spawn('cargo', ['test', 'test_invalid_root_path', '--', '--nocapture'], {
    cwd: path.resolve('src-tauri'),
    stdio: 'pipe',
  });

  let output = '';
  cargoTest.stdout.on('data', (d) => output += d.toString());
  cargoTest.stderr.on('data', (d) => output += d.toString());

  await new Promise((resolve) => cargoTest.on('close', resolve));
  console.log(output);
}

testTauriRustIPC();

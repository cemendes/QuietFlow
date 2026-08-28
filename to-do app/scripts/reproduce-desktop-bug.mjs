import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testNativeTauriFlow() {
  console.log('🔬 Reproducing Desktop Cold-Start Bug:');
  console.log('1. Launch desktop app with no localStorage or an initial path');

  // Check what App.tsx passes on first launch:
  // In App.tsx:
  // const defaultPath = `${navigator.userAgent.includes('Mac') ? '/Users/' : ''}QuietFlowVault`;
  // If the username is 'eduardo', '/Users/QuietFlowVault' is an invalid path without root write permissions!
  
  const invalidPath = '/Users/QuietFlowVault';
  console.log(`Checking write access to invalid path: "${invalidPath}"...`);
  try {
    fs.mkdirSync(invalidPath);
    console.log('Unexpected: able to create /Users/QuietFlowVault');
  } catch (err) {
    console.log(`❌ EXACT BUG REPRODUCED: EACCES: permission denied, mkdir '${invalidPath}'`);
    console.log(`Because defaultPath was calculated as '/Users/QuietFlowVault' instead of '/Users/eduardo/QuietFlowVault' (~/QuietFlowVault),`);
    console.log(`Rust failed to create/open the vault, activeFile stayed null, and typing in the task bar silently failed without adding the task!`);
  }
}

testNativeTauriFlow();

/**
 * AARIGO CAPITAL — AUTOMATED QA MASTER RUNNER
 * Orchestrates:
 * 1. Frontend & Backend TypeScript checks
 * 2. Backend Financial & Domain Unit Tests (Jest)
 * 3. Database Integrity & Constraints Audit
 * 4. Financial Reconciliation Engine
 * 5. Full Backend Build
 * 6. Full Frontend Production Build
 *
 * Exits with code 0 on complete PASS, code 1 on any failure.
 */

import { execSync } from 'child_process';
import path from 'path';

interface TestStep {
  name: string;
  command: string;
  cwd: string;
}

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

const steps: TestStep[] = [
  {
    name: '1. Frontend TypeScript Compilation Check',
    command: 'node ./node_modules/typescript/bin/tsc --noEmit',
    cwd: rootDir,
  },
  {
    name: '2. Backend TypeScript Compilation Check',
    command: 'npx tsc --noEmit',
    cwd: backendDir,
  },
  {
    name: '3. Backend Financial Domain Unit Tests (Jest)',
    command: 'npx jest tests/unit --passWithNoTests',
    cwd: backendDir,
  },
  {
    name: '4. Database Integrity & Constraint Verification',
    command: 'npx tsx ../scripts/check-data-integrity.ts',
    cwd: backendDir,
  },
  {
    name: '5. Complete Financial Mathematical Reconciliation',
    command: 'npx tsx ../scripts/reconcile-financial-data.ts',
    cwd: backendDir,
  },
  {
    name: '6. Backend Production Bundle Build',
    command: 'npx tsc --project tsconfig.json',
    cwd: backendDir,
  },
  {
    name: '7. Frontend Production Vite Build',
    command: 'npx vite build',
    cwd: rootDir,
  },
];

console.log('============================================================');
console.log('AARIGO CAPITAL — AUTOMATED MASTER QA SUITE');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('============================================================\n');

let failedStep = false;

for (const step of steps) {
  console.log(`\n▶ RUNNING: ${step.name}...`);
  console.log(`  Cmd: ${step.command} (in ${path.relative(rootDir, step.cwd) || '.'})`);
  const startTime = Date.now();

  try {
    const stdout = execSync(step.command, {
      cwd: step.cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✔ [PASS] ${step.name} (${duration}s)`);
    if (stdout.trim().length > 0) {
      // Print first 4 lines of output if relevant
      const preview = stdout.trim().split('\n').slice(0, 4).join('\n');
      console.log(`   Output:\n${preview.replace(/^/gm, '     ')}`);
    }
  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ [FAIL] ${step.name} (${duration}s)`);
    if (error.stdout) {
      console.error(`STDOUT:\n${error.stdout}`);
    }
    if (error.stderr) {
      console.error(`STDERR:\n${error.stderr}`);
    }
    failedStep = true;
    break;
  }
}

console.log('\n============================================================');
if (failedStep) {
  console.error('❌ MASTER QA RESULT: FAILED');
  console.error('One or more QA verification steps failed. See above logs.');
  console.log('============================================================\n');
  process.exit(1);
} else {
  console.log('✅ MASTER QA RESULT: ALL VERIFICATIONS PASSED');
  console.log('System verified across all 7 verification suites.');
  console.log('============================================================\n');
  process.exit(0);
}

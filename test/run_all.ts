import { spawn } from 'node:child_process';

const testFiles = [
  'test/bounds_and_math.test.ts',
  'test/hit_testing.test.ts',
  'test/resize_and_scaling.test.ts',
  'test/grouping_and_hierarchy.test.ts',
  'test/arrow_snapping.test.ts',
  'test/clipboard_and_history.test.ts',
  'test/edge_cases.test.ts',
];

console.log('====================================================');
console.log('🧪 RUNNING COMPLETE CANVAS FEATURE & EDGE TEST SUITE');
console.log('====================================================\n');

const child = spawn(
  'npx',
  ['tsx', '--test', ...testFiles],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  }
);

child.on('exit', (code) => {
  console.log(`\n====================================================`);
  if (code === 0) {
    console.log('✅ ALL TEST SUITES PASSED CLEANLY');
  } else {
    console.log(`❌ TEST SUITES EXITED WITH CODE ${code}`);
  }
  console.log('====================================================\n');
  process.exit(code || 0);
});

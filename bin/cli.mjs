#!/usr/bin/env node
import('../dist/cli.js').then(m => m.main(process.argv.slice(2))).catch(err => {
  console.error(err);
  process.exit(1);
});

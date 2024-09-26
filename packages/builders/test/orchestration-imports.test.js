import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import * as orch from '@agoric/orchestration';

test('@agoric/orchestration exports', t => {
  t.snapshot(orch);
});

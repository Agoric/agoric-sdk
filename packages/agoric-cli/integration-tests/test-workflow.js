// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { gettingStartedWorkflowTest } from '../tools/getting-started.js';

test('workflow', t =>
  gettingStartedWorkflowTest(t, { testUnsafePlugins: true }));

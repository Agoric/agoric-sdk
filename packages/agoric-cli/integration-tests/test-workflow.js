import test from '@endo/ses-ava/prepare-endo.js';

import { gettingStartedWorkflowTest } from '../tools/getting-started.js';

test('workflow', t =>
  gettingStartedWorkflowTest(t, { testUnsafePlugins: true }));

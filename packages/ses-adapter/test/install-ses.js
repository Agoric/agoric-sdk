import { lockdown } from 'ses';

lockdown({
  errorTaming: 'unsafe', // for debugging
  regExpTaming: 'unsafe', // for #230 and #237
});

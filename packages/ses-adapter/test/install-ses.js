import { lockdown } from 'ses';

lockdown({
  noTameError: true, // for debugging
  noTameRegExp: true, // for #230 and #237
});

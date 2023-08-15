/* eslint @typescript-eslint/no-floating-promises: "warn" */
/* global issueCommand */
(async () => {
  issueCommand(new TextEncoder().encode('Hello, World!').buffer);
})();

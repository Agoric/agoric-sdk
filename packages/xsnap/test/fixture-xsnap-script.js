/* eslint @typescript-eslint/no-floating-promises: "warn" */
/* global issueCommand */
void (async () => {
  issueCommand(new TextEncoder().encode('Hello, World!').buffer);
})();

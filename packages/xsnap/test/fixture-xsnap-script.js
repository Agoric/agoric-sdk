/* global issueCommand */
(async () => {
  issueCommand(new TextEncoder().encode('Hello, World!').buffer);
})();

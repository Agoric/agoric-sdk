/* global issueCommand */
void (async () => {
  issueCommand(new TextEncoder().encode('Hello, World!').buffer);
})();

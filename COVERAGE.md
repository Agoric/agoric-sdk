Coverage reports for the current main branch are published by CI to:
https://agoric-sdk-coverage.netlify.app

You can create a report in any package (including the top-level directory):

```sh
# Get options available for coverage:
yarn c8 --help
# Run ava under Node.js coverage and display a summary:
yarn c8 ava
# Generate a nice, detailed HTML report:
yarn c8 report --reporter=html-spa --reports-dir=coverage/html
open coverage/html/index.html
```

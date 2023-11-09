## Debugging Demos in VS Code

VS Code has a [debug
mode](https://code.visualstudio.com/Docs/editor/debugging) that allows
you to set breakpoints when running programs. In order to run the
demos in debug mode, add the following
to `.vscode/launch.json`. (The arguments can of course be changed to
run different versions of the demo):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run Left-Right Demo",
      "program": "${workspaceFolder}/bin/vat",
      "args": ["--no-ses",  "run", "demo/left-right"],
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Run Contract Host Demo",
      "program": "${workspaceFolder}/bin/vat",
      "args": [ "--no-ses", "run", "demo/contractHost", "--mint"],
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Run Bob Lies",
      "program": "${workspaceFolder}/bin/vat",
      "args": [ "--no-ses", "run", "demo/contractHost", "--bob-first-lies"],
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Shell Left Right Demo",
      "program": "${workspaceFolder}/bin/vat",
      "args": ["--no-ses", "shell", "demo/left-right"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "skipFiles": [
        "${workspaceFolder}/node_modules/**/*.js",
        "<node_internals>/**/*.js"
      ]
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Shell ContractHost Demo",
      "program": "${workspaceFolder}/bin/vat",
      "args": ["--no-ses", "shell", "demo/contractHost", "--mint"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "skipFiles": [
        "${workspaceFolder}/node_modules/**/*.js",
        "<node_internals>/**/*.js"
      ]
    }
  ]
}

```

This last option runs the `shell` command that creates a repl that can
be stepped through. This will show up in integrated terminal, whereas
the other debug configurations will just log to the debug console.

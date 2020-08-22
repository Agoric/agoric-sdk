export default {
    "files": [
      "test/**/test-*"
    ],
    "concurrency": 12,
    "failFast": false,
    "failWithoutAssertions": true,
    "environmentVariables": {
      "MY_ENVIRONMENT_VARIABLE": "some value"
    },
    "verbose": false,
    "require": [
      "esm"
    ],
    "nodeArguments": [
      "--trace-deprecation",
      "--napi-modules"
    ]
  };
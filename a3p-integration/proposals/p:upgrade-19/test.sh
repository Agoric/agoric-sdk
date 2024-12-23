#!/bin/bash

yarn ava terminateGovernor.test.js
yarn ava replaceFeeDistributor.test.js
yarn ava mintHolder.test.js
yarn ava provisionPool.test.js

yarn ava agoricNames.test.js

yarn ava assetReserve.test.js

yarn ava registry.test.js

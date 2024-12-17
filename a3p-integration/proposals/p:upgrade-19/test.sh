#!/bin/bash

yarn ava replaceFeeDistributor.test.js
yarn ava upgradedBoard.test.js
yarn ava mintHolder.test.js
yarn ava provisionPool.test.js

yarn ava agoricNames.test.js

yarn ava assetReserve.test.js

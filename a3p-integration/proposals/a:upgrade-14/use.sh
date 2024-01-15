#!/bin/bash

# UNTIl this is upstream https://github.com/Agoric/agoric-3-proposals/issues/40
# Set to zero so tests don't have to pay gas (we're not testing that)
sed --in-place=.bak s/'minimum-gas-prices = ""'/'minimum-gas-prices = "0ubld,0uist"'/ ~/.agoric/config/app.toml

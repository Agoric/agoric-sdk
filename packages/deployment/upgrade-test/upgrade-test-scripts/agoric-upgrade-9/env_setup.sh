#!/bin/bash

# agoric-upgrade-10 specific env here...
export USER2ADDR=$($binary keys show user2 -a --keyring-backend="test" 2> /dev/null)

printKeys() {
  echo "========== GOVERNANCE KEYS =========="
  echo "gov1: $GOV1ADDR"
  cat ~/.agoric/gov1.key || true
  echo "gov2: $GOV2ADDR"
  cat ~/.agoric/gov2.key || true
  echo "gov3: $GOV3ADDR"
  cat ~/.agoric/gov3.key || true
  echo "validator: $VALIDATORADDR"
  cat ~/.agoric/validator.key || true
  echo "user1: $USER1ADDR"
  cat ~/.agoric/user1.key || true
  echo "user2: $USER2ADDR"
  cat ~/.agoric/user2.key || true
  echo "========== GOVERNANCE KEYS =========="
}
#!/bin/bash
set -ueo pipefail

for proposal in ./proposals/?:*
do
  cd $proposal
  yarn run build:submission
  cd -
done

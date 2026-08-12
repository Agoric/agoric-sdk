#! /bin/bash
# Collects metadata from YDS into local JSON files.
# Usage: $0 [yds_url]

YDS_URL=${1:-'https://dev0.ymax.app'}
curl -X 'GET' \
  "$YDS_URL/instruments?includeAll=true" \
  -H 'accept: application/json' > ,instruments.json
curl -X 'GET' \
  "$YDS_URL/reward-token-rates" \
  -H 'accept: application/json' > ,reward-token-rates.json
echo 'created ,instruments.json'
echo 'created ,reward-token-rates.json'

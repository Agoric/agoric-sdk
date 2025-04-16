BASE_DENOM="uatom"
CHANNEL_ID=$(
  ./find_ibc_channel.sh 2>/dev/null | grep -oE 'channel-[0-9]+$'
)
echo -n "transfer/${CHANNEL_ID}/${BASE_DENOM}" | shasum -a 256 | cut -d ' ' -f1 | tr a-z A-Z | awk '{print "ibc/" $1}'

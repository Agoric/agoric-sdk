const signingOpts = ['--from='];
const broadcastOpts = ['--broadcast-mode=', '-y', '--yes'];
const nonGenerateOpts = [
  ...signingOpts.filter(opt => opt !== '--from='),
  ...broadcastOpts,
];

/**
 * Implement https://github.com/Agoric/agoric-sdk/issues/9016#issuecomment-2018972368
 * to emulate --broadcast-mode=block for nobled versions that don't support it natively,
 * nor `nobled q wait-tx`, nor `nobled q event-query-tx-for`.
 *
 * @example
 *   ```js
 *   process.stdout.write(
 *     emulateBroadcastModeBlock('agd', [
 *       'tx',
 *       'bank',
 *       'send',
 *       'genesis',
 *       '"$(agd keys show -a validator)"',
 *       '123ubld',
 *       '--from=genesis',
 *       '--broadcast-mode=block',
 *       '-y'
 *     ]),
 *   );
 *   ```
 */
export const emulateBroadcastModeBlock = (cmd: string, args: string[]) => {
  return `\
set -e
unsigned=$(${cmd} ${args.filter(arg => !nonGenerateOpts.some(opt => arg.startsWith(opt))).join(' ')} --generate-only)
signed=$(echo "$unsigned" | ${cmd} tx sign ${args.filter(arg => signingOpts.some(opt => arg.startsWith(opt))).join(' ')} /dev/stdin)
(
  sig=$(echo "$signed" | jq -r '.signatures[0]')
  while sleep 2; do
    if out="$(${cmd} query tx --type=signature "$sig" 2>&1)"; then
      echo "$out"
      break
    fi
    echo "$out" | sed -ne '/^Usage:/q; p;'
    echo "tx $sig not found yet, retrying..."
  done
) &
echo "$signed" | ${cmd} tx broadcast /dev/stdin ${args.filter(arg => broadcastOpts.some(opt => arg.startsWith(opt))).join(' ')} > /dev/null
wait
`;
};

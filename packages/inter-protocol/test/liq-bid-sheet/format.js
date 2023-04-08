/**
 * @param {Amount} x
 * @returns {Amount & { brand: BoardRemote }}
 */
const asBoardRemote = x => {
  assert('getBoardId' in x.brand);
  // @ts-expect-error dynamic check
  return x;
};

/**
 * @param {AssetDescriptor[]} assets
 * @returns {(a: Amount & { brand: BoardRemote }) => [string, number | any[]]}
 */
const makeAmountFormatter = assets => amt => {
  const { brand, value } = amt;
  const asset = assets.find(a => a.brand === brand);
  if (!asset) return [brand.getBoardId(), Number(value)]; // don't crash
  const {
    displayInfo: { assetKind, decimalPlaces = 0 },
    issuerName,
  } = asset;
  switch (assetKind) {
    case 'nat':
      return [issuerName, Number(value) / 10 ** decimalPlaces];
    case 'set':
      assert(Array.isArray(value));
      if (value[0]?.handle?.iface?.includes('InvitationHandle')) {
        return [issuerName, value.map(v => v.description)];
      }
      return [issuerName, value];
    default:
      return [issuerName, [NaN]];
  }
};

/**
 * @param {{
 *   stdout: Pick<import('stream').Writable, 'write'>,
 *   logger: Pick<typeof console, 'warn'>,
 * }} io
 */
const makeTUI = ({ stdout, logger }) => {
  const show = (info, indent = false) =>
    stdout.write(
      `${JSON.stringify(info, bigintReplacer, indent ? 2 : undefined)}\n`,
    );

  return Object.freeze({
    show,
    warn: (...args) => logger.warn(...args),
  });
};
/** @typedef {ReturnType<makeTUI>} TUI */

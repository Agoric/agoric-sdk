/**
 * Test data for restoring PSM state.
 *
 * Taken from mainnet; for example, the 1st value comes from...
 *
 * `agd --node https://main.rpc.agoric.net:443 query vstorage data
 * published.agoricNames.brand -o json | jq .value`
 *
 * @type {[key: string, value: string][]}
 */
export const chainStorageEntries = [
  [
    'published.psm.IST.USDC_axl.governance',
    '{"blockHeight":"9004077","values":["{\\"body\\":\\"{\\\\\\"current\\\\\\":{\\\\\\"Electorate\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"invitation\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: Zoe Invitation brand\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":[{\\\\\\"description\\\\\\":\\\\\\"questionPoser\\\\\\",\\\\\\"handle\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: InvitationHandle\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"installation\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: BundleInstallation\\\\\\",\\\\\\"index\\\\\\":2},\\\\\\"instance\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: InstanceHandle\\\\\\",\\\\\\"index\\\\\\":3}}]}},\\\\\\"GiveMintedFee\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"ratio\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"denominator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: IST brand\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"10000\\\\\\"}},\\\\\\"numerator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}}}},\\\\\\"MintLimit\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"amount\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"1000000000000\\\\\\"}}},\\\\\\"WantMintedFee\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"ratio\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"denominator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"10000\\\\\\"}},\\\\\\"numerator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}}}}}}\\",\\"slots\\":[\\"board04016\\",\\"board00917\\",\\"board00218\\",\\"board0074\\",\\"board02314\\"]}"]}',
  ],
  [
    'published.psm.IST.USDC_axl.metrics',
    '{"blockHeight":"9555449","values":["{\\"body\\":\\"{\\\\\\"anchorPoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: USDC_axl brand\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"487464281410\\\\\\"}},\\\\\\"feePoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: IST brand\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}},\\\\\\"mintedPoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"487464281410\\\\\\"}},\\\\\\"totalAnchorProvided\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"4327825824427\\\\\\"}},\\\\\\"totalMintedProvided\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"4815290105837\\\\\\"}}}\\",\\"slots\\":[\\"board0223\\",\\"board02314\\"]}"]}',
  ],

  [
    'published.psm.IST.USDT_axl.governance',
    '{"blockHeight":"9174468","values":["{\\"body\\":\\"{\\\\\\"current\\\\\\":{\\\\\\"Electorate\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"invitation\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: Zoe Invitation brand\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":[{\\\\\\"description\\\\\\":\\\\\\"questionPoser\\\\\\",\\\\\\"handle\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: InvitationHandle\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"installation\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: BundleInstallation\\\\\\",\\\\\\"index\\\\\\":2},\\\\\\"instance\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: InstanceHandle\\\\\\",\\\\\\"index\\\\\\":3}}]}},\\\\\\"GiveMintedFee\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"ratio\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"denominator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: IST brand\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"10000\\\\\\"}},\\\\\\"numerator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}}}},\\\\\\"MintLimit\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"amount\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"650000000000\\\\\\"}}},\\\\\\"WantMintedFee\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"ratio\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"denominator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"10000\\\\\\"}},\\\\\\"numerator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}}}}}}\\",\\"slots\\":[\\"board04016\\",\\"board06120\\",\\"board00218\\",\\"board0074\\",\\"board02314\\"]}"]}',
  ],
  [
    'published.psm.IST.USDT_axl.metrics',
    '{"blockHeight":"9554534","values":["{\\"body\\":\\"{\\\\\\"anchorPoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: USDT_axl brand\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"12155727701\\\\\\"}},\\\\\\"feePoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: IST brand\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"58732736\\\\\\"}},\\\\\\"mintedPoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"12155727701\\\\\\"}},\\\\\\"totalAnchorProvided\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"301812236296\\\\\\"}},\\\\\\"totalMintedProvided\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"313967963997\\\\\\"}}}\\",\\"slots\\":[\\"board0188\\",\\"board02314\\"]}"]}',
  ],

  [
    'published.psm.IST.DAI_axl.governance',
    '{"blockHeight":"7739600","values":["{\\"body\\":\\"{\\\\\\"current\\\\\\":{\\\\\\"Electorate\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"invitation\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: Zoe Invitation brand\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":[{\\\\\\"description\\\\\\":\\\\\\"questionPoser\\\\\\",\\\\\\"handle\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: InvitationHandle\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"installation\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: BundleInstallation\\\\\\",\\\\\\"index\\\\\\":2},\\\\\\"instance\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: InstanceHandle\\\\\\",\\\\\\"index\\\\\\":3}}]}},\\\\\\"GiveMintedFee\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"ratio\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"denominator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: IST brand\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"10000\\\\\\"}},\\\\\\"numerator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}}}},\\\\\\"MintLimit\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"amount\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"1100000000000\\\\\\"}}},\\\\\\"WantMintedFee\\\\\\":{\\\\\\"type\\\\\\":\\\\\\"ratio\\\\\\",\\\\\\"value\\\\\\":{\\\\\\"denominator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"10000\\\\\\"}},\\\\\\"numerator\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":4},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}}}}}}\\",\\"slots\\":[\\"board04016\\",\\"board01759\\",\\"board00218\\",\\"board0074\\",\\"board02314\\"]}"]}',
  ],
  [
    'published.psm.IST.DAI_axl.metrics',
    '{"blockHeight":"9555443","values":["{\\"body\\":\\"{\\\\\\"anchorPoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: DAI_axl brand\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"100064908627531159731648\\\\\\"}},\\\\\\"feePoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"iface\\\\\\":\\\\\\"Alleged: IST brand\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"0\\\\\\"}},\\\\\\"mintedPoolBalance\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"100064908610\\\\\\"}},\\\\\\"totalAnchorProvided\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":0},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"329326452472000000000000\\\\\\"}},\\\\\\"totalMintedProvided\\\\\\":{\\\\\\"brand\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"slot\\\\\\",\\\\\\"index\\\\\\":1},\\\\\\"value\\\\\\":{\\\\\\"@qclass\\\\\\":\\\\\\"bigint\\\\\\",\\\\\\"digits\\\\\\":\\\\\\"429391361082\\\\\\"}}}\\",\\"slots\\":[\\"board02656\\",\\"board02314\\"]}"]}',
  ],
];

/**
 * Sample of what appears in chain config file
 *
 * @type {AnchorOptions[]}
 */
export const anchorAssets = [
  {
    keyword: 'USDC_axl',
    proposedName: 'USD Coin',
    decimalPlaces: 6,
    denom: 'ibc/toyusdc',
  },
  {
    keyword: 'USDT_axl',
    proposedName: 'Tether USD',
    decimalPlaces: 6,
    denom:
      'ibc/F2331645B9683116188EF36FC04A809C28BD36B54555E8705A37146D0182F045',
  },
  {
    keyword: 'DAI_axl',
    proposedName: 'DAI',
    decimalPlaces: 18,
    denom:
      'ibc/3914BDEF46F429A26917E4D8D434620EC4817DC6B6E68FB327E190902F1E9242',
  },
];

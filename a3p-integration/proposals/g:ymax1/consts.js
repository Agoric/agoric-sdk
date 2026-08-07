// @ts-check
export const ymax0ControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';
export const ymax1ControlAddr = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';

// Must be the bundle used in the `use-invitation.js` of a3p 106.
export const ymax0BundleId =
  'b1-078729b9683de5f81afe8b14bd163f0165b8dd803f587413df8dff76b557d56e5d0d67f8f654bc920b5bb3a734d7d7644791692efbbc08c08984e37c6e0e6c88';

// The ymax-v0.3.2605-beta1 release bundle installed by eval.sh.
export const ymax1BundleId =
  'b1-03d5ff17d1f29f8d1993525d0a9e82e6cd74b117a64cff64d3ca7e246bc69428d8e7d6947b69ee6bf37c024d16920490e684f83f263d6fed0c6ba875d57bf621';

// Release upgrade overrides rely on the existing instance's asset metadata.
// A fresh synthetic instance needs the subset used to register BLD and USDC.
export const syntheticAssetInfo = [
  [
    'ubld',
    {
      baseDenom: 'ubld',
      baseName: 'agoric',
      brandKey: 'BLD',
      chainName: 'agoric',
    },
  ],
  [
    'ibc/AD211FEDD6DF0EDA18873D4E2A49972759BD761D96C3BBD9D6731FDC3F948F93',
    {
      baseDenom: 'ubld',
      baseName: 'agoric',
      chainName: 'axelar',
    },
  ],
  [
    'ibc/3C01172339ABAE4EAF1EB56FE9A69B7C818601FF9252E7DD633C14B165113C6B',
    {
      baseDenom: 'ubld',
      baseName: 'agoric',
      chainName: 'noble',
    },
  ],
  [
    'uusdc',
    {
      baseDenom: 'uusdc',
      baseName: 'noble',
      chainName: 'noble',
    },
  ],
  [
    'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
    {
      baseDenom: 'uusdc',
      baseName: 'noble',
      brandKey: 'USDC',
      chainName: 'agoric',
    },
  ],
];

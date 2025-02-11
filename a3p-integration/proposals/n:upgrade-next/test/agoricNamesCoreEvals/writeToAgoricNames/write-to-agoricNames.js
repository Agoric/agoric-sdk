// @ts-nocheck
/* eslint-disable no-undef */
const writeToAgoricNames = async powers => {
  const {
    consume: { agoricNamesAdmin },
  } = powers;

  console.log('writing to agoricNames...');
  const agoricNamesChildren = [
    'brand',
    'installation',
    'instance',
    'issuer',
    'oracleBrand',
    'vbankAsset',
  ];

  await Promise.all(
    agoricNamesChildren.map(async (child, index) =>
      E(E(agoricNamesAdmin).lookupAdmin(child)).update(
        `test${child}`,
        Far(`test${child}`, { getBoardId: () => `board${index}` }),
      ),
    ),
  );

  console.log('DONE');
};

writeToAgoricNames;

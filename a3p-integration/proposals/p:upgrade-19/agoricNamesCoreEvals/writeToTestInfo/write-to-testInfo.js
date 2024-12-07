// @ts-nocheck
/* eslint-disable no-undef */
const writeToTestInfo = async powers => {
  const {
    consume: { agoricNamesAdmin },
  } = powers;

  console.log('writing to testInfo...');

  E(E(agoricNamesAdmin).lookupAdmin('testInfo')).update('ethereum', {
    isAwesome: 'yes',
    tech: ['Solidity', 'EVM'],
  });

  console.log('DONE');
};

writeToTestInfo;

// https://developers.google.com/apps-script/reference/utilities/utilities?hl=en#base64Decode(String)

// decode base64 to string
const atob = encoded => {
  const decoded = Utilities.base64Decode(encoded);
  return Utilities.newBlob(decoded).getDataAsString();
};

/** WARNING: ambient */
const theWeb = origin => {
  const getJSON = url => {
    const text = UrlFetchApp.fetch(origin + url);
    return JSON.parse(text);
  };
  return { getJSON };
};

const fromBoard = makeFromBoard(); // WARNING: global mutable state

const simpleWalletState = async (addr, origin) => {
  const state = await getWalletState(addr, fromBoard, theWeb(origin));
  return [
    ...simplePurseBalances(state.purses).map(([val, brand]) => [
      'purse',
      val,
      brand,
    ]),
    ...simpleOffers(state),
  ];
};

const testSimpleWalletState = async () => {
  const simple = await simpleWalletState(
    'agoric1ggkanx6sv492tr3j2j4lf8kvlw9vtutwgr2fhn',
  );
  console.log(simple);
};

function votingPower() {
  const stuff = UrlFetchApp.fetch('https://ollinet.rpc.agoric.net/status?');
  const data = JSON.parse(stuff);

  console.log('is this thing on?', data);
  return data.result.validator_info.voting_power;
}

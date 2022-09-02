/* eslint-disable no-unused-vars */
/* global Utilities, UrlFetchApp */
// https://developers.google.com/apps-script/reference/utilities/utilities?hl=en#base64Decode(String)

// decode base64 to string
const atob = encoded => {
  const decoded = Utilities.base64Decode(encoded);
  return Utilities.newBlob(decoded).getDataAsString();
};

/**
 * WARNING: ambient
 *
 * @param {string} origin
 */
const theWeb = origin => {
  const getJSON = url => {
    const text = UrlFetchApp.fetch(origin + url);
    return JSON.parse(text);
  };
  return { getJSON };
};

const fromBoard = makeFromBoard(); // WARNING: global mutable state

const getContractEntries = async origin => {
  const { getJSON } = theWeb(origin);
  const agoricNames = await makeAgoricNames(fromBoard, getJSON);
  const { instance, governance: gov } = await getContractState(
    fromBoard,
    agoricNames,
    { getJSON },
  );
  return Object.entries({
    boardId: instance.boardId,
    WantStableFee: asPercent(gov.WantStableFee.value) / 100,
    GiveStableFee: asPercent(gov.GiveStableFee.value) / 100,
  });
};

const testContract = async () => {
  const origin = 'https://ollinet.rpc.agoric.net:443';
  const c = await getContractEntries(origin);
  console.log(c);
};

const simpleWalletState = async (addr, origin) => {
  const { getJSON } = theWeb(origin);
  const state = await getWalletState(addr, fromBoard, { getJSON });
  const agoricNames = await makeAgoricNames(fromBoard, getJSON);
  return [
    ...simplePurseBalances(state.purses).map(([val, brand]) => [
      'purse',
      val,
      brand,
    ]),
    ...simpleOffers(state, agoricNames),
  ];
};

const testSimpleWalletState = async () => {
  const simple = await simpleWalletState(
    'agoric1ggkanx6sv492tr3j2j4lf8kvlw9vtutwgr2fhn',
  );
  console.log(simple);
};

const offerAction = (direction, qty, fee, boardId, indent = 0) => {
  const id = Date.now();
  const offer = makePSMSpendAction(
    { boardId, feePct: fee * 100, [direction]: qty },
    id,
  );
  return JSON.stringify(offer, null, indent);
};

const testFormatOffer = () => {
  const offer = offerAction('wantStable', 10, 0.0001, 'board123', 2);
  console.log(offer);
};

const formatCommands = (action, fromAddr, node, chainId) => {
  const script = `read -r -d '' psmTrade <<'EOF'
${action}
EOF
agd tx swingset wallet-action --allow-spend "$psmTrade" --from ${fromAddr} --node=${node} --chain-id=${chainId}
`;
  return script;
};

function testFormatCommands() {
  const actual = formatCommands('{give}', 'agoric123', 'https://rpc');
  console.log(actual);
}

function votingPower() {
  const stuff = UrlFetchApp.fetch('https://ollinet.rpc.agoric.net/status?');
  const data = JSON.parse(stuff);

  console.log('is this thing on?', data);
  return data.result.validator_info.voting_power;
}

function updateClock(ref = 'A13') {
  const sheet = SpreadsheetApp.getActiveSheet();
  const t = new Date();
  sheet.getRange(ref).setValue(t);
}

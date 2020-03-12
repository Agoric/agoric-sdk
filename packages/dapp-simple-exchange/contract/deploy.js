// Agoric Dapp contract deployment script for myFirstDapp/simpleExchange
import fs from 'fs';

// This javascript source file uses the "tildot" syntax (foo~.bar()) for
// eventual sends. Tildot is standards track with TC39, the JavaScript standards
// committee.
// TODO: improve this comment. https://github.com/Agoric/agoric-sdk/issues/608

const DAPP_NAME = "simple-exchange";

export default async function deployContract(homeP, { bundleSource, pathResolve },
  CONTRACT_NAME = DAPP_NAME) {

  // Create a source bundle for the "myFirstDapp" smart contract.
  const { source, moduleFormat } = await bundleSource(pathResolve(`./${CONTRACT_NAME}.js`));

  // =====================
  // === AWAITING TURN ===
  // =====================

  const installationHandle = await homeP~.zoe~.install(source, moduleFormat);

  // =====================
  // === AWAITING TURN ===
  // =====================
  
  // 1. Issuers
  const wallet = homeP~.wallet;
  const [[pursePetname0], [pursePetname1]] = await wallet~.getPurses();
  const issuer0P = wallet~.getPurseIssuer(pursePetname0);
  const issuer1P = wallet~.getPurseIssuer(pursePetname1);

  const [
    issuer0,
    issuer1,
  ] = await Promise.all([
    issuer0P,
    issuer1P,
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 2. Contract instance.
  const [
    invite,
    inviteIssuer,
  ] = await Promise.all([
    homeP~.zoe~.makeInstance(installationHandle, { issuers: [issuer0, issuer1] }),
    homeP~.zoe~.getInviteIssuer(),
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  // 3. Get the instanceHandle

  const {
    extent: [{ instanceHandle }],
  } = await inviteIssuer~.getAmountOf(invite);

  // =====================
  // === AWAITING TURN ===
  // =====================

  const [contractId, instanceId] = await Promise.all([
    homeP~.registrar~.register(DAPP_NAME, installationHandle),
    homeP~.registrar~.register(CONTRACT_NAME, instanceHandle),
  ]);

  // =====================
  // === AWAITING TURN ===
  // =====================

  console.log('- installation made', CONTRACT_NAME, '=>',  contractId);
  console.log('- instance made', CONTRACT_NAME, '=>', instanceId);

  // Save the instanceId somewhere where the UI can find it.
  if (instanceId) {
    const dappConstants = {
      BRIDGE_URL: 'agoric-lookup:https://local.agoric.com?append=/bridge',
      API_URL: '/',
      CONTRACT_ID: instanceId,
    };
    const dc = 'dappConstants.js';
    console.log('writing', dc);
    await fs.promises.writeFile(dc, `globalThis.__DAPP_CONSTANTS__ = ${JSON.stringify(dappConstants, undefined, 2)}`);

    // Now add URLs so that development functions without internet access.
    dappConstants.BRIDGE_URL = "http://127.0.0.1:8000";
    dappConstants.API_URL = "http://127.0.0.1:8000";
    const envFile = pathResolve(`../ui/.env.local`);
    console.log('writing', envFile);
    const envContents = `\
  REACT_APP_DAPP_CONSTANTS_JSON='${JSON.stringify(dappConstants)}'
`;
    await fs.promises.writeFile(envFile, envContents);
  }
}

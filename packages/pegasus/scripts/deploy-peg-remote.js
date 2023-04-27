import { E } from '@endo/far';
import deployConfig from './deploy-config.js';

const deployPegRemote = async homeP => {
  const {
    wallet,
    pegasusConnections,
    board,
    scratch,
    agoricNames,
    zoe
  } = E.get(homeP);

  const {
    cosmos: {
      remoteAsset
    }
  } = deployConfig;

  assert(pegasusConnections, `pegasusConnections power missing`);
  console.log('Awaiting pegasusConnections...');
  const connections = await E(pegasusConnections).entries();
  assert(connections.length > 0, `pegasusConnections nameHub is empty`);
  console.log('pegasusConnections:', connections.length);
  const [_, connection] = connections.find(([a, _c]) =>
    a.endsWith(deployConfig.agoric.channel),
  );

  const {
    actions
  } = connection;

  console.log('Creating a remote peg for Samoleans...');
  const samoleansPeg = await E(actions).pegRemote(
    remoteAsset.keyword,
    remoteAsset.denom,
    remoteAsset.assetKind,
    remoteAsset.displayInfo,
  );

  console.log('Writing the samoleans peg to scratch...');
  const samoleansScratchId = await E(scratch).set(remoteAsset.pegId, samoleansPeg);
  console.log('Samoleans peg is successfully written to scratch with the id:', samoleansScratchId);

  console.log('Fetching the local issuer for samoleans...');
  const pegasusInstanceP = E(agoricNames).lookup('instance', 'Pegasus');
  const pegPF = E(zoe).getPublicFacet(pegasusInstanceP);

  const localBrand = await E(samoleansPeg).getLocalBrand();
  const localIssuer = await E(pegPF).getLocalIssuer(localBrand);

  console.log('Putting the local issuer to board...');
  const issuerBoardId = await E(board).getId(localIssuer);

  console.log('Suggesting the local issuer to walllet...');
  const walletB = E(wallet).getBridge();
  await E(walletB).suggestIssuer(
    remoteAsset.keyword,
    issuerBoardId,
  );

  console.log('Done.')
};

export default deployPegRemote;
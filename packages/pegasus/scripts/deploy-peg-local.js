import { E } from '@endo/far';
import deployConfig from './deploy-config.js';

const deployPegLocal = async homeP => {
  const {
    zoe,
    pegasusConnections,
    scratch
  } = E.get(homeP);

  assert(pegasusConnections, `pegasusConnections power missing`);
  console.log('Awaiting pegasusConnections...');
  const connections = await E(pegasusConnections).entries();
  assert(connections.length > 0, `pegasusConnections nameHub is empty`);
  console.log('PegasusConnections:', connections.length);

  const [_, connection] = connections.find(([a, _c]) =>
    a.endsWith(deployConfig.agoric.channel),
  );

  const {
    actions
  } = connection;

  console.log('Requesting IST information from Zoe...');
  const istIsuuerP = E(zoe).getFeeIssuer();
  const [istIssuer, istAllegedName] = await Promise.all([
    istIsuuerP,
    E(istIsuuerP).getAllegedName()
  ]);

  console.log('Creating a local peg for IST...');
  const istPeg = await E(actions).pegLocal(istAllegedName, istIssuer);

  console.log('Writing the local peg to scratch...');
  const localPegId = await E(scratch).set(deployConfig.agoric.localPegId, istPeg);

  console.log('IST peg is successfully written to scratch with the id:', localPegId);
};

export default deployPegLocal;
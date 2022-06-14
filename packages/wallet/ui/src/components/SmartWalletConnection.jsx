import {
  iterateLatest,
  makeFollower,
  makeLeader,
  makeCastingSpec,
} from '@agoric/casting';

import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import { withApplicationContext } from '../contexts/Application';
import { suggestChain } from '../util/SuggestChain';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const DEFAULT_WALLET_CASTING_SPEC =
  ':published.wallet.agoric1t7pdlnwwzf3yd62zajwpt7qc9ylz7dqs8x3zqd';
const SmartWalletConnection = ({ walletConnection }) => {
  const [snackbarMessage, setSnackbarMessage] = useState(null);

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessage(null);
  };

  const showError = (message, e) => {
    if (e) {
      console.error(`${message}:`, e);
      message += `: ${e.message}`;
    }
    setSnackbarMessage(message);
  };
  const showReadOnlyError = (message, e) =>
    showError(`READ-ONLY: ${message} for write access`, e);

  useEffect(() => {
    if (!walletConnection) {
      return () => {};
    }
    let outdated;

    const followWallet = async () => {
      // TODO: Persist this in localStorage from settings page.
      const { url, walletSpec = DEFAULT_WALLET_CASTING_SPEC } =
        walletConnection;

      const leader = makeLeader(url);
      const castingSpec = makeCastingSpec(walletSpec);
      const follower = makeFollower(leader, castingSpec);

      for await (const { value } of iterateLatest(follower)) {
        if (outdated) {
          return;
        }
        console.log(`here's a mailbox value`, value);
      }
      throw Error(`unexpected end of ${walletSpec} follower`);
    };
    followWallet().catch(e =>
      showError('Cannot read Smart Wallet state casting', e),
    );

    return () => {
      outdated = true;
    };
  }, [walletConnection]);

  useEffect(() => {
    if (!walletConnection || true) {
      return () => {};
    }
    let outdated;
    const connect = async () => {
      if (!window.getOfflineSigner || !window.keplr) {
        showReadOnlyError('Please install the Keplr extension');
      } else if (window.keplr.experimentalSuggestChain) {
        try {
          const client = await suggestChain(walletConnection.url);
          console.log('got stargate client', client);

          // TODO: Would enable Keplr for transacting the Agoric client.
          showReadOnlyError('Would enable transaction manager');
        } catch (e) {
          if (!outdated) {
            showReadOnlyError('Failed to connect to Keplr', e);
          }
        }
      } else {
        showReadOnlyError(
          'Please use the most recent version of the Keplr extension',
        );
      }
    };
    connect().catch(e => showReadOnlyError('Failed to connect to Keplr', e));

    return () => {
      outdated = true;
    };
  }, [walletConnection]);

  return (
    <div>
      <Snackbar open={snackbarMessage !== null} onClose={handleSnackbarClose}>
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default withApplicationContext(SmartWalletConnection, context => ({
  walletConnection: context.walletConnection,
  setConnectionState: context.setConnectionState,
  setWantConnection: context.setWantConnection,
}));

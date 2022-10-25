import { makeFollower, makeLeader } from '@agoric/casting';
import { observeIterator } from '@agoric/notifier';
import { NO_SMART_WALLET_ERROR } from '@agoric/smart-wallet/src/utils';
import { makeImportContext } from '@agoric/wallet/api/src/marshal-contexts';
import { Far } from '@endo/marshal';
import MuiAlert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import React, { useEffect, useState, useMemo } from 'react';
import { DEFAULT_CONNECTION_CONFIGS } from '../util/connections';
import { maybeSave } from '../util/storage';

import {
  ConnectionStatus,
  withApplicationContext,
} from '../contexts/Application';
import {
  makeBackendFromWalletBridge,
  makeWalletBridgeFromFollowers,
} from '../util/WalletBackendAdapter';
import ProvisionDialog from './ProvisionDialog';

const Alert = React.forwardRef(function Alert({ children, ...props }, ref) {
  return (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props}>
      {children}
    </MuiAlert>
  );
});

/**
 * Wallet UI doesn't use objects as presences, only as identities.
 * Use this to override the defaultMakePresence of makeImportContext.
 *
 * @param {string} iface
 */
const inertPresence = iface => Far(iface.replace(/^Alleged: /, ''), {});

const SmartWalletConnection = ({
  connectionConfig,
  setConnectionStatus,
  setBackend,
  setBackendErrorHandler,
  keplrConnection,
  allConnectionConfigs,
  tryKeplrConnect,
}) => {
  const [snackbarMessages, setSnackbarMessages] = useState([]);
  const [provisionDialogOpen, setProvisionDialogOpen] = useState(false);

  const onProvisionDialogClose = () => {
    setProvisionDialogOpen(false);
  };

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessages(sm => sm.slice(1));
  };

  const showError = (message, e, severity = 'error') => {
    if (e) {
      console.error(`${message}:`, e);
      message += `: ${e.message}`;
    }
    if (severity === 'error') {
      setConnectionStatus(ConnectionStatus.Error);
    }
    setSnackbarMessages(sm => [...sm, { severity, message }]);
  };

  const { href } = connectionConfig;

  const publicAddress = (() => {
    if (keplrConnection) {
      return keplrConnection.address;
    }
    return undefined;
  })();

  const backendError = e => {
    if (e.message === NO_SMART_WALLET_ERROR) {
      setProvisionDialogOpen(true);
      setConnectionStatus(ConnectionStatus.Error);
    } else {
      setBackend(null);
      showError('Error in wallet backend', e);
    }
  };

  const [context, leader] = useMemo(
    () => [makeImportContext(inertPresence), makeLeader(href)],
    [connectionConfig, keplrConnection],
  );

  useEffect(() => {
    maybeSave('connectionConfig', connectionConfig);

    const updatedConnectionConfigs = [];

    for (const config of allConnectionConfigs) {
      const found = DEFAULT_CONNECTION_CONFIGS.find(
        defaultConfig => defaultConfig.href === config.href,
      );
      if (!found) {
        updatedConnectionConfigs.push(config);
      }
    }
    maybeSave('userConnectionConfigs', updatedConnectionConfigs);

    if (connectionConfig) {
      tryKeplrConnect().catch(reason => {
        console.error('tryKeplrConnect failed', reason);
        setConnectionStatus(ConnectionStatus.Error);
      });
    }
  }, [connectionConfig]);

  useEffect(() => {
    if (!connectionConfig || !keplrConnection) {
      return undefined;
    }

    let cancelIterator;

    const follow = async () => {
      const followPublished = path =>
        makeFollower(`:published.${path}`, leader, {
          unserializer: context.fromMyWallet,
        });
      const bridge = makeWalletBridgeFromFollowers(
        { chainId: keplrConnection.chainId, address: publicAddress },
        context.fromBoard,
        followPublished(`wallet.${publicAddress}.current`),
        followPublished(`wallet.${publicAddress}`),
        keplrConnection,
        backendError,
        () => {
          setConnectionStatus(ConnectionStatus.Connected);
          setProvisionDialogOpen(false);
        },
      );
      const { backendIt, cancel } = makeBackendFromWalletBridge(bridge);
      cancelIterator = cancel;
      // Need to thunk the error handler, or it gets called immediately.
      setBackendErrorHandler(() => backendError);
      return observeIterator(backendIt, {
        updateState: be => {
          cancelIterator && setBackend(be);
        },
        fail: e => {
          cancelIterator && backendError(e);
        },
        finish: be => {
          cancelIterator && setBackend(be);
        },
      });
    };
    follow().catch(e => showError('Cannot read Smart Wallet casting', e));

    return () => {
      cancelIterator && cancelIterator();
      cancelIterator = undefined;
    };
  }, [connectionConfig, keplrConnection]);

  return (
    <div>
      <Snackbar open={snackbarMessages.length > 0}>
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarMessages[0]?.severity}
          sx={{ width: '100%' }}
        >
          {snackbarMessages[0]?.message}
        </Alert>
      </Snackbar>
      <ProvisionDialog
        open={provisionDialogOpen}
        onClose={onProvisionDialogClose}
        address={publicAddress}
        href={href}
        unserializer={context.fromBoard}
        leader={leader}
      />
    </div>
  );
};

export default withApplicationContext(SmartWalletConnection, context => ({
  connectionConfig: context.connectionConfig,
  setConnectionStatus: context.setConnectionStatus,
  setBackend: context.setBackend,
  setBackendErrorHandler: context.setBackendErrorHandler,
  keplrConnection: context.keplrConnection,
  allConnectionConfigs: context.allConnectionConfigs,
  tryKeplrConnect: context.tryKeplrConnect,
}));

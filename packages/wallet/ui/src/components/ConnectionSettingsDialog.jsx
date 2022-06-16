import { useEffect, useState, useCallback } from 'react';
import { makeStyles } from '@mui/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
// import DialogContentText from '@mui/material/DialogContentText';

import DialogActions from '@mui/material/DialogActions';
import { withApplicationContext } from '../contexts/Application';
import { DEFAULT_WALLET_CONNECTIONS, WalletBackend } from '../util/connections';

const useStyles = makeStyles(_ => ({
  centeredText: {
    textAlign: 'center',
  },
  dialog: {
    minWidth: 240,
  },
}));

const connectionValue = formValue => {
  if (typeof formValue === 'string' && formValue) {
    return {
      label: formValue,
    };
  } else if (formValue?.inputValue) {
    return {
      label: formValue.inputValue,
    };
  } else {
    return formValue;
  }
};

const dedupe = conns => {
  const seen = new Set();
  return conns.filter(conn => {
    const isNew = !seen.has(conn.label);
    seen.add(conn.label);
    return isNew;
  });
};

const ConnectionSettingsDialog = ({
  onClose,
  open,
  disconnect,
  walletConnection,
  setWalletConnection,
  allWalletConnections, // TODO: savedWalletConnections.
  setAllWalletConnections,
}) => {
  const classes = useStyles();
  const [conns, setConns] = useState(
    dedupe([...allWalletConnections, ...DEFAULT_WALLET_CONNECTIONS]),
  );
  const [connection, setConnection] = useState(walletConnection || conns[0]);

  const isSmartWallet = conn => !conn || conn.backend === WalletBackend.Smart;

  const save = () => {
    setWalletConnection(connection);
    let found = false;
    const newConns = conns.flatMap(conn => {
      if (conn.label === connection.label) {
        found = true;
        return [connection];
      }
      const ents = Object.entries(conn);
      const isDefault = DEFAULT_WALLET_CONNECTIONS.find(c => {
        return (
          Object.keys(c).length === ents.length &&
          ents.every(([k, v]) => c[k] === v)
        );
      });
      return isDefault ? [] : [conn];
    });
    if (!found) {
      newConns.unshift(connection);
    }
    setAllWalletConnections(newConns);
  };

  const saveAndClose = () => {
    save();
    disconnect(true);
    onClose();
  };

  const handleCancel = useCallback(() => {
    setConnection(
      walletConnection ||
        allWalletConnections?.[0] ||
        DEFAULT_WALLET_CONNECTIONS[0],
    );
    onClose();
  }, [walletConnection]);

  useEffect(() => {
    if (walletConnection) {
      setConnection(walletConnection || allWalletConnections[0]);
    }
  }, [walletConnection]);

  useEffect(() => {
    setConns(dedupe([...allWalletConnections, ...DEFAULT_WALLET_CONNECTIONS]));
  }, [allWalletConnections]);

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogTitle className={classes.centeredText}>
        Connection Settings
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <Autocomplete
              value={connection}
              id="connection-profile"
              label="Profile name"
              options={conns}
              sx={{ width: 300 }}
              onChange={(ev, newValue) =>
                setConnection(connectionValue(newValue))
              }
              filterOptions={(options, params) => {
                const { inputValue } = params;
                const isExisting = options.some(
                  option => inputValue === option.label,
                );
                if (inputValue && !isExisting) {
                  const newValue = {
                    inputValue,
                    label: `Add "${inputValue}"...`,
                  };
                  options.unshift(newValue);
                }
                return options;
              }}
              renderOption={(props, option) => (
                <li {...props}>{option.label}</li>
              )}
              getOptionLabel={option => option.label || ''}
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              renderInput={params => (
                <TextField {...params} placeholder="Custom Profile" />
              )}
            />
          </FormControl>

          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <InputLabel id="connection-backend-label">
              Wallet Backend type
            </InputLabel>
            <Select
              labelId="connection-backend-label"
              value={connection?.backend}
              id="connection-backend"
              label="Wallet Backend type"
              onChange={e =>
                setConnection({
                  ...connection,
                  backend: e.target.value,
                })
              }
            >
              <MenuItem value={WalletBackend.Smart}>Smart Wallet</MenuItem>
              <MenuItem value={WalletBackend.Solo}>Standalone</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <TextField
              value={(connection && connection.url) || ''}
              id="connection-url"
              label="Wallet Backend URL"
              onChange={e =>
                setConnection({
                  ...connection,
                  url: e.target.value,
                })
              }
              placeholder="https://..."
            />
          </FormControl>
          {connection && isSmartWallet(connection) && (
            <FormControl sx={{ m: 1, minWidth: 120 }}>
              <TextField
                value={(connection && connection.smartWalletAddress) || ''}
                id="smart-wallet-address"
                label="Smart Wallet address"
                onChange={e =>
                  setConnection({
                    ...connection,
                    smartWalletAddress: e.target.value,
                  })
                }
                placeholder="agoric1..."
              />
            </FormControl>
          )}
          {connection && !isSmartWallet(connection) && (
            <FormControl sx={{ m: 1, minWidth: 120 }}>
              <TextField
                value={(connection && connection.accessToken) || ''}
                id="access-token"
                label="Access token"
                onChange={e =>
                  setConnection({
                    ...connection,
                    accessToken: e.target.value,
                  })
                }
                placeholder="token from agoric open --no-browser"
              />
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={save}>Save</Button>
        <Button onClick={saveAndClose}>OK</Button>
      </DialogActions>
    </Dialog>
  );
};

export default withApplicationContext(ConnectionSettingsDialog, context => ({
  disconnect: context.disconnect,
  walletAddress: context.walletAddress,
  setWalletAddress: context.setWalletAddress,
  walletConnection: context.walletConnection,
  setWalletConnection: context.setWalletConnection,
  allWalletConnections: context.allWalletConnections,
  setAllWalletConnections: context.setAllWalletConnections,
}));

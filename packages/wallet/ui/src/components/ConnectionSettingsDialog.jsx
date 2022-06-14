import { useState } from 'react';
import { makeStyles } from '@mui/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
// import DialogContentText from '@mui/material/DialogContentText';

import DialogActions from '@mui/material/DialogActions';
import { withApplicationContext } from '../contexts/Application';

const connectionValue = formValue => {
  if (typeof formValue === 'string') {
    return {
      url: new URL(formValue, window.location.href),
      label: formValue,
    };
  } else if (formValue?.inputValue) {
    return {
      url: new URL(formValue.inputValue, window.location.href),
      label: formValue.inputValue,
    };
  } else {
    return formValue;
  }
};

const useStyles = makeStyles(_ => ({
  centeredText: {
    textAlign: 'center',
  },
  dialog: {
    minWidth: 240,
  },
}));

const ConnectionSettingsDialog = ({
  onClose,
  open,
  disconnect,
  walletConnection,
  setWalletConnection,
  allWalletConnections,
}) => {
  const classes = useStyles();
  const [connection, setConnection] = useState(walletConnection);

  const isSmartWallet = conn => conn && /\/network-config/.test(conn.url);

  const saveAndClose = () => {
    if (connection) {
      setWalletConnection(connection);
      disconnect(true);
    }
    onClose();
  };

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
              id="connection"
              options={allWalletConnections}
              sx={{ width: 300 }}
              onChange={(_, newValue) =>
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
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              freeSolo
              renderInput={params => (
                <TextField {...params} label="Wallet connection" />
              )}
            />
          </FormControl>
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            <TextField
              disabled={!isSmartWallet(connection)}
              value={(connection && connection.smartWalletAddress) || ''}
              id="address"
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={saveAndClose}
          disabled={connection === walletConnection}
        >
          Apply
        </Button>
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

import { useState } from 'react';
import { makeStyles } from '@mui/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
// import DialogContentText from '@mui/material/DialogContentText';

import DialogActions from '@mui/material/DialogActions';
import { withApplicationContext } from '../contexts/Application';

const connectionValue = formValue => {
  if (typeof formValue === 'string') {
    return {
      url: formValue,
      label: formValue,
    };
  } else if (formValue?.inputValue) {
    return {
      url: formValue.inputValue,
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
  setAllWalletConnections,
}) => {
  const classes = useStyles();
  const [connection, setConnection] = useState(walletConnection);

  const saveAndClose = () => {
    if (connection) {
      setWalletConnection(connection);
      disconnect(true);
      const isKnown = allWalletConnections.some(
        c => c.label === connection.label && c.url === connection.url,
      );
      if (!isKnown) {
        setAllWalletConnections(conns => [connection, ...conns]);
      }
    }
    onClose();
  };

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogTitle className={classes.centeredText}>
        Connection Settings
      </DialogTitle>
      <DialogContent>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <Autocomplete
            value={connection}
            id="connection"
            options={allWalletConnections}
            sx={{ width: 300 }}
            onChange={(_, newValue) => setConnection(connectionValue(newValue))}
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
            renderOption={(props, option) => <li {...props}>{option.label}</li>}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            renderInput={params => (
              <TextField {...params} label="Wallet connection" />
            )}
          />
        </FormControl>
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
  walletConnection: context.walletConnection,
  setWalletConnection: context.setWalletConnection,
  allWalletConnections: context.allWalletConnections,
  setAllWalletConnections: context.setAllWalletConnections,
}));

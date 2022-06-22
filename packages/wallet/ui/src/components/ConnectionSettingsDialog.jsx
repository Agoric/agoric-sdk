import { useState } from 'react';
import { makeStyles } from '@mui/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';

import DialogActions from '@mui/material/DialogActions';
import { withApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(_ => ({
  centeredText: {
    textAlign: 'center',
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
  let isValid;
  try {
    const url = new URL(connection);
    isValid = url !== undefined;
  } catch (e) {
    isValid = false;
  }

  const saveAndClose = () => {
    if (connection) {
      setWalletConnection(connection);
      disconnect(true);
      const isKnown = allWalletConnections.some(c => c === connection);
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
        <FormControl sx={{ m: 1 }}>
          <Autocomplete
            value={connection}
            id="connection"
            options={allWalletConnections}
            sx={{ width: 360, mb: 0.5 }}
            onChange={(_, newValue) => setConnection(newValue)}
            filterOptions={(options, params) => {
              const { inputValue } = params;
              const isExisting = options.some(option => inputValue === option);
              if (inputValue && !isExisting) {
                options.unshift(inputValue);
              }
              return options;
            }}
            renderOption={(props, option) => <li {...props}>{option}</li>}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            freeSolo
            renderInput={params => (
              <TextField {...params} label="Chain Config URL" />
            )}
          />
          {!isValid && (
            <Box
              sx={theme => ({
                color: theme.palette.error.main,
                fontSize: '14px',
                paddingLeft: '4px',
              })}
            >
              Select a valid URL
            </Box>
          )}
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button color="cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={saveAndClose}
          disabled={connection === walletConnection || !isValid}
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

import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';
import { useMemo, useState } from 'react';
import { withApplicationContext } from '../contexts/Application';
import { deepEquals } from '../util/DeepEquals';
import { maybeSave } from '../util/storage';

const useStyles = makeStyles(_ => ({
  centeredText: {
    textAlign: 'center',
  },
}));

const Errors = {
  INVALID_URL: 'invalid url',
  INVALID_ACCESS_TOKEN: 'invalid access token',
  INVALID_ADDRESS: 'invalid address',
};

const ErrorLabel = ({ children }) => {
  return (
    <Box
      sx={theme => ({
        color: theme.palette.error.main,
        fontSize: '14px',
        paddingLeft: '4px',
        height: '16px',
        ml: 1,
        mt: 0.5,
      })}
    >
      {children}
    </Box>
  );
};

const ConnectionSettingsDialog = ({
  onClose,
  open,
  disconnect,
  connectionConfig,
  setConnectionConfig,
  allConnectionConfigs,
  setAllConnectionConfigs,
  tryKeplrConnect,
}) => {
  const classes = useStyles();
  const smartConnectionHrefs = allConnectionConfigs.map(({ href }) => href);

  const [config, setConfig] = useState(connectionConfig || {});

  const errors = new Set();

  try {
    // eslint-disable-next-line no-unused-vars
    const url = new URL(config.href);
  } catch (e) {
    errors.add(Errors.INVALID_URL);
  }

  const hasChanges = useMemo(
    () => !deepEquals(config, connectionConfig),
    [config, connectionConfig],
  );

  const saveAndClose = () => {
    if (!hasChanges) {
      // Allow the user to force another retry to connect to Keplr without
      // reloading the page.
      tryKeplrConnect();
      onClose();
      return;
    }

    if (config) {
      if (config.accessToken) {
        maybeSave('accessToken', config.accessToken);
      }
      setConnectionConfig(config);
      disconnect(true);
      const { href, type } = config;
      const isKnown = allConnectionConfigs.some(
        c => c.href === href && c.type === type,
      );
      if (!isKnown) {
        setAllConnectionConfigs(conns => [{ href, type }, ...conns]);
      }
    }
    onClose();
  };

  const smartWalletConfigForm = (
    <>
      <Autocomplete
        value={config?.href}
        id="connection"
        options={smartConnectionHrefs}
        sx={{ width: 360, mt: 2 }}
        onChange={(_, newValue) =>
          setConfig(swConfig => ({
            ...swConfig,
            href: newValue,
          }))
        }
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
      <ErrorLabel>
        {errors.has(Errors.INVALID_URL) ? 'Enter a valid URL' : ''}
      </ErrorLabel>
    </>
  );

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogTitle className={classes.centeredText}>
        Connection Settings
      </DialogTitle>
      <DialogContent>{smartWalletConfigForm}</DialogContent>
      <DialogActions>
        <Button color="cancel" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={saveAndClose} disabled={errors.size > 0}>
          Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default withApplicationContext(ConnectionSettingsDialog, context => ({
  disconnect: context.disconnect,
  connectionConfig: context.connectionConfig,
  setConnectionConfig: context.setConnectionConfig,
  allConnectionConfigs: context.allConnectionConfigs,
  setAllConnectionConfigs: context.setAllConnectionConfigs,
  tryKeplrConnect: context.tryKeplrConnect,
}));

import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';
import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { deepEquals } from '../util/DeepEquals';
import { withApplicationContext } from '../contexts/Application';
import { SmartConnectionMethod } from '../util/connections';
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
  SMART_CONNECTION_METHOD_UNSPECIFIED: 'smart wallet connection unspecified',
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

  const [selectInputId] = useState(uuid());

  const errors = new Set();

  try {
    // eslint-disable-next-line no-unused-vars
    const url = new URL(config.href);
  } catch (e) {
    errors.add(Errors.INVALID_URL);
  }

  if (
    config.smartConnectionMethod === SmartConnectionMethod.READ_ONLY &&
    !config.publicAddress
  ) {
    errors.add(Errors.INVALID_ADDRESS);
  }
  if (config.smartConnectionMethod === undefined) {
    errors.add(Errors.SMART_CONNECTION_METHOD_UNSPECIFIED);
  }

  const hasChanges = useMemo(
    () => !deepEquals(config, connectionConfig),
    [config, connectionConfig],
  );

  const saveAndClose = () => {
    if (
      !hasChanges &&
      config.smartConnectionMethod === SmartConnectionMethod.KEPLR
    ) {
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
      <FormControl sx={{ mt: 2 }}>
        <InputLabel id={selectInputId}>Connection Method</InputLabel>
        <Select
          value={config.smartConnectionMethod}
          labelId={selectInputId}
          label="Connection Method"
          onChange={e => {
            const smartConnectionMethod = e.target.value;
            setConfig(swConfig => ({
              ...swConfig,
              smartConnectionMethod,
              publicAddress: undefined,
            }));
          }}
          error={errors.has(Errors.SMART_CONNECTION_METHOD_UNSPECIFIED)}
          sx={{ width: 360 }}
        >
          <MenuItem value={SmartConnectionMethod.KEPLR}>Keplr</MenuItem>
          <MenuItem value={SmartConnectionMethod.READ_ONLY}>
            Read-only Address
          </MenuItem>
        </Select>
        <ErrorLabel>
          {errors.has(Errors.SMART_CONNECTION_METHOD_UNSPECIFIED)
            ? 'Select a connection method'
            : ''}
        </ErrorLabel>
        {config.smartConnectionMethod === SmartConnectionMethod.READ_ONLY && (
          <>
            <TextField
              sx={{ width: 360, mt: 2 }}
              label="Public Address"
              error={errors.has(Errors.INVALID_ADDRESS)}
              autoComplete="off"
              value={config.publicAddress ?? ''}
              onChange={e => {
                const publicAddress = e.target.value;
                setConfig(swConfig => ({
                  ...swConfig,
                  publicAddress,
                }));
              }}
            ></TextField>
            <ErrorLabel>
              {errors.has(Errors.INVALID_ADDRESS)
                ? 'Enter a wallet address'
                : ''}
            </ErrorLabel>
          </>
        )}
      </FormControl>
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
        <Button
          onClick={saveAndClose}
          disabled={
            errors.size > 0 ||
            (!hasChanges &&
              config.smartConnectionMethod !== SmartConnectionMethod.KEPLR)
          }
        >
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

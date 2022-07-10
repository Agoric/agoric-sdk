import { useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { makeStyles } from '@mui/styles';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import TabList from '@mui/lab/TabList';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabPanel from '@mui/lab/TabPanel';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import { deepEquals } from '../util/DeepEquals';

import { withApplicationContext } from '../contexts/Application';
import {
  ConnectionConfigType,
  SmartConnectionMethod,
} from '../util/connections';
import { maybeSave, maybeLoad } from '../util/storage';

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

const Tabs = {
  SMART: 'smart',
  SOLO: 'solo',
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

const getAccessToken = () => {
  // Fetch the access token from the window's URL.
  const accessTokenParams = `?${window.location.hash.slice(1)}`;
  let accessToken = new URLSearchParams(accessTokenParams).get('accessToken');

  try {
    if (accessToken) {
      // Store the access token for later use.
      maybeSave('accessToken', accessToken);
    } else {
      // Try reviving it from localStorage.
      accessToken = maybeLoad('accessToken');
    }
  } catch (e) {
    console.log('Error fetching accessToken', e);
  }

  // Now that we've captured it, clear out the access token from the URL bar.
  window.location.hash = '';

  window.addEventListener('hashchange', _ev => {
    // See if we should update the access token params.
    const atp = `?${window.location.hash.slice(1)}`;
    const at = new URLSearchParams(atp).get('accessToken');

    if (at) {
      // We have new params, so replace them.
      accessToken = at;
      maybeSave('accessToken', accessToken);
    }

    // Keep it clear.
    window.location.hash = '';
  });

  return accessToken;
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
  const smartConnectionHrefs = allConnectionConfigs
    .filter(({ type }) => type === ConnectionConfigType.SMART)
    .map(({ href }) => href);

  const soloConnectionHrefs = allConnectionConfigs
    .filter(({ type }) => type === ConnectionConfigType.SOLO)
    .map(({ href }) => href);

  const [smartWalletConfig, setSmartWalletConfig] = useState(
    connectionConfig?.type === ConnectionConfigType.SMART
      ? connectionConfig
      : {
          type: ConnectionConfigType.SMART,
          href: smartConnectionHrefs[0],
          smartConnectionMethod: SmartConnectionMethod.KEPLR,
        },
  );

  const [soloWalletConfig, setSoloWalletConfig] = useState(
    connectionConfig?.type === ConnectionConfigType.SOLO
      ? connectionConfig
      : {
          type: ConnectionConfigType.SOLO,
          href: soloConnectionHrefs[0],
          accessToken: getAccessToken(),
        },
  );

  const [currentTab, setCurrentTab] = useState(
    connectionConfig && connectionConfig.type === ConnectionConfigType.SOLO
      ? Tabs.SOLO
      : Tabs.SMART,
  );

  const config =
    currentTab === Tabs.SMART ? smartWalletConfig : soloWalletConfig;

  const [selectInputId] = useState(uuid());

  const errors = new Set();

  try {
    // eslint-disable-next-line no-unused-vars
    const url = new URL(config.href);
  } catch (e) {
    errors.add(Errors.INVALID_URL);
  }

  if (config.type === ConnectionConfigType.SMART) {
    if (
      config.smartConnectionMethod === SmartConnectionMethod.READ_ONLY &&
      !config.publicAddress
    ) {
      errors.add(Errors.INVALID_ADDRESS);
    }
    if (config.smartConnectionMethod === undefined) {
      errors.add(Errors.SMART_CONNECTION_METHOD_UNSPECIFIED);
    }
  }

  if (config.type === ConnectionConfigType.SOLO && !config.accessToken) {
    errors.add(Errors.INVALID_ACCESS_TOKEN);
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

  const handleTabChange = (_ev, value) => {
    setCurrentTab(value);
  };

  const smartWalletConfigForm = (
    <>
      <Autocomplete
        value={smartWalletConfig?.href}
        id="connection"
        options={smartConnectionHrefs}
        sx={{ width: 360, mt: 2 }}
        onChange={(_, newValue) =>
          setSmartWalletConfig(swConfig => ({
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
          value={smartWalletConfig.smartConnectionMethod}
          labelId={selectInputId}
          label="Connection Method"
          onChange={e => {
            const smartConnectionMethod = e.target.value;
            setSmartWalletConfig(swConfig => ({
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
        {smartWalletConfig.smartConnectionMethod ===
          SmartConnectionMethod.READ_ONLY && (
          <>
            <TextField
              sx={{ width: 360, mt: 2 }}
              label="Public Address"
              error={errors.has(Errors.INVALID_ADDRESS)}
              autoComplete="off"
              value={smartWalletConfig.publicAddress ?? ''}
              onChange={e => {
                const publicAddress = e.target.value;
                setSmartWalletConfig(swConfig => ({
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

  const soloWalletConfigForm = (
    <>
      <Autocomplete
        value={soloWalletConfig?.href}
        id="connection"
        options={soloConnectionHrefs}
        sx={{ width: 360, mt: 2 }}
        onChange={(_, newValue) =>
          setSoloWalletConfig(swConfig => ({
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
          <TextField {...params} label="Solo Wallet URL" />
        )}
      />
      <ErrorLabel>
        {errors.has(Errors.INVALID_URL) ? 'Enter a valid URL' : ''}
      </ErrorLabel>
      <TextField
        sx={{ mt: 2, width: 360 }}
        label="Access Token"
        autoComplete="off"
        value={soloWalletConfig.accessToken}
        onChange={e => {
          const accessToken = e.target.value;
          setSoloWalletConfig(swConfig => ({
            ...swConfig,
            accessToken,
          }));
        }}
      />
      <ErrorLabel>
        {errors.has(Errors.INVALID_ACCESS_TOKEN)
          ? 'Enter an access token (agoric open --no-browser)'
          : ''}
      </ErrorLabel>
    </>
  );

  return (
    <Dialog onClose={onClose} open={open}>
      <DialogTitle className={classes.centeredText}>
        Connection Settings
      </DialogTitle>
      <DialogContent sx={{ width: 472 }}>
        <TabContext value={currentTab}>
          <Box sx={{ borderBottom: 1, borderColor: '#eaecef' }}>
            <TabList
              variant="fullWidth"
              onChange={handleTabChange}
              aria-label="connection type"
            >
              <Tab label="Smart Wallet" value={Tabs.SMART} />
              <Tab label="Solo Wallet" value={Tabs.SOLO} />
            </TabList>
          </Box>
          <TabPanel value={Tabs.SMART}>{smartWalletConfigForm}</TabPanel>
          <TabPanel value={Tabs.SOLO}>{soloWalletConfigForm}</TabPanel>
        </TabContext>
      </DialogContent>
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
          {currentTab === Tabs.SMART
            ? 'Connect Smart Wallet'
            : 'Connect Solo Wallet'}
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

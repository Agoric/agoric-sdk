/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import DialogTitle from '@mui/material/DialogTitle';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { parseAsValue } from '@agoric/ui-components';
import { E } from '@endo/eventual-send';
import Snackbar from '@mui/material/Snackbar';
import PurseAmount from './PurseAmount';
import { withApplicationContext } from '../contexts/Application';

const transferTypes = { WITHIN_WALLET: 'WITHIN_WALLET', ONE_WAY: 'ONE_WAY' };

// Exported for testing only.
export const TransferInternal = ({
  purse,
  handleClose,
  purses,
  contacts,
  setPendingTransfers,
}) => {
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const handleCloseSnackbar = _ => {
    setIsSnackbarOpen(false);
  };
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const showSnackbar = msg => {
    setSnackbarMessage(msg);
    setIsSnackbarOpen(true);
  };

  const [amountValid, setAmountValid] = useState(false);
  const [amount, setAmount] = useState('');
  const [parsedAmount, setParsedAmount] = useState(null);
  const handleAmountChange = e => {
    setAmount(e.target.value);
  };

  useEffect(() => {
    try {
      const val = parseAsValue(
        amount,
        purse.displayInfo.assetKind,
        purse.displayInfo.decimalPlaces,
      );
      setParsedAmount(val);
      setAmountValid(val > 0 && val <= purse.currentAmount.value);
    } catch {
      setAmountValid(false);
    }
  }, [amount]);

  const [destination, setDestination] = useState('');
  const [type, setType] = useState(transferTypes.WITHIN_WALLET);

  const handleTypeChange = e => {
    setType(e.target.value);
    setDestination('');
  };

  const handleDestinationChange = e => {
    setDestination(e.target.value);
  };

  const close = _ => {
    setAmount('');
    setDestination('');
    setType(transferTypes.WITHIN_WALLET);
    handleClose();
  };

  const send = async _ => {
    const to =
      type === transferTypes.WITHIN_WALLET
        ? purses.find(({ id }) => id === destination)
        : contacts.find(({ id }) => id === destination);

    setPendingTransfers({ purseId: purse.id, isPending: true });
    close();
    try {
      await E(purse.actions).send(to.actions, parsedAmount);
      showSnackbar('Transfer completed.');
    } catch (e) {
      showSnackbar('Transfer failed.');
    } finally {
      setPendingTransfers({ purseId: purse.id, isPending: false });
    }
  };

  const purseItems = purses
    ?.filter(({ brand }) => brand === purse?.brand)
    ?.map(p => ({ id: p.id, text: p.text }));
  const contactItems = contacts?.map(c => ({
    id: c.id,
    text: c.text,
  }));

  const purseSelect = purseItems && (
    <FormControl variant="standard" style={{ marginLeft: '34px' }}>
      <InputLabel id="purse-select-label">Purse</InputLabel>
      <Select
        value={type === transferTypes.WITHIN_WALLET ? destination : ''}
        onChange={handleDestinationChange}
        autoWidth
        label="Purse"
        labelId="purse-select-label"
        disabled={type !== transferTypes.WITHIN_WALLET}
      >
        {purseItems.map(({ id, text }) => (
          <MenuItem key={id} value={id}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const contactSelect = contactItems && (
    <FormControl variant="standard" style={{ marginLeft: '34px' }}>
      <InputLabel id="contact-select-label">Contact</InputLabel>
      <Select
        value={type === transferTypes.ONE_WAY ? destination : ''}
        onChange={handleDestinationChange}
        autoWidth
        label="Contact"
        labelId="contact-select-label"
        disabled={type !== transferTypes.ONE_WAY}
      >
        {contactItems.map(({ id, text }) => (
          <MenuItem key={id} value={id}>
            {text}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const content = purse && (
    <>
      <DialogTitle>Transfer from {purse.pursePetname}</DialogTitle>
      <DialogContent>
        <PurseAmount
          brandPetname={purse.brandPetname}
          pursePetname="Current balance:"
          value={purse.currentAmount.value}
          displayInfo={purse.displayInfo}
        />
        <div style={{ height: '68px' }}>
          <TextField
            error={!amountValid && amount !== ''}
            autoFocus
            margin="dense"
            label="Send amount"
            fullWidth
            variant="standard"
            value={amount}
            helperText={amountValid ? '' : amount && 'Invalid amount'}
            onChange={handleAmountChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {purse.brandPetname}
                </InputAdornment>
              ),
            }}
          />
        </div>
        <FormControl style={{ marginTop: '8px' }}>
          <RadioGroup
            aria-label="transfer type"
            value={type}
            onChange={handleTypeChange}
          >
            {/* TODO by default hide "within wallet" until https://github.com/Agoric/agoric-sdk/issues/6126 */}
            <FormControlLabel
              value={transferTypes.WITHIN_WALLET}
              control={<Radio color="primary" />}
              label="Transfer within wallet"
            />
            {purseSelect}
            <FormControlLabel
              style={{ marginTop: '8px' }}
              value={transferTypes.ONE_WAY}
              control={<Radio color="primary" />}
              label="Irrevocable one-way"
            />
            {contactSelect}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button color="cancel" onClick={close}>
          Cancel
        </Button>
        <Button onClick={send} disabled={!amountValid || destination === ''}>
          Send
        </Button>
      </DialogActions>
    </>
  );
  return (
    <>
      <Dialog open={purse !== null} onClose={close}>
        {content}
      </Dialog>
      <Snackbar
        open={isSnackbarOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </>
  );
};

export default withApplicationContext(TransferInternal, context => ({
  purses: context.purses,
  contacts: context.contacts,
  setPendingTransfers: context.setPendingTransfers,
}));

import { AssetKind } from '@agoric/ertp';
import { stringifyPurseValue } from '@agoric/ui-components';
import Close from '@mui/icons-material/Close';
import {
  Box,
  Link,
  Dialog,
  DialogContent,
  List,
  ListItem,
  IconButton,
  DialogTitle,
  Divider,
  Chip,
} from '@mui/material';
import { useState } from 'react';
import Petname from './Petname';
import { stringify } from '../util/marshal';

const SetItem = ({ item, showDivider }) => {
  return (
    <>
      <ListItem sx={{ p: 0, width: '100%' }}>
        <Box
          component="pre"
          sx={{
            backgroundColor: '#eaecef',
            mb: 2,
            mt: 2,
            p: 2,
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '14px',
            borderRadius: '8px',
            width: '100%',
            whiteSpace: 'pre-wrap',
          }}
        >
          {stringify(item, true)}
        </Box>
      </ListItem>
      {showDivider && <Divider variant="middle" />}
    </>
  );
};

const CopyBagItem = ({ count, record, showDivider }) => {
  return (
    <>
      <ListItem sx={{ p: 0, width: '100%' }}>
        <Box
          sx={{
            backgroundColor: '#eaecef',
            mb: 2,
            mt: 2,
            p: 2,
            pt: 0,
            fontSize: '14px',
            borderRadius: '8px',
            width: '100%',
          }}
        >
          <Chip
            sx={{ mt: 1, ml: -1, backgroundColor: '#fafafa' }}
            label={`Count: ${count}`}
            variant="outlined"
          />
          <Box
            component="pre"
            sx={{
              fontFamily: '"Roboto Mono", monospace',
              whiteSpace: 'pre-wrap',
              mt: 1,
            }}
          >
            {stringify(record, true)}
          </Box>
        </Box>
      </ListItem>
      {showDivider && <Divider variant="middle" />}
    </>
  );
};

const RichAmountDisplay = ({ text, items }) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);
  const handleAmountClicked = e => {
    e.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <Link href="#" color="inherit" onClick={handleAmountClicked}>
        {text}
      </Link>
      <Dialog
        PaperProps={{
          style: {
            borderRadius: 16,
            maxWidth: '100vw',
            margin: 16,
          },
        }}
        open={open}
        onClose={handleClose}
      >
        <DialogTitle sx={{ lineHeight: '40px', pb: 0 }}>
          {items.length} Item{items.length !== 1 && 's'}
          <IconButton sx={{ float: 'right' }} onClick={handleClose}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <List sx={{ padding: 0, minWidth: '320px' }}>{items}</List>
        </DialogContent>
      </Dialog>
    </>
  );
};

const PurseValue = ({ value, displayInfo, brandPetname }) => {
  const isNat = displayInfo?.assetKind === AssetKind.NAT;
  const isSet = displayInfo?.assetKind === AssetKind.SET;
  const isCopyBag = displayInfo?.assetKind === AssetKind.COPY_BAG;

  if (isCopyBag && Object.prototype.hasOwnProperty.call(value, 'payload')) {
    value = value.payload;
  }

  const text = (
    <>
      {stringifyPurseValue({
        value,
        displayInfo,
      })}{' '}
      <Petname name={brandPetname} />
    </>
  );

  const setItems =
    isSet &&
    value.map((item, index) => (
      <SetItem
        key={stringify(item, true)}
        item={item}
        showDivider={index !== value.length - 1}
      />
    ));

  const copyBagItems =
    isCopyBag &&
    value.map((entry, index) => (
      <CopyBagItem
        key={stringify(entry[0], true)}
        record={entry[0]}
        count={entry[1]}
        showDivider={index !== value.length - 1}
      />
    ));

  return (
    <Box sx={{ fontWeight: 600 }}>
      {isNat && text}
      {isSet && <RichAmountDisplay text={text} items={setItems} />}
      {isCopyBag && <RichAmountDisplay text={text} items={copyBagItems} />}
    </Box>
  );
};

export default PurseValue;

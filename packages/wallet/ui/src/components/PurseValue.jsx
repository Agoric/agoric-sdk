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
} from '@mui/material';
import { useState } from 'react';
import Petname from './Petname';

const SetItem = ({ item, showDivider }) => {
  return (
    <>
      <ListItem sx={{ p: 0 }}>
        <Box
          sx={{
            backgroundColor: '#eaecef',
            mb: 2,
            mt: 2,
            p: 2,
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '14px',
          }}
        >
          {JSON.stringify(item, null, 2)}
        </Box>
      </ListItem>
      {showDivider && <Divider variant="middle" />}
    </>
  );
};

const PurseValue = ({ value, displayInfo, brandPetname }) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);
  const handleAmountClicked = e => {
    e.preventDefault();
    setOpen(true);
  };

  const isNat = displayInfo?.assetKind === AssetKind.NAT;
  const isSet = displayInfo?.assetKind === AssetKind.SET;

  const content = (
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
        key={item}
        item={item}
        showDivider={index !== value.length - 1}
      />
    ));

  return (
    <Box sx={{ fontWeight: 600 }}>
      {isNat ? (
        content
      ) : (
        <>
          <Link href="#" color="inherit" onClick={handleAmountClicked}>
            {content}
          </Link>
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle sx={{ lineHeight: '40px', pb: 0 }}>
              {setItems.length} Item{setItems.length !== 1 && 's'}
              <IconButton sx={{ float: 'right' }} onClick={handleClose}>
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <List sx={{ padding: 0 }}>{setItems}</List>
            </DialogContent>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default PurseValue;

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
  Collapse,
} from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import Petname from './Petname';
import { stringify } from '../util/marshal';

const Item = ({ showDivider, children }) => {
  const [expanded, setExpanded] = useState(false);
  const [collapsible, setCollapsible] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const contentEl = useRef(null);

  useEffect(() => {
    if (contentEl.current) {
      if (contentEl.current.scrollHeight <= 160) {
        setCollapsible(false);
      } else {
        setCollapsible(true);
      }
    }
  }, [contentEl.current, windowWidth]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const containerStyles = {
    backgroundColor: '#eaecef',
    border: '1px solid #81d4db',
    boxSizing: 'border-box',
    mb: 2,
    mt: 2,
    borderRadius: '8px',
    width: '100%',
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
  };

  const content = (
    <>
      {collapsible && (
        <Box
          component="button"
          tabIndex="0"
          onClick={() => setExpanded(val => !val)}
          sx={{
            fontFamily: 'inherit',
            fontSize: 'inherit',
            cursor: 'pointer',
            height: '32px',
            lineHeight: '32px',
            borderRadius: '0 0 8px 8px',
            border: 'none',
            color: 'rgba(255, 255, 255)',
            position: 'absolute',
            width: 'calc(100% - 2px)',
            bottom: '16px',
            backdropFilter: 'blur(2px)',
            backgroundColor: 'rgba(4, 170, 180, 0.5)',
          }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Box>
      )}
      <Box ref={contentEl}>{children}</Box>
    </>
  );

  return (
    <>
      <ListItem sx={{ p: 0, width: '100%' }}>
        {collapsible ? (
          <Collapse in={expanded} collapsedSize={160} sx={containerStyles}>
            <Box sx={{ mb: 3 }}>{content}</Box>
          </Collapse>
        ) : (
          <Box sx={containerStyles}>{content}</Box>
        )}
      </ListItem>
      {showDivider && <Divider variant="middle" />}
    </>
  );
};

const SetItem = ({ item, showDivider }) => {
  return (
    <Item showDivider={showDivider}>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          fontFamily: '"Roboto Mono", monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        {stringify(item, true)}
      </Box>
    </Item>
  );
};

const CopyBagItem = ({ count, record, showDivider }) => {
  return (
    <Item showDivider={showDivider}>
      <Box sx={{ p: 2 }}>
        <Chip
          sx={{ mb: 1, backgroundColor: '#fafafa' }}
          label={`Count: ${count}`}
          variant="outlined"
        />
        <Box
          component="pre"
          sx={{
            m: 0,
            fontFamily: '"Roboto Mono", monospace',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          {stringify(record, true)}
        </Box>
      </Box>
    </Item>
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

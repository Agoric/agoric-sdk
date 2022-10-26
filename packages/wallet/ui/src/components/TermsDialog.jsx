import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useState } from 'react';

import styles from './TermsDialog.module.scss';

const TermsDialog = ({ onClose, isOpen }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = event => {
    setIsChecked(event.target.checked);
  };

  return (
    <Dialog open={isOpen}>
      <DialogTitle>Disclaimer</DialogTitle>
      <DialogContent>
        {/* FIXME: GET REAL TOS LINK */}
        <FormControlLabel
          label={
            <span>
              By ticking the box and hitting &apos;Proceed&apos; you are
              agreeing to the terms as described{' '}
              <a
                className={styles.link}
                target="agoric_wallet_tos"
                href="https://agoric.com"
              >
                here
              </a>
              .
            </span>
          }
          control={
            <Checkbox
              checked={isChecked}
              onChange={handleCheckboxChange}
            ></Checkbox>
          }
        />
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={onClose} disabled={!isChecked}>
          Proceed
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TermsDialog;

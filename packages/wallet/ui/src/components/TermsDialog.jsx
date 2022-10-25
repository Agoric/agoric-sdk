import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useState } from 'react';

const TermsDialog = ({ onClose, isOpen }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = event => {
    setIsChecked(event.target.checked);
  };

  return (
    <Dialog open={isOpen}>
      <DialogTitle>Disclaimer</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Inter Protocol is a fully decentralized stable token protocol. No
          representation or warranty is made concerning any aspect of the Inter
          Protocol, including its suitability, quality, availability,
          accessibility, accuracy or safety. As more fully explained in the
          Terms of Use (available here) and the Risk Statement (available here),
          your access to and use of the Inter Protocol is entirely at your own
          risk and could lead to substantial losses. You take full
          responsibility for your use of the Inter Protocol, and acknowledge
          that you use it on the basis of your own enquiry, without solicitation
          or inducement by Contributors (as defined in the Terms of Use).
        </DialogContentText>
        <FormControlLabel
          label="I understand the risks and would like to proceed."
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

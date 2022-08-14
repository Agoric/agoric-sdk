import { E } from '@endo/eventual-send';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Request from './Request';

const IssuerSuggestion = ({ suggestion }) => {
  const [petname, setPetname] = useState(suggestion.petname);

  const accept = () => E(suggestion.actions).accept(petname);
  const decline = () => E(suggestion.actions).delete();

  return (
    <Request header="Issuer Suggestion">
      <div>
        Board ID: (<span className="Board">{suggestion.boardId}</span>)
      </div>
      <div style={{ height: '64px' }}>
        <TextField
          spellCheck="false"
          margin="dense"
          size="small"
          label="Issuer petname"
          fullWidth
          variant="standard"
          value={petname}
          onChange={e => setPetname(e.target.value)}
        />
      </div>
      <div className="Controls">
        <Chip
          onClick={accept}
          variant="outlined"
          label="Accept"
          icon={<CheckIcon />}
          color="success"
        />
        <Chip
          style={{ marginRight: '8px' }}
          onClick={decline}
          variant="outlined"
          label="Decline"
          icon={<CloseIcon />}
          color="error"
        />
      </div>
    </Request>
  );
};

export default IssuerSuggestion;

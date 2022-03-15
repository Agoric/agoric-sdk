import { E } from '@endo/eventual-send';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Request from './Request';
import Dapp from './Dapp';

const DappConnection = ({ dapp }) => {
  const enable = () => E(dapp.actions).enable();
  const reject = () => E(dapp.actions).delete();

  return (
    <Request header="Dapp Connection">
      <Dapp dapp={dapp} />
      <div className="Controls">
        <Chip
          onClick={enable}
          variant="outlined"
          label="Accept"
          icon={<CheckIcon />}
          color="success"
        />
        <Chip
          style={{ marginRight: '8px' }}
          onClick={reject}
          variant="outlined"
          label="Reject"
          icon={<CloseIcon />}
          color="error"
        />
      </div>
    </Request>
  );
};

export default DappConnection;

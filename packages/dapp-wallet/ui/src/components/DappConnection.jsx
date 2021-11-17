import { E } from '@agoric/eventual-send';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import Request from './Request';
import Dapp from './Dapp';

const DappConnection = ({ dapp }) => {
  const enable = () => E(dapp.actions).enable();

  return (
    <Request header="Dapp Connection">
      <Dapp dapp={dapp} />
      <div className="Controls">
        <Chip
          onClick={enable}
          variant="outlined"
          label="Enable"
          icon={<CheckIcon />}
          color="success"
        />
      </div>
    </Request>
  );
};

export default DappConnection;

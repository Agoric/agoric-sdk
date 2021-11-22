import { E } from '@agoric/eventual-send';
import { Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Card from '../components/Card';
import Dapp from '../components/Dapp';
import { withApplicationContext } from '../contexts/Application';

import './Dapps.scss';

// Exported for testing only.
export const DappsWithoutContext = ({ dapps }) => {
  dapps = dapps?.filter(({ enable }) => enable);

  const remove = ({ actions }) => E(actions).delete();

  const DappCard = dapp => (
    <div className="Dapp" key={dapp.id}>
      <Card>
        <div className="DappContent">
          <IconButton
            onClick={() => remove(dapp)}
            size="small"
            style={{ float: 'right', marginTop: '-8px' }}
          >
            <CloseIcon />
          </IconButton>
          <Dapp dapp={dapp} />
        </div>
      </Card>
    </div>
  );

  const dappCards = (dapps && dapps.map(DappCard)) ?? (
    <CircularProgress style={{ margin: 'auto' }} />
  );

  return (
    <>
      <Typography variant="h1">Dapps</Typography>
      <div className="DappList">
        {dapps?.length || dapps === undefined ? (
          dappCards
        ) : (
          <div className="EmptyDapps">
            <img src="agoric-blocks.png" alt="No Dapps" />
            <p className="text-gray">No Dapps</p>
          </div>
        )}
      </div>
    </>
  );
};

export default withApplicationContext(DappsWithoutContext, context => ({
  dapps: context.dapps,
}));

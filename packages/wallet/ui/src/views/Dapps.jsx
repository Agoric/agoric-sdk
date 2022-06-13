import { useState } from 'react';
import { E } from '@endo/eventual-send';
import { Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import Card from '../components/Card';
import Dapp from '../components/Dapp';
import Loading from '../components/Loading';
import { withApplicationContext } from '../contexts/Application';

import './Dapps.scss';

// Exported for testing only.
export const DappsWithoutContext = ({ dapps }) => {
  dapps = dapps?.filter(({ enable }) => enable);

  const remove = ({ actions }) => E(actions).delete();

  const DappCard = ({ dapp }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const handleClick = event => {
      setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
      setAnchorEl(null);
    };
    const isPopoverOpen = Boolean(anchorEl);

    return (
      <div className="Dapp">
        <Card>
          <div className="DappContent">
            <IconButton
              onClick={handleClick}
              size="small"
              style={{ float: 'right', marginTop: '-8px' }}
            >
              <SettingsIcon />
            </IconButton>
            <Popover
              open={isPopoverOpen}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
              }}
            >
              <Button
                style={{ margin: '4px' }}
                onClick={() => remove(dapp)}
                size="small"
              >
                Remove
              </Button>
            </Popover>
            <Dapp dapp={dapp} />
          </div>
        </Card>
      </div>
    );
  };

  const dappCards = (dapps &&
    dapps.map(dapp => <DappCard dapp={dapp} key={dapp.id} />)) ?? (
    <Loading defaultMessage="Fetching dapps..." />
  );

  return (
    <>
      <Typography variant="h1">Dapps</Typography>
      <div className="DappList">
        {dapps?.length || dapps === undefined ? (
          dappCards
        ) : (
          <div className="EmptyDapps">
            <img
              width="360"
              height="360"
              src="agoric-blocks.png"
              alt="No Dapps"
            />
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

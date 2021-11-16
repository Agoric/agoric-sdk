import { Typography } from '@mui/material';
import Purses from '../components/Purses';
import Requests from '../components/Requests';

import './Dashboard.scss';

const Dashboard = () => {
  return (
    <>
      <Typography variant="h1">Dashboard</Typography>
      <span className="Content">
        <div className="Flex-item">
          <Requests />
        </div>
        <div className="Flex-item Purses">
          <Purses />
        </div>
      </span>
    </>
  );
};

export default Dashboard;

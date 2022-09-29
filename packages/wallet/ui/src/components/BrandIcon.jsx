import Box from '@mui/material/Box';
import { icons, defaultIcon } from '../util/Icons.js';

const BrandIcon = ({ brandPetname }) => {
  const src = icons[brandPetname] ?? defaultIcon;

  const icon = src ? (
    <img alt="icon" src={src} height="32px" width="32px" />
  ) : (
    <Box sx={{ height: 32, width: 32 }}></Box>
  );

  return <Box sx={{ mr: 2 }}>{icon}</Box>;
};

export default BrandIcon;

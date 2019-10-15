import React from 'react';

import IconX from '@material-ui/icons/Close'; // "X"
import IconO from '@material-ui/icons/RadioButtonUnchecked'; // "O"

export default function IconMark({ player }) {
  if (player === 1) {
    return <IconX />;
  }
  if (player === 2) {
    return <IconO viewBox="-4 -4 32 32" />;
  }
  return <></>;
}

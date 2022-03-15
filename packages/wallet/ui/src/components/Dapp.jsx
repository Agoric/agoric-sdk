import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import { E } from '@endo/eventual-send';
import { withApplicationContext } from '../contexts/Application';

const DappWithoutContext = ({ dapp, dapps }) => {
  const { petname, origin, dappOrigin, enable, actions } = dapp;
  const [dappPetname, setDappPetname] = useState(petname);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setIsValid(
      petname === dappPetname ||
        !dapps.filter(
          ({ petname: otherPetname }) => dappPetname === otherPetname,
        ).length,
    );
  }, [dappPetname]);

  const handleDappPetnameChange = event => setDappPetname(event.target.value);

  const handleKeydown = event => {
    if (event.key === 'Escape') {
      setDappPetname(petname);
      event.stopPropagation();
    } else if (event.key === 'Enter') {
      E(actions).setPetname(dappPetname);
      event.stopPropagation();
    }
  };

  return (
    <>
      <div style={{ marginBottom: '8px', fontWeight: '700' }}>
        <span>{petname}</span>{' '}
      </div>
      <div className="text-gray">
        {enable ? 'User' : 'Alleged user'} interface:{' '}
        <span className="Blue">{dappOrigin || origin}</span>
      </div>
      <div style={{ height: '64px' }}>
        <TextField
          spellCheck="false"
          margin="dense"
          size="small"
          label="Dapp petname"
          fullWidth
          variant="standard"
          value={dappPetname}
          error={!isValid}
          helperText={!isValid && 'Petname already in use'}
          onKeyDown={handleKeydown}
          onChange={handleDappPetnameChange}
        />
      </div>
    </>
  );
};

export default withApplicationContext(DappWithoutContext, context => ({
  dapps: context.dapps,
}));

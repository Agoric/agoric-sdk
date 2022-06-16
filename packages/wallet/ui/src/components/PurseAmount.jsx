/* eslint-disable import/no-extraneous-dependencies */
import { stringifyPurseValue } from '@agoric/ui-components';
import Petname from './Petname';
import defaultIcon, * as icons from '../util/Icons.js';

const PurseAmount = ({ brandPetname, pursePetname, value, displayInfo }) => {
  return (
    <div className="Amount">
      <img
        alt="icon"
        src={icons[brandPetname] ?? defaultIcon}
        height="32px"
        width="32px"
      />
      <div>
        <Petname name={pursePetname} />
        <div className="Value">
          {stringifyPurseValue({
            value,
            displayInfo,
          })}{' '}
          <Petname name={brandPetname} />
        </div>
      </div>
    </div>
  );
};

export default PurseAmount;

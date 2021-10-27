/* eslint-disable import/no-extraneous-dependencies */
import { stringifyPurseValue } from '@agoric/ui-components';
import { icons, defaultIcon } from '../util/Icons.js';

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
        <div>{pursePetname}</div>
        <div className="Value">
          {stringifyPurseValue({
            value,
            displayInfo,
          })}{' '}
          {brandPetname}
        </div>
      </div>
    </div>
  );
};

export default PurseAmount;

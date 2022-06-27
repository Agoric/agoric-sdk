import Petname from './Petname';
import PurseValue from './PurseValue';
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
        <Petname name={pursePetname} />
        <PurseValue
          value={value}
          displayInfo={displayInfo}
          brandPetname={brandPetname}
        />
      </div>
    </div>
  );
};

export default PurseAmount;

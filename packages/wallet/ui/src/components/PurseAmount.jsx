import Petname from './Petname';
import PurseValue from './PurseValue';
import BrandIcon from './BrandIcon';

const PurseAmount = ({ brandPetname, pursePetname, value, displayInfo }) => {
  return (
    <div className="Amount">
      <BrandIcon brandPetname={brandPetname} />
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

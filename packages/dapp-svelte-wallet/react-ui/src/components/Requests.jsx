import './Requests.scss';

const Requests = () => {
  return (
    <div className="Empty">
      <img
        className="Splash-image"
        src="agoric-city.svg"
        alt="Empty Inbox"
        width="320"
        height="320"
      />
      <p className="text-gray">No requests.</p>
    </div>
  );
};

export default Requests;

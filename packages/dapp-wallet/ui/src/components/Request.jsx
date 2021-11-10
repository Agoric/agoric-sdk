import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import './Request.scss';

const Request = ({ close, header, completed, children }) => {
  return (
    <div className="Request">
      <div className="RequestSummary">
        <div className="RequestHeader">
          <h6>{header}</h6>
        </div>
        {completed && (
          <IconButton click={close} size="medium">
            <CloseIcon />
          </IconButton>
        )}
      </div>

      <div className="Body">{children}</div>

      {completed && <div className="Overlay" />}
    </div>
  );
};

export default Request;

import './Card.scss';

const Card = ({ children, header }) => {
  return (
    <div className="Card">
      {header && (
        <div className="Header">
          <h6>{header}</h6>
        </div>
      )}
      <div className="Content">{children}</div>
    </div>
  );
};

export default Card;

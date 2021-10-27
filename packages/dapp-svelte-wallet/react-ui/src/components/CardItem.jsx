import './CardItem.scss';

const CardItem = ({ children }) => {
  return (
    <div className="CardItem">
      <div className="Divider" />
      {children}
    </div>
  );
};

export default CardItem;

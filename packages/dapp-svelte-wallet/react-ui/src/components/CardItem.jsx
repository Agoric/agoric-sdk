import './CardItem.scss';

const CardItem = ({ children, hideDivider }) => {
  return (
    <div className="CardItem">
      {hideDivider || <div className="Divider" />}
      {children}
    </div>
  );
};

export default CardItem;

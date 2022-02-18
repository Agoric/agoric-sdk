const TokenType = () => {};
const beforeExpr = 0;

export const createBinop = (name, binop) =>
  new TokenType(name, {
    beforeExpr,
    binop,
  });

import { vstorageKit } from './vstorage-mock';
import { PortfolioListener } from './portfolio-listener';

const startListener = async () => {
  const listener = new PortfolioListener(vstorageKit);
  await listener.start();
};

startListener().catch(console.error);

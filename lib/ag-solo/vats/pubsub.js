import harden from '@agoric/harden';

export default function(E) {
  let lastPublished;
  const subscribers = [];

  return harden({
    subscribe(s) {
      subscribers.push(s);
      if (lastPublished !== undefined) {
        E(s).notify(lastPublished);
      }
    },
    publish(m) {
      lastPublished = m;
      subscribers.forEach(s => {
        E(s).notify(m);
      });
    },
  });
}

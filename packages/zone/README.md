# Zones

Each Zone provides an API that allows the allocation of [Exo objects](https://github.com/endojs/endo/tree/master/packages/exo#readme) and [Stores
(object collections)](../store/README.md) which use the same underlying persistence mechanism.  This
allows library code to be agnostic to whether its objects are backed purely by
the JS heap (ephemeral), pageable out to disk (virtual) or can be revived after
a vat upgrade (durable).

See [SwingSet vat upgrade documentation](../SwingSet/docs/vat-upgrade.md) for more example use of the zone API.

An example of making a Zone-aware vat might look something like this:

```js
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareFrobulator } from 'frob-package';
import { prepareWidget } from 'widget-package';

export const buildRootObject = (vatPowers, _args, baggage) => {
  const zone = makeDurableZone(baggage);

  // Ensure that Widgets cannot interfere with Frobs.
  const makeWidget = prepareWidget(zone.subZone('Widgets'));

  // Create a collection of frobulators.
  const frobZone = zone.subZone('Frobs');
  const makeFrobulator = prepareFrobulator(frobZone);
  const widgetToFrob = frobZone.mapStore('widgetToFrob');

  return Far('WidgetFrobulator', {
    makeWidget,
    registerWidget(w) {
      const frobulator = makeFrobulator();
      widgetToFrob.init(w, frobulator);
    },
    frobWidget(w) {
      const frobulator = widgetToFrob.get(w);
      return frobulator.frob(w);
    },
  });
}
```

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;
log(`=> loading bootstrap.js`);

export function buildRootObject(vatPowers) {
	log(`=> buildRootObject`)

	const { D } = vatPowers;

	return Far("root", {
		async bootstrap(vats, devices) {
			const timerService = await E(vats.timer).createTimerService(devices.timer);
			assert(timerService)
			const name = `jerky`

			log(`=> in bootstrap sayHello`)
			let helloP = E(vats.hello).sayHello(name)
			let helloMsg = await helloP
			log(helloMsg)

			log(`=> in bootstrap sayHelloAfterWait`)
			let helloAfterWaitP = E(vats.hello).sayHelloAfterWait(name, timerService, 1000000n)
			helloMsg = await helloAfterWaitP
			log(helloMsg)

			// log(`=> in bootstrap getResponseAsPromise`)
			// let resolver;
			// const param = new Promise((theResolver, _theRejector) => {
			// 	resolver = theResolver;
			// });

			// E(vats.hello)
			// 	.getResponseAsPromise(param)
			// resolver(`hello back from ${name}`)
		},
	})
}

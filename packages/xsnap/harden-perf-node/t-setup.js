import 'ses';

const argv = process.argv.splice(2);
const [branding, name, count_s] = argv;
const count = Number(count_s);
globalThis.HARDEN_BRANDING = branding;
lockdown({});

export { branding, name, count };

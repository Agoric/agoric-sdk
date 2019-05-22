try {
    module.exports = require('../build/Release/coss.node');
} catch (e) {
    console.log(`Cannot load Release version:`, e);
    module.exports = require('../build/Debug/coss.node');
}

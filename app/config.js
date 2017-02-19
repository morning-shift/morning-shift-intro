var overrides = require('./config-overrides.js');
// For publicly viewable configuration.
module.exports = { 
	clefPublicKey: overrides.clefPublicKey || "db5b5d2cdd53e9ed9abba7d4d4df685f",
	facebookAppId: overrides.facebookAppId || "385805705132348"
    // stripePublicKey: "pk_live_..."
};
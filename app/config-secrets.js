var fs = require('fs');
module.exports = function () {

    var stripeKeyPath = '/home/ubuntu/stripe/private.key';

    try {
        var values = {
            stripePrivateKey: fs.readFileSync(stripeKeyPath)
        };  
    }
    catch (err) {
        console.log(err);
        return {
            stripePrivateKey: ""
        }
    }

    return values;
}();
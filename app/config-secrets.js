var fs = require('fs');
module.exports = function () {

    var stripeKeyPath = '/home/ubuntu/stripe/private.key';

    try {
        var fileReadOptions = {
            encoding: 'utf-8'
        };

        var values = {
            stripePrivateKey: fs.readFileSync(stripeKeyPath, fileReadOptions).trim()
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
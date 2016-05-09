var path    = require('path');
var https   = require('./https-server.js');
var config  = require('./config.js');
var secrets = require('./config-secrets.js');

var stripe   = require('stripe')(secrets.stripePrivateKey);
var database = require('./database.js')('phil-manijak-com');

var bodyParser = require('body-parser');
var express = require('express');
var app = express();


app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.render('index', {
        config: {
            stripePublicKey: config.stripePublicKey
        }
    });
});

app.post('/data/subscribe', function (req, res) {
    var customerData = req.body;

    function processAmountEntry (customerAmountEntry) {
        switch (customerAmountEntry) {
            case 2000:
                return '20-monthly';
            case 1000: 
                return '10-monthly';
            default:
                return '20-monthly';
        }
    };

    function createCustomer (customer, callback) {
        var stripePlan = processAmountEntry(customer.amount);
        var juneThird  = Math.floor(new Date(2016, 5, 3) / 1000);

        var stripeRequest = {
            source: customer.stripeTokenId,
            email: customer.email,
            plan: stripePlan,
            quantity: 1,
            trial_end: juneThird
        };

        stripe.customers.create(stripeRequest, callback);
    }

    function handleCustomer (err, customer) {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        console.log(customer);
        res.sendStatus(200);
    }

    createCustomer(customerData, handleCustomer);
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, function () {
    console.log('philmanijak.com http on port 3000');
});

https(app).listen(4000, function (err) {
    if (err) {
        console.log(err);
    }
    else {
        console.log('philmanijak.com https on port 4000');
    }
});
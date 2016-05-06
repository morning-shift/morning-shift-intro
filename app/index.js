var path   = require('path');
var https  = require('./https-server.js');
var config = require('./config.js');

var express = require('express');
var app = express();


app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'pug');


app.get('/', function (req, res) {
    res.render('index', {
        config: {
            stripePublicKey: config.stripePublicKey
        }
    });
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
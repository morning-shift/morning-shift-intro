var path = require('path');
var express = require('express');
var app = express();

app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'pug');


app.get('/', function (req, res) {
  res.render('index');
});

app.use(express.static('public'));

app.listen(3000, function () {
  console.log('philmanijak.com listening on port 3000');
});
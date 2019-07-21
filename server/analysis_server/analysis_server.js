var express = require('express');
var app = express();
var bodyParser = require('body-parser');

var server = app.listen(5901,()=>{
    console.log('Express server has started on port 5901')
})

app.use('/uploads',express.static('uploads'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())

var router = require('./router/main.js')(app);
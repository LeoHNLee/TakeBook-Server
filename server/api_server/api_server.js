var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.set('views',__dirname+'/Template/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

var server = app.listen(5900,()=>{
    console.log('Express server has started on port 5900')
})

app.use('/uploads',express.static('uploads'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())

var router = require('./router/main.js')(app);


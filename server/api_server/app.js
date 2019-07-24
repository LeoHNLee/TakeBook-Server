const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const logger = require('morgan');

//router
const mainRouter = require('./routes/main')


app.use(logger('dev'));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())

app.set('views', __dirname + '/Template/views');
app.set('view engine', 'ejs');
//html을 render하기위한 설정
app.engine('html', require('ejs').renderFile);

//router 경로추가
app.use('/', mainRouter);

//404 NOT FOUND
app.use((req, res, next) => {
    res.status(404).send('NOT FOUND');
})

//500 ERROR
app.use((err, req, res, next) => {
    console.log(err)
})

module.exports = app;
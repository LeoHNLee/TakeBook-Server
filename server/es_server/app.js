const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const logger = require('morgan');

//router
const mainRouter = require('./routes/main')
const internalRouter = require('./routes/internal')


app.use(logger('dev'));
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.json())
// app.use(bodyParser.urlencoded())

//router 경로추가
app.use('/', mainRouter);
app.use('/Internal', internalRouter);

//404 NOT FOUND
app.use((req, res, next) => {
    res.status(404).send('NOT FOUND');
})

//500 ERROR
app.use((err, req, res, next) => {
    console.log(err)
})

module.exports = app;
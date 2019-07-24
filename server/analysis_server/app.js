const express = require('express');
const app = express();
const bodyParser = require('body-parser');

//router
const mainRouter = require('./routes/main')

app.use('/uploads',express.static('uploads'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())

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


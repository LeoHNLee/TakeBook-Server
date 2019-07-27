const express = require('express');
const multer = require('multer');
const fs = require('fs');
const postrequest = require('request')

const router = express.Router();
const address = `http://127.0.0.1:5900`;
const ouheraddress = `http://127.0.0.1:5901`;

var upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename(req, file, cb) {
            cb(null, file.originalname);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', (req, res) => {
    res.render('fileinput.html');
});

router.get('/result', (req, res) => {
    res.send('success!')
});

router.post('/result', (req, res) => {
    filename = req.body.filename

    const form = {
        filename: filename,
    }

    postrequest.post(`${ouheraddress}/result`, {form},
        function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('response failed:', err);
            }
            console.log('response successful!  Server responded with:', body);
            res.send(body)
        })
})


module.exports = router;
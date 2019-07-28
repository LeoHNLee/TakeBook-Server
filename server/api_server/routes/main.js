const express = require('express');
const fs = require('fs');
const postrequest = require('request')

const router = express.Router();
const address = `http://127.0.0.1:5900`;
const ouheraddress = `http://127.0.0.1:5901`;

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
        
});

router.post('/test', (req,res)=>{
    let is_error = req.body.is_error;
    let file_name = req.body.file_name;
    let user_id = req.body.user_id;

    const form = {
        'is_error': is_error,
        'error_code': 0,
        'filename': 'test_title',
        'isbn':'1234567890123'
    }

    res.json(form)

})






module.exports = router;
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


router.post('/result', upload.single('book_image'), (req, res) => {
    let imagepath = `./${req.file.path}`


    const form = {
        book_image : fs.createReadStream(imagepath),
    };
    // post 요청
    // @parms    url: 요청을 보낼 주소
    // @parms    formdata: 요청을 보낼 form데이터
    postrequest.post({ url: `${ouheraddress}/result`, formData: form },
        function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:', body);
            res.send(body)
        });

});


module.exports = router;
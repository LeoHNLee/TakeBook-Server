const express = require('express');
const fs = require('fs');
const postrequest = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');

const mysql_connetion = require('../bin/mysql_connetion');

const router = express.Router();
const anlysis_server_address = `http://127.0.0.1:5901`;

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';
let s3 = new aws.S3();
let bucket = 'red-bucket';

//mysql 연결
mysql_connetion.connect();

// 업로드 설정
let upload = multer({
    storage: multers3({
        s3: s3,
        bucket: bucket,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, file.originalname);
        }
    })
}).single('image_file');

// 업로드 설정
let testupload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename(req, file, cb) {
            cb(null, file.originalname);
        }
    }),
});

router.get('/result', (req, res) => {
    res.send('왜일루왔누?');
});

router.post('/result', (req, res) => {

    upload(req, res, (err) => {

        const response_body = {};

        if (err) {
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body);
            return;
        }
        
        let file = req.file;
        let user_id = req.body.user_id;

        //필수값 없을시
        if (file && user_id) {

            let filename = file.originalname;

            //다른 서버에 요청을 보낼 request form
            const form = {
                'filename': filename,
            }

            //도서 분석 요청
            postrequest.post(`${anlysis_server_address}/result`, { form },
                function optionalCallback(err, httpResponse, response) {
                    if (err) {
                        return console.error('response failed:', err);
                    }
                    // respone 는 string로 옮, json으로 변형시켜줘야함
                    response = JSON.parse(response)

                    let is_error = response.is_error;

                    if (is_error) {
                        response_body.is_error = is_error
                        response_body.error_code = response.error_code
                        response_body.error_code = 1
                        res.json(response_body)
                    } else {
                        response_body.is_error = is_error
                        response_body.result = response.result

                        mysql_connetion.query(`SELECT * FROM book WHERE isbn=${9788928055760};`, (err, results, fields) => {
                            if (err) {
                                console.log(err);
                            }

                            if (results.length) {
                                for (let key in results[0]) {
                                    let upperkey = key.toLowerCase();
                                    response_body[upperkey] = results[0][key];
                                }
                            }
                            res.json(response_body)
                        })
                    }
                })

        } else {
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })

});

router.post('/test', testupload.single('image_file'), (req, res) => {

    const form = {}

    let file = req.file;
    let user_id = req.body.user_id;

    if (file && user_id) {
        fs.unlinkSync(`./uploads/${file.filename}`);

        mysql_connetion.query(`SELECT * FROM book WHERE isbn=${9788928055760}`, (err, results, fields) => {
            if (err) {
                form.is_error = true;
                form.error_code = 1;
                res.json(form)
            }

            if (results.length) {
                for (let key in results[0]) {
                    let upperkey = key.toLowerCase();
                    form[upperkey] = results[0][key];
                }
                form.is_error = false;
                form.result = "오늘멘토링 취소됨 개꿀"
            }
            res.json(form)
        })

        
        // form.filename = 'test_title';
        // form.isbn = '1234567890123';
    } else {
        form.is_error = true;
        form.error_code = 1;
        res.json(form)
    }

    

})

module.exports = router;
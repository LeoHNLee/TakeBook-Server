const express = require('express');
const fs = require('fs');
const postrequest = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');
const async = require('async');

const mysql_connetion = require('../bin/mysql_connetion');

const router = express.Router();
const analysis_server_address = `http://127.0.0.1:5901`;
const es_server_address = `http://127.0.0.1:5902`;

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
                method: 'POST',
                uri: `${analysis_server_address}/result`,
                body: {
                    'filename': filename,
                },
                json: true
            }

            //도서 분석 요청
            postrequest.post(form, (err, httpResponse, response) => {
                if (err) {
                    return console.error('response failed:', err);
                }

                let is_error = response.is_error;

                if (is_error) {
                    console.log("분석 요청 오류");
                    response_body.is_error = is_error
                    response_body.error_code = response.error_code
                    response_body.error_code = 1
                    res.json(response_body)
                } else {

                    //다른 서버에 요청을 보낼 request form
                    const form = {
                        method: 'POST',
                        uri: `${es_server_address}/search`,
                        body: {
                            'result': response.result,
                        },
                        json: true
                    }

                    postrequest.post(form, (err, httpResponse, response) => {
                        let is_find = response.hits.total;
                        if (is_find === 0) {
                            response_body.is_error = true;
                            response_body.result = 3;
                            res.json(response_body)
                        } else {
                            let search_isbn = response.hits.hits[0]._source.isbn;
                            mysql_connetion.query(`SELECT * FROM book WHERE isbn=${search_isbn};`, (err, results, fields) => {
                                if (err) {
                                    console.log(err);
                                }

                                if (results.length) {
                                    for (let key in results[0]) {
                                        let upperkey = key.toLowerCase();
                                        response_body[upperkey] = results[0][key];
                                    }
                                }
                                response_body.is_error = false;
                                res.json(response_body)
                            })
                        }
                    })

                }
            })

        } else {
            console.log("form 값 오류");
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })

});

router.post('/ocrtest', (req, res) => {

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
                method: 'POST',
                uri: `${analysis_server_address}/result`,
                body: {
                    'filename': filename,
                },
                json: true
            }

            //도서 분석 요청
            postrequest.post(form, (err, httpResponse, response) => {
                if (err) {
                    return console.error('response failed:', err);
                }

                let is_error = response.is_error;

                if (is_error) {
                    console.log("분석 요청 오류");
                    response_body.is_error = is_error
                    response_body.error_code = response.error_code
                    response_body.error_code = 1
                    res.json(response_body)
                } else {
                    response_body.result = response.result;
                    res.json(response_body)
                }
            })

        } else {
            console.log("form 값 오류");
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })

});

router.post('/ocrtest', testupload.single('image_file'), (req, res) => {

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

    } else {
        form.is_error = true;
        form.error_code = 1;
        res.json(form)
    }



})

router.get('/save', (req, res) => {

    mysql_connetion.query(`select TITLE,ISBN, IMAGE_URL from book where PUBLISHED_DATE like '201801%'`, (err, results, fields) => {

        var tasks = []
        for (let key in results) {

            //다른 서버에 요청을 보낼 request form
            let form = {
                method: 'POST',
                uri: `${es_server_address}/save`,
                body: {},
                json: true
            }

            form.body.title = results[key].TITLE;
            form.body.isbn = results[key].ISBN;
            form.body.fileurl = results[key].IMAGE_URL;

            tasks.push(function (callback) {
                postrequest.post(form, (err, httpResponse, response) => {
                    if (err) {
                        console.log(err);
                    }
                })
                callback(null);
            })
            if (key === '5') {
                break;
            }
        }
        async.waterfall(tasks, (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log("done");
            }
        })
    })

})


module.exports = router;
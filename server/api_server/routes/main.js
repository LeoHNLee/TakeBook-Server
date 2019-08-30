const express = require('express');
const fs = require('fs');
const postrequest = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');

const mysql_connetion = require('../bin/mysql_connetion');

const router = express.Router();
const analysis_server_address = `http://127.0.0.1:5901`;
const es_server_address = `http://127.0.0.1:5902`;

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';
let s3 = new aws.S3();
var db = new aws.DynamoDB.DocumentClient();
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

            (async (response_body) => {
                let analysis_result = {};

                //도서 분석 요청
                await new Promise((resolve, reject) => {

                    // 도서 분석 요청 request form
                    let form = {
                        method: 'POST',
                        uri: `${analysis_server_address}/result`,
                        body: {
                            'filename': filename,
                        },
                        json: true
                    }

                    postrequest.post(form, (err, httpResponse, response) => {
                        if (err) {
                            // 요청 에러
                            response_body.is_error = true;
                            response_body.error_code = 1;
                            analysis_result = false;
                            resolve("analysis_requset_error")
                        }
                        else {
                            let is_error = response.is_error;

                            if (is_error) {
                                console.log("분석 요청 오류");
                                response_body.is_error = is_error
                                response_body.error_code = 1
                                analysis_result = false;
                                resolve("analysis_requset_fail");
                            } else {
                                analysis_result = response;
                                resolve("analysis_requset_success!");
                            }
                        }
                    });
                });

                if (!analysis_result) {
                    res.json(response_body);
                    return;
                }

                let elasticsearch_result = {};
                // 분석 결과값 elastic_search 검색요청.
                await new Promise((resolve, reject) => {
                    //request form
                    const form = {
                        method: 'POST',
                        uri: `${es_server_address}/search`,
                        body: {
                            'result': analysis_result.result,
                        },
                        json: true
                    }

                    postrequest.post(form, (err, httpResponse, response) => {
                        if (err) {
                            // 요청 에러
                            resolve("elasticsearch_requset_failed")
                            response_body.is_error = true;
                            response_body.result = 3;
                            elasticsearch_result = false;
                            return;
                        }

                        let is_find = response.hits.total;
                        if (is_find === 0) {
                            response_body.is_error = true;
                            response_body.result = 3;
                            elasticsearch_result = false;
                            resolve("elasticsearch_requset_success");
                            return;
                        } else {
                            elasticsearch_result = response.hits.hits[0]._source;
                            resolve("elasticsearch_requset_success");
                        }
                    });
                });
                if (!elasticsearch_result) {
                    res.json(response_body);
                    return;
                }

                //database 에검색
                await new Promise((resolve, reject) => {
                    let search_isbn = elasticsearch_result.isbn;

                    // mysql_connetion.query(`SELECT * FROM book WHERE isbn=${search_isbn};`, (err, results, fields) => {
                    //     if (err) {
                    //         console.log(err);
                    //         resolve("mysql_requset_failed");
                    //         return;
                    //     }

                    //     if (results.length) {
                    //         for (let key in results[0]) {
                    //             let upperkey = key.toLowerCase();
                    //             response_body[upperkey] = results[0][key];
                    //         }
                    //     }
                    //     response_body.is_error = false;
                    //     res.json(response_body)
                    //     resolve("mysql_requset_success");
                    //     return;
                    // })

                    let keyorder = ['isbn', 'title', 'author', 'translator',
                        'publisher', 'published_date', 'url_alladin',
                        'image_url', 'contents', 'discriptions']
                    var params = {
                        TableName: "book",
                        Key: {
                            isbn: '9788981793418'
                        },
                        AttributesToGet: keyorder
                    }

                    db.get(params, function (err, data) {
                        if (err) {
                            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                            resolve("database_requset_failed");
                        } else {
                            response_body.is_error = false;
                            for (let key in keyorder) {
                                if (data["Item"][keyorder[key]]) {
                                    response_body[keyorder[key]] = data["Item"][keyorder[key]];
                                }
                            }
                            res.json(response_body)
                            resolve("database_requset_success");
                        }
                    });
                });

            })(response_body);

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

            (async (response_body) => {
                await new Promise((resolve, reject) => {
                    //요청을 보낼 request form
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

                });
            })(response_body);

        } else {
            console.log("form 값 오류");
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })

});


router.get('/save', (req, res) => {

    (async () => {
        let mysql_data = [];
        await new Promise((resolve, reject) => {
            mysql_connetion.query(`select TITLE,ISBN, IMAGE_URL from book where PUBLISHED_DATE like '201801%'`, (err, results, fields) => {
                mysql_data = results;
            })
        })
        let keyorder = ['isbn', 'title', 'author', 'translator',
            'publisher', 'published_date', 'url_alladin',
            'image_url', 'contents', 'discriptions']
        var params = {
            TableName: "book",
            Key: {
                isbn: '9788981793418'
            },
            AttributesToGet: keyorder
        }

        db.get(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                resolve("database_requset_failed");
            } else {
                response_body.is_error = false;
                for (let key in keyorder) {
                    if (data["Item"][keyorder[key]]) {
                        response_body[keyorder[key]] = data["Item"][keyorder[key]];
                    }
                }
                res.json(response_body)
                resolve("database_requset_success");
            }
        });

        // for (let key in mysql_data) {
        //     await new Promise((resolve, reject) => {
        //         //다른 서버에 요청을 보낼 request form
        //         let form = {
        //             method: 'POST',
        //             uri: `${es_server_address}/save`,
        //             body: {},
        //             json: true
        //         }

        //         form.body.title = mysql_data[key].TITLE;
        //         form.body.isbn = mysql_data[key].ISBN;
        //         form.body.fileurl = mysql_data[key].IMAGE_URL;

        //         postrequest.post(form, (err, httpResponse, response) => {
        //             if (err) {
        //                 console.log(err);
        //             }
        //         })
        //     });
        // }
    })();

})

module.exports = router;
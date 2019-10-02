const express = require('express');
const fs = require('fs');
const request = require('request');
const aws = require('aws-sdk');
const router = express.Router();

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';
let s3 = new aws.S3();
const user_bucket = 'takebook-user-bucket';
const image_bucket = 'takebook-book-image';

const message = require("../bin/message");
const host = require('../config/host');

router.get('/UserBook', (req, res) => {

    let response_body = {}

    let isbn_list = req.query.isbn_list;
    let keyword = req.query.keyword;
    let category = req.query.category;
    let sort_key = req.query.sort_key;
    let sort_method = req.query.sort_method;


    //book 정보 가져오기
    let book_server_request_form = {
        method: 'GET',
        uri: `${host.book_server}/SearchInISBN`,
        qs: {
            isbn_list: isbn_list,
            keyword: keyword,
            category: category,
            sort_key: sort_key,
            sort_method: sort_method
        },
        json: true
    }

    //도서 정보 요청
    request.get(book_server_request_form, (err, httpResponse, response) => {
        if (err) {
            //내부 서버 오류
            message.set_result_message(response_body, "ES002");
            res.json(response_body);
            return;
        }
        res.json(response)
    })

});

router.get('/CheckISBNExists', (req, res) => {
    let response_body = {};
    let isbn = req.query.isbn;

    if (isbn) {
        //isbn 존제 여부 확인.
        let internal_server_request_form = {
            method: 'GET',
            uri: `${host.book_server}/CheckISBNExists`,
            qs: {
                isbn: isbn
            },
            json: true
        }

        request.get(internal_server_request_form, (err, httpResponse, response) => {
            let result_code = "";
            if (err) {
                //Book 서버 오류.
                result_code = "ES002";
            } else {
                switch (response.Result_Code) {
                    case "RS000":
                    case "EC005":
                    case "EC005": {
                        result_code = response.Result_Code;
                        break;
                    }
                    case "EC001": {
                        result_code = "ES004";
                        break;
                    }
                    default: {
                        //error error
                        result_code = "EE000";
                        break;
                    }
                }
            }
            message.set_result_message(response_body, result_code);
            res.json(response_body);
        });
    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
    }
})

router.get('/AnalyzeImage', (req, res) => {
    let response_body = {};

    let user_id = req.query.user_id;
    let image_id = req.query.image_id;
    let image_url = req.query.image_url;


    if (!(user_id && image_id && image_url)) {
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
        return;
    }

    function update_registered_image_state() {

        //등록이미지 수정 requset_form
        let account_server_request_form = {
            method: 'PUT',
            uri: `${host.account_server}/RegisteredImage`,
            body: {
                user_id: user_id,
                image_id: image_id
            },
            json: true
        }

        //도서 정보 요청
        request.put(account_server_request_form, (err, httpResponse, response) => {
            if (err) {
                //유저 서버 오류
                console.log("update registered image state fail");
                return;
            }
            console.log("update registered image state success");
        })
    }

    (async () => {

        let analysis_result = null;

        await new Promise((resolve, reject) => {
            //book 정보 가져오기
            let analysis_server_request_form = {
                method: 'GET',
                uri: `${host.analysis_server}/UrlAnalyze`,
                qs: {
                    image_url: image_url
                },
                json: true
            }

            //도서 정보 요청
            request.get(analysis_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    //내부 서버 오류
                    reject("ES001")
                    return;
                }
                resolve(response)
            })
        }).then(response => {
            switch (response.Result_Code) {
                case "RS000": {
                    analysis_result = response.Response;
                    break;
                }
                default: {
                    //분석 서버 오류
                    message.set_result_message(response_body, "ES001");
                    break;
                }
            }
        }).catch(error_code => {
            message.set_result_message(response_body, error_code);
        });


        if (!analysis_result) {
            //분석 실패
            console.log("analysis fail");
            update_registered_image_state();
            res.json(response_body);
            return;
        }


        //특성 매칭 결과.
        let feature_matching_result = null;

        //특성 분석이 성공한 경우에만 매칭 실시
        await new Promise((resolve, reject) => {

            let es_server_request_form = {
                method: 'POST',
                uri: `${host.es_server}/SeacrhFeature`,
                body: {
                    img_feature: 'dummy',
                    text_feature: 'dummy'
                },
                json: true
            }


            request.post(es_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    //내부 서버 오류
                    reject("ES001")
                    return;
                }
                resolve(response)
            })

        }).then(response => {
            switch (response.Result_Code) {
                case "RS000": {
                    feature_matching_result = response.Response;
                    break;
                }
                default: {
                    //특성 매칭 서버 오류
                    message.set_result_message(response_body, "ES003");
                    break;
                }
            }
        }).catch(error_code => {
            switch (error_code) {
                case "EC001": //필수 파라미터 누락
                case "ES012": {//es 데이터 서버 오류
                    message.set_result_message(response_body, "ES002");
                    break;
                }
                default: {
                    //무슨 에러인지 모른경우.
                    message.set_result_message(response_body, error_code);
                    console.log(error_code)
                }
            }
        });


        if (!feature_matching_result) {
            //매칭 실패
            console.log("feature matching fail");
            update_registered_image_state();
            res.json(response_body);
            return;
        }

        let account_server_result = null;

        //특성 매칭이 성공한 경우에만 책 정보 등록.
        await new Promise((resolve, reject) => {

            let account_server_request_form = {
                method: 'POST',
                uri: `${host.account_server}/AddUserBook`,
                body: {
                    user_id: user_id
                },
                json: true
            }


            for (let value in feature_matching_result) {
                account_server_request_form.body[value] = feature_matching_result[value];
            }

            //책 저장
            request.post(account_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    //유저 서버 오류
                    reject("ES000")
                    return;
                }
                resolve(response)
            })

        }).then(response => {
            switch (response.Result_Code) {
                case "RS000": {
                    // 요청 성공
                    account_server_result = true;
                    break;
                }
                case "EC001": {
                    // 필수 파라미터 누락
                    message.set_result_message(response_body, "ES004");
                    break;
                }
                case "ES010": {
                    // user db 오류
                    message.set_result_message(response_body, "ES011");
                    break;
                }
            }
        }).catch(error_code => {
            switch (error_code) {
                case "ES000": {
                    //account server 오류
                    message.set_result_message(response_body, "ES000");
                    break;
                }
            }
        })

        if (!account_server_result) {
            //데이터 저장 실패
            console.log("save book data fail");
            update_registered_image_state();
            res.json(response_body);
            return;
        }

        //등록이미지 삭제.
        await new Promise((resolve, reject) => {
            //등록이미지 삭제 requset_form
            let account_server_request_form = {
                method: 'DELETE',
                uri: `${host.account_server}/RegisteredImage`,
                body: {
                    user_id: user_id,
                    image_id: image_id
                },
                json: true
            }

            //도서 정보 요청
            request.delete(account_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    //유저 서버 오류
                    reject("ES000")
                    return;
                }
                resolve(response)
            })

        }).then(response => {
            switch (response.Result_Code) {
                case "RS000": {
                    // 요청 성공
                    message.set_result_message(response_body, "RS000");
                    break;
                }
                case "EC001": {
                    // 필수 파라미터 누락
                    message.set_result_message(response_body, "ES004");
                    break;
                }
                case "ES001": {
                    // account server 오류
                    message.set_result_message(response_body, "ES001");
                    break;
                }
                case "ES010": {
                    // user db 오류
                    message.set_result_message(response_body, "ES010");
                    break;
                }
            }
        }).catch(error_code => {
            message.set_result_message(response_body, error_code);
        })

        //s3 분석 이미지 삭제.
        await new Promise((resolve, reject) => {

            var params = {
                Bucket: image_bucket,
                Key: `${image_id}.jpg`
            };

            s3.deleteObject(params, function (err, data) {
                if (err) {
                    reject(err)
                    //S3 서버 오류
                } else {
                    resolve("success")
                }
            });
        }).catch(err => {
            console.log(err)
        });

        console.log("success")
        res.json(response_body);


    })(); //async exit

})


//책 리스트 불러오기
//미완성
router.put('/UserBook', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;
        let modify_isbn = req.body.modify_isbn;

        if (isbn && modify_isbn) {
            (async () => {

                let isbn_check_result = null;

                await new Promise((resolve, reject) => {

                    mysql_connetion.query(`select isbn from registered_book where user_id = ? and isbn = ?`, [user_id, isbn], (err, results, fields) => {
                        if (err) {
                            //User DB 서버 오류
                            reject("ES010");
                        } else {
                            if (results.length) {
                                //해당 isbn 존제
                                resolve("success");
                            } else {
                                //일치하는 isbn 없음.
                                reject("EC005");
                            }
                        }

                    });
                }).then(result => {
                    isbn_check_result = result;
                }).catch(error_code => {
                    message.set_result_message(response_body, error_code);
                });

                if (!isbn_check_result) {
                    res.json(response_body);
                    return;
                }

                await new Promise((resolve, reject) => {
                    //modify_isbn 존제 여부 확인.
                    let internal_server_request_form = {
                        method: 'GET',
                        uri: `${host.internal_server}/CheckISBNExists`,
                        qs: {
                            isbn: modify_isbn
                        },
                        json: true
                    }

                    request.get(internal_server_request_form, (err, httpResponse, response) => {
                        if (err) {
                            reject("ES004");
                            // response_body.Result_Code = "ES004";
                            // response_body.Message = "Internal Server Error";
                        } else {
                            resolve(response);
                        }
                    });
                });


            })();



        } else {
            //필수 파라미터 누락
            response_body.Result_Code = "EC001";
            response_body.Message = "invalid parameter error";
            res.json(response_body);
        }
    } else {
        //권한 없는 토큰.
        response_body.Result_Code = "EC002";
        response_body.Message = "Unauthorized token";
        res.send(response_body);
    }
});

module.exports = router;

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

const account_server_address = 'http://127.0.0.1:5900';
const analysis_server_address = 'http://127.0.0.1:5901';
const es_server_address = 'http://127.0.0.1:5902';
const book_server_address = 'http://127.0.0.1:5903';

const es_address = 'http://54.180.49.131:9200';


function email_parser(user_id) {
    let text = user_id;

    if (text.indexOf('@') !== -1) {
        text = text.substring(0, text.indexOf('@'))
    }
    return text;
}

router.get('/UserBook', (req, res) => {

    let isbn_list = req.query.isbn_list;
    let keyword = (req.query.keyword) ? req.query.keyword : null;
    let category = (req.query.category) ? req.query.category : null;
    let max_count = (req.query.max_count) ? req.query.max_count : null;
    let sort_key = (req.query.sort_key) ? req.query.sort_key : null;
    let sort_method = (req.query.sort_method) ? req.query.sort_method : null;

    let query_key = {
        keyword: keyword,
        category: category,
        max_count: max_count,
        sort_key: sort_key,
        sort_method: sort_method
    }

    //book 정보 가져오기
    let internal_server_request_form = {
        method: 'GET',
        uri: `${book_server_address}/SearchInISBN`,
        qs: {
            isbn_list: isbn_list
        },
        json: true
    }

    for (let key in query_key) {
        if (query_key[key]) {
            internal_server_request_form.qs[key] = query_key[key];
        }
    }

    //도서 정보 요청
    request.get(internal_server_request_form, (err, httpResponse, response) => {
        if (err) {
            //내부 서버 오류
            message.set_result_message(response_body,"ES011");
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
            uri: `${book_server_address}/CheckISBNExists`,
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
                result_code = "response.Result_Code";
            }
            message.set_result_message(response_body,"ES002");
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
    let file_name = req.query.file_name;
    let image_url = req.query.image_url;


    if (!(user_id && file_name && image_url)) {
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
        return;
    }

    (async () => {

        let analysis_result = null;

        await new Promise((resolve, reject) => {
            //book 정보 가져오기
            let analysis_server_request_form = {
                method: 'GET',
                uri: `${analysis_server_address}/UrlAnalyze`,
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
                    message.set_result_message(response_body,"ES001");
                    break;
                }
            }
        }).catch(error_code => {
            message.set_result_message(response_body, error_code);
        });


        //특성 매칭 결과.
        let feature_analysis_result = null;

        //특성 매칭
        if (analysis_result) {
            await new Promise((resolve, reject) => {
                //book 정보 가져오기
                let es_server_request_form = {
                    method: 'POST',
                    uri: `${es_server_address}/SeacrhFeature`,
                    body: {
                        img_feature: analysis_result.image,
                        text_feature: analysis_result.text
                    },
                    json: true
                }

                //도서 정보 요청
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
                        feature_analysis_result = response.Response;
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
                        message.set_result_message(response_body, "ES001");
                        break;
                    }
                    default: {
                        //무슨 에러인지 모른경우.
                        message.set_result_message(response_body, error_code);
                        console.log(error_code)
                    }
                }
            });
        }

        let account_server_result = null;

        //데이터 저장
        if (feature_analysis_result) {

            await new Promise((resolve, reject) => {
                //book 정보 가져오기
                let account_server_request_form = {
                    method: 'POST',
                    uri: `${account_server_address}/AddUserBook`,
                    body: {
                        user_id: user_id
                    },
                    json: true
                }


                for (let value in feature_analysis_result) {
                    account_server_request_form.body[value] = feature_analysis_result[value];
                }

                //도서 정보 요청
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
                        account_server_result = "success";
                        break;
                    }
                    case "EC001": {
                        // 필수 파라미터 누락
                        response_body.Result_Code = "ES004";
                        response_body.Message = "Internal Server Error";
                        break;
                    }
                    case "ES010": {
                        // user db 오류
                        response_body.Result_Code = "ES011";
                        response_body.Message = "User DataBase Server Error";
                        break;
                    }
                }
            }).catch(error_code => {
                switch (error_code) {
                    case "ES000": {
                        //필수 파라미터 누락
                        response_body.Result_Code = "ES000";
                        response_body.Message = "Internal Server Error";
                        break;
                    }
                }
            })
        }

        // 등록중인 이미지 삭제
        if (account_server_result) {
            //검색 완료된 등록이미지 삭제
            await new Promise((resolve, reject) => {

                //등록이미지 삭제 requset_form
                let account_server_request_form = {
                    method: 'DELETE',
                    uri: `${account_server_address}/RegisteredImage`,
                    body: {
                        user_id: user_id,
                        file_name: file_name
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

            await new Promise((resolve, reject) => {

                var params = {
                    Bucket: image_bucket,
                    Key: `${email_parser(user_id)}-${file_name}`
                };
    
                s3.deleteObject(params, function (err, data) {
                    if (err) {
                        
                        reject(err)
                        //S3 서버 오류
                    } else {
                        resolve("success")
                    }
                });
            }).catch(err=>{
                console.log(err)
            });
            
        }
        else {
            //검색 실패된 등록이미지 수정
            await new Promise((resolve, reject) => {

                //등록이미지 수정 requset_form
                let account_server_request_form = {
                    method: 'PUT',
                    uri: `${account_server_address}/RegisteredImage`,
                    body: {
                        user_id: user_id,
                        file_name: file_name
                    },
                    json: true
                }

                //도서 정보 요청
                request.put(account_server_request_form, (err, httpResponse, response) => {
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
                        message.set_result_message(response_body,"RS001" , "Bas Request");
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
                message.set_result_message(response_body, "ES000");
            })
        }

        res.json(response_body);

    })();

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
                        uri: `${internal_server_address}/CheckISBNExists`,
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

const express = require('express');
const request = require('request');
const moment = require('moment-timezone');

const router = express.Router();

const log_register = require("../bin/log_register");
const message = require("../bin/message");

const host = require('../config/host');

let log = new log_register();

router.get('/UserBook', [log.regist_request_log],  (req, res) => {

    let response_body = {}

    let isbn_list = req.query.isbn_list;
    let keyword = req.query.keyword;
    let category = req.query.category;
    let sort_key = req.query.sort_key;
    let sort_method = req.query.sort_method;

    let qs = {
        keyword,
        category,
        sort_key,
        sort_method
    }
    
    //book 정보 가져오기
    let book_server_request_form = {
        method: 'GET',
        uri: `${host.book_server}/SearchInISBN`,
        qs: {
            isbn_list: isbn_list
        },
        json: true
    }

    //url 값 담기
    for (let i in qs) {
        if (qs[i]) {
            book_server_request_form.qs[i] = qs[i];
        }
    }

    //도서 정보 요청
    request.get(book_server_request_form, (err, httpResponse, response) => {
        if (err) {
            //내부 서버 오류
            message.set_result_message(response_body, "ES002");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response)
    })

});

router.get('/CheckISBNExists', [log.regist_request_log], (req, res) => {
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
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
        });
    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
})

router.get('/AnalyzeBookImage', [log.regist_request_log], (req, res) => {
    let response_body = {};

    let image_url = req.query.image_url;


    if (!image_url) {
        message.set_result_message(response_body, "EC001");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
        return;
    }

    //책 분석 요청
    let analysis_server_request_form = {
        method: 'GET',
        uri: `${host.analysis_server}/BookImageAnalyze`,
        qs: {
            image_url: image_url
        },
        json: true
    }

    request.get(analysis_server_request_form, (err, httpResponse, response) => {
        if (err) {
            //내부 서버 오류
            console.log(err)
            message.set_result_message(response_body, "ES001");
            return;
        }
        switch (response.Result_Code) {
            case "RS000": {
                //분석 성공
                console.log("book feature analysis success");
                response_body = response;
                break;
            }
            case "EP000": {
                //분석 실패
                console.log("book feature analysis fail");
                message.set_result_message(response_body, "ES001");
                break;
            }
            case "EP001": {
                //분석 실패
                console.log("book feature analysis fail");
                message.set_result_message(response_body, "ES001");
                break;
            }
            default: {
                //분석 실패
                console.log("book feature analysis fail");
                message.set_result_message(response_body, "ES001");
                break;
            }
        }

        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    });

})

router.get('/AnalyzeScrapImage', [log.regist_request_log], (req, res) => {
    let response_body = {};

    let image_url = req.query.image_url;


    if (!image_url) {
        message.set_result_message(response_body, "EC001");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
        return;
    }

    //책 분석 요청
    let analysis_server_request_form = {
        method: 'GET',
        uri: `${host.analysis_server}/ScrapImageAnalyze`,
        qs: {
            image_url: image_url
        },
        json: true
    }

    request.get(analysis_server_request_form, (err, httpResponse, response) => {
        if (err) {
            //내부 서버 오류
            console.log(err)
            message.set_result_message(response_body, "ES001");
        }
        else{
            switch (response.Result_Code) {
                case "RS000": {
                    //분석 성공
                    console.log("scrap image analysis success");
                    response_body = response;
                    break;
                }
                case "EP000": {
                    //분석 실패
                    console.log("scrap image analysis fail");
                    message.set_result_message(response_body, "ES001");
                    break;
                }
                case "EP001": {
                    //분석 실패
                    console.log("scrap image analysis fail");
                    message.set_result_message(response_body, "ES001");
                    break;
                }
                default: {
                    //분석 실패
                    console.log("scrap image analysis fail");
                    message.set_result_message(response_body, "ES001");
                    break;
                }
            } 
        }


        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    });

})



//책 리스트 불러오기
//미완성
// router.put('/UserBook', (req, res) => {

//     const response_body = {};

//     let token = req.headers.authorization;
//     let decoded = jwt_token.token_check(token);

//     if (decoded) {
//         let user_id = decoded.id;
//         let isbn = req.body.isbn;
//         let modify_isbn = req.body.modify_isbn;

//         if (isbn && modify_isbn) {
//             (async () => {

//                 let isbn_check_result = null;

//                 await new Promise((resolve, reject) => {

//                     mysql_connetion.query(`select isbn from registered_book where user_id = ? and isbn = ?`, [user_id, isbn], (err, results, fields) => {
//                         if (err) {
//                             //User DB 서버 오류
//                             reject("ES010");
//                         } else {
//                             if (results.length) {
//                                 //해당 isbn 존제
//                                 resolve("success");
//                             } else {
//                                 //일치하는 isbn 없음.
//                                 reject("EC005");
//                             }
//                         }

//                     });
//                 }).then(result => {
//                     isbn_check_result = result;
//                 }).catch(error_code => {
//                     message.set_result_message(response_body, error_code);
//                 });

//                 if (!isbn_check_result) {
//                     res.json(response_body);
//                     return;
//                 }

//                 await new Promise((resolve, reject) => {
//                     //modify_isbn 존제 여부 확인.
//                     let internal_server_request_form = {
//                         method: 'GET',
//                         uri: `${host.internal_server}/CheckISBNExists`,
//                         qs: {
//                             isbn: modify_isbn
//                         },
//                         json: true
//                     }

//                     request.get(internal_server_request_form, (err, httpResponse, response) => {
//                         if (err) {
//                             reject("ES004");
//                             // response_body.Result_Code = "ES004";
//                             // response_body.Message = "Internal Server Error";
//                         } else {
//                             resolve(response);
//                         }
//                     });
//                 });


//             })();



//         } else {
//             //필수 파라미터 누락
//             response_body.Result_Code = "EC001";
//             response_body.Message = "invalid parameter error";
//             res.json(response_body);
//         }
//     } else {
//         //권한 없는 토큰.
//         response_body.Result_Code = "EC002";
//         response_body.Message = "Unauthorized token";
//         res.send(response_body);
//     }
// });

module.exports = router;

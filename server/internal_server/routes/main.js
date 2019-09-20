const express = require('express');
const fs = require('fs');
const request = require('request');
const router = express.Router();

const es_address = 'http://54.180.49.131:9200';
const es_server_address = 'http://127.0.0.1:5902';
const book_server_address = 'http://127.0.0.1:5903';
const analysis_server_address = 'http://127.0.0.1:5901';


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
            response_body.Result_Code = "ES011";
            response_body.Message = "Book DataBase Server Error";
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
            if (err) {
                //Book 서버 오류.
                response_body.Result_Code = "ES004";
                response_body.Message = "Internal Server Error";
            } else {
                switch (response.Result_Code) {
                    case ("RS000"): {
                        //일치하는 isbn 존재
                        response_body.Result_Code = "RS000";
                        response_body.Message = "Response Success";
                        break;
                    }
                    case ("EC001"): {
                        //필수 파라미터 누락
                        response_body.Result_Code = "EC001";
                        response_body.Message = "invalid parameter error";
                        break;
                    }
                    case ("EC005"): {
                        //존재하지 않는 isbn
                        response_body.Result_Code = "EC005";
                        response_body.Message = "Not Exist Parameter Info";
                        break;
                    }
                    case ("ES011"): {
                        //book db서버 오류
                        response_body.Result_Code = "ES011";
                        response_body.Message = "Book DataBase Server Error";
                        break;
                    }
                }
            }
            res.json(response_body);
        });
    } else {
        //필수 파라미터 누락
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";
        res.json(response_body);
    }
})

//책 리스트 불러오기
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

                let isbn_check_result = "";

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
                    switch (error_code) {
                        case "ES010": {
                            //User DB 서버 오류
                            response_body.Result_Code = "ES010";
                            response_body.Message = "iDataBase Server Error";
                            break;
                        }
                        case "EC005": {
                            //일치하는 isbn 없음.
                            response_body.Result_Code = "EC005";
                            response_body.Message = "Not Exist ISBN Parameter Info";
                            break;
                        }
                    }
                    isbn_check_result = null;
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

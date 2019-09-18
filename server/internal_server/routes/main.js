const express = require('express');
const fs = require('fs');
const request = require('request');
const router = express.Router();

const es_address = 'http://54.180.49.131:9200';
const es_server_address = 'http://127.0.0.1:5902';
const book_server_address = 'http://127.0.0.1:5903';
const analysis_server_address = 'http://127.0.0.1:5901';


router.get('/', (req, res) => {
    //다른 서버에 요청을 보낼 request form
    const form = {
        method: 'GET',
        uri: `${es_address}/bank`,
        // json: true
    }

    //도서 분석 요청
    request.get(form, (err, httpResponse, response) => {
        if (err) {
            return console.error('response failed:', err);
        }
        // respone 는 string로 옮, json으로 변형시켜줘야함
        var result = JSON.parse(response)
        console.log(result)
        console.log(typeof (result))
        res.json(result)
    })

});

router.post('/SaveFeature', (req, res) => {

    let respone_body = {}

    let isbn = req.body.isbn;

    if (!isbn) {
        //필수 파라미터 누락
        respone_form.Result_Code = "EC001";
        respone_form.Message = "invalid parameter error";
        res.json(respone_form)
        return;
    }

    //비동기적 실행
    (async () => {
        //book 정보 가져오기
        let book_server_request_form = {
            method: 'GET',
            uri: `${book_server_address}/DetaillInfo`,
            qs: {
                isbn: isbn
            },
            json: true
        }

        let book_server_response = "";
        await new Promise((resolve, reject) => {
            //도서 분석 요청
            request(book_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    console.log(err)
                    reject("book server error.");
                    return;
                }

                book_server_response = response;
                resolve("book server response success");
                return;
            })
        }).catch((err) => {
            respone_body.Result_Code = "ES002";
        })

        if (book_server_response.Result_Code != "RS000") {

            switch (book_server_response.Result_Code) {
                case "EC005":
                    //일치하는 isbn 없음.
                    respone_body.Result_Code = "EC005";
                    respone_body.Message = "Not Exist Parameter Info";
                    break;
                case "ES011":
                    //book db 서버 오류
                    respone_body.Result_Code = "ES011";
                    respone_body.Message = "Book DataBase Server Error";
                    break;
                case "ES002":
                    respone_body.Message = "Book Server Error";
                    break;
            }
            res.json(respone_body);
            return;
        }

        //book url분석하기
        let analysis_server_request_form = {
            method: 'GET',
            uri: `${analysis_server_address}/UrlAnalyze`,
            qs: {
                image_url: book_server_response.Response.image_url
            },
            json: true
        }

        let analysis_server_response = "";

        await new Promise((resolve, reject) => {
            //도서 분석 요청
            request(analysis_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    console.log(err)
                    reject("analysis server error.");
                    return;
                }

                analysis_server_response = response;
                resolve("analysis server response success");
                return;
            })
        }).catch((err) => {
            respone_body.Result_Code = "ES001";
        })

        if (analysis_server_response.Result_Code != "RS000") {

            switch (analysis_server_response.Result_Code) {
                case "ES001":
                    respone_body.Message = "Analysis Server Error";
                    break;
            }
            res.json(respone_body);
            return;
        }

        let elasticsearch_server_response = "";

        //elasticsearch doc 등록
        let elasticsearch_server_request_form = {
            method: 'POST',
            uri: `${es_address}/book/_doc`,
            body: {
                isbn: isbn,
                kor_feature: analysis_server_response.Response.text.kor,
                eng_feature: analysis_server_response.Response.text.eng
            },
            json: true
        }

        await new Promise((resolve, reject) => {
            //도서 분석 요청
            request.post(elasticsearch_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    console.log(err)
                    reject("elasticsearch database server error.");
                    return;
                }

                elasticsearch_server_response = response;
                resolve("elasticsearch database response success");
                return;
            })
        }).catch((err) => {
            respone_body.Result_Code = "ES012";
        })

        if (!elasticsearch_server_response.error) {
            respone_body.Result_Code = "RS000";
            respone_body.Message = "Response Success";
            res.json(respone_body);
        }

    })();

});

router.post('/SearchFeature', (req, res) => {

    let respone_body = {}

    let isbn = req.body.isbn;

    if (!isbn) {
        //필수 파라미터 누락
        respone_form.Result_Code = "EC001";
        respone_form.Message = "invalid parameter error";
        res.json(respone_form)
        return;
    }

    //비동기적 실행
    (async () => {
        //book 정보 가져오기
        let book_server_request_form = {
            method: 'GET',
            uri: `${book_server_address}/DetaillInfo`,
            qs: {
                isbn: isbn
            },
            json: true
        }

        let book_server_response = "";
        await new Promise((resolve, reject) => {
            //도서 분석 요청
            request(book_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    console.log(err)
                    reject("book server error.");
                    return;
                }

                book_server_response = response;
                resolve("book server response success");
                return;
            })
        }).catch((err) => {
            respone_body.Result_Code = "ES002";
        })

        if (book_server_response.Result_Code != "RS000") {

            switch (book_server_response.Result_Code) {
                case "EC005":
                    //일치하는 isbn 없음.
                    respone_body.Result_Code = "EC005";
                    respone_body.Message = "Not Exist Parameter Info";
                    break;
                case "ES011":
                    //book db 서버 오류
                    respone_body.Result_Code = "ES011";
                    respone_body.Message = "Book DataBase Server Error";
                    break;
                case "ES002":
                    respone_body.Message = "Book Server Error";
                    break;
            }
            res.json(respone_body);
            return;
        }

        //book url분석하기
        let analysis_server_request_form = {
            method: 'post',
            uri: `${analysis_server_address}/UrlAnalyze`,
            qs: {
                image_url: book_server_response.Response.image_url
            },
            json: true
        }

        let analysis_server_response = "";

        await new Promise((resolve, reject) => {
            //도서 분석 요청
            request(analysis_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    console.log(err)
                    reject("analysis server error.");
                    return;
                }

                analysis_server_response = response;
                resolve("analysis server response success");
                return;
            })
        }).catch((err) => {
            respone_body.Result_Code = "ES001";
        })

        if (analysis_server_response.Result_Code != "RS000") {

            switch (analysis_server_response.Result_Code) {
                case "ES001":
                    respone_body.Message = "Analysis Server Error";
                    break;
            }
            res.json(respone_body);
            return;
        }

        res.json(analysis_server_response)

    })();

});


router.get('/InsertData', (req, res) => {

    let respone_body = {};

    //비동기적 실행
    (async () => {
        //book 정보 가져오기
        let book_server_request_form = {
            method: 'GET',
            uri: `${book_server_address}/Query`,
            json: true
        }

        let book_server_response = "";
        await new Promise((resolve, reject) => {
            //도서 분석 요청
            request(book_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    console.log(err)
                    reject("book server error.");
                    return;
                }

                book_server_response = response;
                resolve("book server response success");
                return;
            })
        }).catch((err) => {
            respone_body.Result_Code = "ES002";
        })

        if (book_server_response.Result_Code != "RS000") {

            switch (book_server_response.Result_Code) {
                case "EC005":
                    //일치하는 isbn 없음.
                    respone_body.Result_Code = "EC005";
                    respone_body.Message = "Not Exist Parameter Info";
                    break;
                case "ES011":
                    //book db 서버 오류
                    respone_body.Result_Code = "ES011";
                    respone_body.Message = "Book DataBase Server Error";
                    break;
                case "ES002":
                    respone_body.Message = "Book Server Error";
                    break;
            }
            res.json(respone_body);
            return;
        }

        for (let count in book_server_response.Response.isbn) {
            await new Promise((resolve, reject) => {

                //도서 분석 요청
                let request_form = {
                    method: 'POST',
                    uri: `${es_server_address}/SaveFeature`,
                    body:{
                        isbn: book_server_response.Response.isbn[count]
                    },
                    json: true
                }

                //도서 분석 요청
                request.post(request_form, (err, httpResponse, response) => {
                    if (err) {
                        console.log(err)
                        reject("analysis server error.");
                        return;
                    }

                    analysis_server_response = response;
                    resolve("analysis server response success");
                    return;
                })

            }).catch((err) => {
                respone_body.Result_Code = "ES001";
            })

            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    console.log(`${book_server_response.Response.isbn[count]} is success!`);
                    resolve("success!");
                }, 1000);
            });

        }

        res.send("success!");
    })();

});

router.post('/search', (req, res) => {

    let strArray = req.body.result.split(' ')

    while (true) {
        var search = strArray.indexOf('');
        if (search != -1) {
            strArray.splice(search, 1);
        } else {
            break;
        }
    }

    const esform = {
        method: 'POST',
        uri: `${es_address}/red/book/_search`,
        body: {
        },
        json: true
    }

    const query = {
        query: {
            bool: {
                should: []
            }
        }
    }
    for (var st in strArray) {
        var form = {
            "wildcard": {
                "result": {}
            }
        };

        form.wildcard.result.value = `*${strArray[st]}*`;

        query.query.bool.should.push(form)
    }

    esform.body = query

    request.get(esform, (err, httpResponse, response) => {
        if (err) {
            console.log(err);
        }
        res.json(response);
    })

});



module.exports = router;

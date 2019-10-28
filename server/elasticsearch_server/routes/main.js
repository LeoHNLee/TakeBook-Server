const express = require('express');
const fs = require('fs');
const request = require('request');
const router = express.Router();

const message = require('../bin/message');
const method = require('../bin/Method');
const es_client = require('../bin/Elasticsearch_Client');

router.get('/Book', (req, res) => {
    const response_body = {};

    let keyword = req.query.keyword;
    let category = req.query.category;

    if (!category || !keyword) {
        //파라미터 타입 오류 및 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
        return;
    }


    //파라미터 옮바른 값 확인.
    let check_list = {
        category: ["title", "author", "publisher"],
    }

    let params = { category};
    let check_result = method.params_check(params, check_list);

    if (check_result) {
        //파라미터 값 오류
        message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
        res.json(response_body);
        return;
    }
    
    let search_body = {
        index: "book",
        body: {
            from: 0,
            size: 10,
            query: {
                match: {}
            }
        }
    }

    switch(category){
        case "title":{
            search_body.body.query.match = {
                title: keyword
            }
            break;
        }
        case "author":{
            search_body.body.query.match = {
                author: keyword
            }
            break;
        }
        case "publisher":{
            search_body.body.query.match = {
                publisher: keyword
            }
            break;
        }
    }

    es_client.search(search_body, (err, result)=>{
        if(err){
            message.set_result_message(response_body, "ES012");
        }
        else{
            message.set_result_message(response_body, "RS000");
            response_body.Response ={
                count: result.hits.hits.length,
                item:[]
            }
            for(i in result.hits.hits){
                let book = result.hits.hits[i]._source;
                book.isbn = result.hits.hits[i]._id;
                response_body.Response.item.push(book)
            }
        }
        res.json(response_body)
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

// router.post('/SearchFeature', (req, res) => {

//     let respone_body = {}

//     let isbn = req.body.isbn;

//     if (!isbn) {
//         //필수 파라미터 누락
//         respone_form.Result_Code = "EC001";
//         respone_form.Message = "invalid parameter error";
//         res.json(respone_form)
//         return;
//     }

//     //비동기적 실행
//     (async () => {
//         //book 정보 가져오기
//         let book_server_request_form = {
//             method: 'GET',
//             uri: `${book_server_address}/DetaillInfo`,
//             qs: {
//                 isbn: isbn
//             },
//             json: true
//         }

//         let book_server_response = "";
//         await new Promise((resolve, reject) => {
//             //도서 분석 요청
//             request(book_server_request_form, (err, httpResponse, response) => {
//                 if (err) {
//                     console.log(err)
//                     reject("book server error.");
//                     return;
//                 }

//                 book_server_response = response;
//                 resolve("book server response success");
//                 return;
//             })
//         }).catch((err) => {
//             respone_body.Result_Code = "ES002";
//         })

//         if (book_server_response.Result_Code != "RS000") {

//             switch (book_server_response.Result_Code) {
//                 case "EC005":
//                     //일치하는 isbn 없음.
//                     respone_body.Result_Code = "EC005";
//                     respone_body.Message = "Not Exist Parameter Info";
//                     break;
//                 case "ES011":
//                     //book db 서버 오류
//                     respone_body.Result_Code = "ES011";
//                     respone_body.Message = "Book DataBase Server Error";
//                     break;
//                 case "ES002":
//                     respone_body.Message = "Book Server Error";
//                     break;
//             }
//             res.json(respone_body);
//             return;
//         }

//         //book url분석하기
//         let analysis_server_request_form = {
//             method: 'post',
//             uri: `${analysis_server_address}/UrlAnalyze`,
//             qs: {
//                 image_url: book_server_response.Response.image_url
//             },
//             json: true
//         }

//         let analysis_server_response = "";

//         await new Promise((resolve, reject) => {
//             //도서 분석 요청
//             request(analysis_server_request_form, (err, httpResponse, response) => {
//                 if (err) {
//                     console.log(err)
//                     reject("analysis server error.");
//                     return;
//                 }

//                 analysis_server_response = response;
//                 resolve("analysis server response success");
//                 return;
//             })
//         }).catch((err) => {
//             respone_body.Result_Code = "ES001";
//         })

//         if (analysis_server_response.Result_Code != "RS000") {

//             switch (analysis_server_response.Result_Code) {
//                 case "ES001":
//                     respone_body.Message = "Analysis Server Error";
//                     break;
//             }
//             res.json(respone_body);
//             return;
//         }

//         res.json(analysis_server_response)

//     })();

// });


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
                    body: {
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

router.post('/SeacrhFeature', (req, res) => {

    let response_body = {};

    let img_feature = req.body.img_feature;
    let text_feature = req.body.text_feature;

    if (img_feature && text_feature) {

        setTimeout(() => {
            message.set_result_message(response_body, "RS000")
            response_body.Response = {
                isbn: "9788967497385",
                second_candidate: "9791156931430",
                third_candidate: "9791157529957",
                fourth_candidate: "9791170280965",
                fifth_candidate: "9791186665435"
            };
            res.json(response_body);
        }, 10000);

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001")
        res.json(response_body);
    }
});

module.exports = router;

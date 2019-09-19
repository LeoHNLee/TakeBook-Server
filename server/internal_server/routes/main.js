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

module.exports = router;

const express = require('express');
const fs = require('fs');
const request = require('request');
const aws = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const moment = require('moment-timezone');

const mysql_pool = require('../bin/mysql_pool');
const message = require('../bin/message');
const host = require('../config/host');

const router = express.Router();

//현재시간 표시
function current_time() {
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

function get_db_query_results(query, values){
    if(values){
        return new Promise((resolve, reject)=>{

            mysql_pool.getConnection((err, conn)=>{
                if(err){
                    //db 오류
                    console.log(err)
                    conn.release();
                    reject("ES011")
                    return;
                }

                conn.query(query, values, (err, results, fields) => {
                    if (err) {
                        //db 오류
                        console.log(err)
                        reject("ES011")
                    }
                    else {
                        resolve(results)
                    }
                    //connection pool 반환
                    conn.release();
                })
            })
        });
    }else{
        return new Promise((resolve, reject)=>{
            mysql_pool.getConnection((err, conn)=>{
                if(err){
                    //db 오류
                    console.log(err)
                    conn.release();
                    reject("ES011")
                }

                conn.query(query, (err, results, fields) => {
                    if (err) {
                        //db 오류
                        console.log(err)
                        reject("ES011")
                    }   
                    else {
                        resolve(results)
                    }
                    //connection pool 반환
                    conn.release();
                })

            });
        });
    }
    
}


router.get('/Detail', (req, res) => {

    let response_body = {}

    let isbn = req.query.isbn;

    if (!isbn) {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body)
        return;
    }

    let query = `SELECT * FROM book WHERE isbn=${isbn};`;

    get_db_query_results(query).then(results=>{
        if (results.length) {
            message.set_result_message(response_body, "RS000");
            response_body.Response = {};

            for (let key in results[0]) {
                response_body.Response[key] = results[0][key];
            }
        }
        else {
            // 일치하는 isbn 없음.
            message.set_result_message(response_body, "EC005");
        }
        res.send(response_body)
    }).catch(err_code=>{
        message.set_result_message(response_body, err_code);
        res.send(response_body)
    });

});


//전체검색 미구현
router.get('/List', (req, res) => {

    let response_body = {}

    let keyword = (req.query.keyword) ? req.query.keyword : null;

    let category = (req.query.category) ? req.query.category : "title";
    let max_count = (req.query.max_count) ? req.query.max_count : null;
    let sort_key = (req.query.sort_key) ? req.query.sort_key : "title";
    let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";


    let query = `SELECT title, isbn, author, publisher FROM book WHERE `;

    if (keyword) {
        if (category === 'isbn') {
            query += `${category} = '${keyword}' or`
        } else {
            query += `${category} like '%${keyword}%' or`
        }
    }


    //string 으로 변환
    for (let i in keyword) {
        keyword[i] = JSON.stringify(keyword[i]);
    }

    query += `isbn in (${keyword.join()})`

    query += `order by ${sort_key} ${sort_method}`

    if (max_count) {
        query += `limit ${maxcount}`
    }
    res.send(query)


});

//internal API


router.get('/SearchInISBN', (req, res) => {

    let response_body = {}

    let isbn_list = req.query.isbn_list;

    if (!isbn_list) {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body)
        return;
    }
    let keyword = (req.query.keyword) ? req.query.keyword : null;
    let category = (req.query.category) ? req.query.category : "title";
    let sort_key = (req.query.sort_key) ? req.query.sort_key : "title";
    let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";
    

    let query = `SELECT title, isbn, author, publisher, image_url FROM book WHERE `;

    if (keyword) {
        if (category === 'isbn') {
            query += `${category} = '${keyword}' and `
        } else {
            query += `${category} like '%${keyword}%' and `
        }
    }

    let search_isbn_list = []
    //string 으로 변환
    for (let i in isbn_list) {
        search_isbn_list.push(JSON.stringify(isbn_list[i]));
    }

    query += `isbn in (${search_isbn_list.join()}) `

    query += `order by ${sort_key} ${sort_method} `

    get_db_query_results(query).then(results =>{
        response_body.Response = {
            count: results.length,
            item: []
        };

        for (let i in results) {
            response_body.Response.item.push(results[i])
        }
        message.set_result_message(response_body, "RS000");
        res.send(response_body)
    }).catch(err_code=>{
        message.set_result_message(response_body, err_code);
        res.send(response_body)
    });

});

router.get('/CheckISBNExists', (req, res) => {

    let response_body = {};

    let isbn = req.query.isbn;

    if (isbn) {
        let query = `select isbn from book where isbn = ?;`;

        get_db_query_results(query, [isbn]).then(results=>{
            let result_code = "";

            if (results.length) {
                //동일 isbn 존제
                result_code = "RS000";
            } else {
                //사용 가능한 아이디
                result_code = "EC005";
            }
            message.set_result_message(response_body, result_code);
            res.send(response_body)

        }).catch(err_code=>{
            message.set_result_message(response_body, err_code);
            res.send(response_body)
        });

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body)
    }

});

module.exports = router;

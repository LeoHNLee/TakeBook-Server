const express = require('express');

const host = require('../config/host');

const method = require('../bin/Method');
const mysql_query = require('../bin/mysql_query');
const message = require("../bin/message");
const log_register = require('../bin/log_register');

let log = new log_register();

const router = express.Router();

//책 정보 등록
router.post('/AddUserBook',[log.regist_request_log], (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let isbn = req.body.isbn;

    if (user_id && isbn) {
        let second_candidate = (req.body.second_candidate) ? req.body.second_candidate : null;
        let third_candidate = (req.body.third_candidate) ? req.body.third_candidate : null;
        let fourth_candidate = (req.body.fourth_candidate) ? req.body.fourth_candidate : null;
        let fifth_candidate = (req.body.fifth_candidate) ? req.body.fifth_candidate : null;
        let bookmark = (req.body.bookmark) ? req.body.bookmark : false;

        (async () => {
            let registration_date = method.current_time();
            let book_id = method.create_key(user_id, registration_date)

            let query = `insert into registered_book values (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
            await mysql_query.get_db_query_results(query, [book_id, user_id, registration_date, bookmark, isbn, second_candidate, third_candidate, fourth_candidate, fifth_candidate])
                .then(results => {
                    message.set_result_message(response_body, "RS000");
                })
                .catch(err => {
                    message.set_result_message(response_body, "ES010");
                })
            log.regist_response_log(req.method, req.route.path, response_body);    
            res.json(response_body);

        })();

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }

});

//책 정보 수정
router.put('/RegisteredImage', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let image_id = req.body.image_id;

    if (!user_id || !image_id) {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }

    let query = `update registered_image set state = ? where user_id = ? and image_id = ?;`;
    mysql_query.get_db_query_results(query, [1, user_id, image_id])
        .then(results=>{
            message.set_result_message(response_body, "RS000");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
        })
        .catch(err=>{
            message.set_result_message(response_body, "ES010");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
        })

});

//책 정보 수정
router.delete('/RegisteredImage',[log.regist_request_log] ,(req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let image_id = req.body.image_id;

    if (user_id && image_id) {

        // delete from user where id
        let query = `delete from registered_image where user_id = ? and image_id = ?;`;
        mysql_query.get_db_query_results(query, [user_id, image_id])
            .then(results=>{
                message.set_result_message(response_body, "RS000");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err=>{
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            }) 

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }

});

module.exports = router;
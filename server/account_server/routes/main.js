const express = require('express');
const fs = require('fs');
const request = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');

const log_register = require("../bin/log_register");
const mysql_query = require('../bin/mysql_query');
const method = require('../bin/Method');
const jwt_token = require("../bin/jwt_token");
const message = require("../bin/message");
const host = require('../config/host')

const router = express.Router();
let log = new log_register();

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';

let s3 = new aws.S3();
const user_bucket = 'takebook-user-bucket';
const image_bucket = 'takebook-book-image';
const user_scrap = 'takebook-user-scrap';

//성재형을 위한 로그출력
router.get('/Log', (req, res) => {

    response_body = {}

    mysql_query.get_db_query_results(`select time, tag, content from log order by time desc`)
        .then(results => {
            message.set_result_message(response_body, "RS000");
            response_body.Response = {
                count: results.length,
                item: results
            }
            res.json(response_body);
        })
        .catch(err => {
            console.log(err)
            message.set_result_message(response_body, "ES010");
            res.json(response_body)
        })

});

//성재형을 위한 로그기록
router.post('/Log', (req, res) => {

    response_body = {}
    let tag = (req.body.tag) ? req.body.tag : "none";
    let content = req.body.content ? req.body.content : "none";
    let time = method.current_time();

    mysql_query.get_db_query_results(`insert into log (time, tag, content) values (?, ?, ?)`
        , [time, tag, content])
        .then(results => {
            message.set_result_message(response_body, "RS000");
            response_body.Response = {
                time: time,
                tag: tag,
                content: content
            }
            res.json(response_body);
        })
        .catch(err => {
            console.log(err)
            message.set_result_message(response_body, "ES010");
            res.json(response_body)
        })

});

//유저생성
router.post('/CreateUsers', [log.regist_request_log], (req, res) => {

    response_body = {}

    if (!req.body.user_id || !req.body.user_password || !req.body.user_name) {
        // 필수 파라미터 미입력
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";
        //log 기록
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body)
        return;
    }

    let user_id = req.body.user_id;
    let user_password = req.body.user_password;
    let user_name = req.body.user_name;
    let signup_date = method.current_time();
    let access_state = 0;

    mysql_query.get_db_query_results(`insert into user (user_id, pw, name, signup_date, update_date, access_state) values (?,?,?,?,?,?)`
        , [user_id, user_password, user_name, signup_date, signup_date, access_state])
        .then(results => {
            message.set_result_message(response_body, "RS000");

            //로그기록
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);

            mysql_query.get_db_query_results(`insert into folder(folder_id, name, creation_date, update_date, user_id, state) values(?,?,?,?,?,?)`
                , [method.create_key(user_id, signup_date), "기본폴더", signup_date, signup_date, user_id, 1])
        })
        .catch(err => {
            switch (err.code) {
                case "ER_DUP_ENTRY":
                    //해당 아이디 이미 존제
                    message.set_result_message(response_body, "RS001", "Same ID already exists");
                    break;
                default:
                    //데이터 베이스 에러
                    console.log(err)
                    message.set_result_message(response_body, "ES010");
                    break;
            }

            //로그기록
            log.regist_response_log(req.method, req.route.path, response_body);

            res.json(response_body)
        })

});

router.get('/CheckIDExists', [log.regist_request_log], (req, res) => {
    const response_body = {};

    let user_id = req.query.user_id;

    if (!user_id || typeof (user_id) === 'object') {
        //필수 파라미터 누락 및 입력오류
        message.set_result_message(response_body, "EC001")

        //log 기록
        log.regist_response_log(req.method, req.route.path, response_body);

        res.json(response_body);
        return;
    }

    mysql_query.get_db_query_results(`select user_id from user where user_id = ?`, [user_id])
        .then(results => {
            if (results.length) {
                //동일 아이디 존제
                message.set_result_message(response_body, "RS001", "Same ID already exists")
            } else {
                //사용 가능한 아이디
                message.set_result_message(response_body, "RS000")
            }
            //log 기록
            log.regist_response_log(req.method, req.route.path, response_body);

            res.json(response_body)
        })
        .catch(err => {
            message.set_result_message(response_body, "ES010")

            //log 기록
            log.regist_response_log(req.method, req.route.path, response_body);

            res.json(response_body)
        });

});

//유저 로그인
router.post('/UserLogin', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let user_password = req.body.user_password;

    if (!user_id || !user_password) {
        //필수 파라미터 누락
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";

        //log 기록
        log.regist_response_log(req.method, req.route.path, response_body);

        res.json(response_body)
        return;
    }

    mysql_query.get_db_query_results(`select user_id, pw, name, signup_date, profile_url, update_date from user where user_id = ?`, [user_id])
        .then(results => {
            if (results.length) {

                if (results[0].pw === user_password) {

                    // jwt 토큰 생성
                    let token = jwt_token.create_token({ id: results[0].user_id });

                    //로그인 성공.
                    message.set_result_message(response_body, "RS000")
                    response_body.Response = {};

                    //유저 토큰
                    response_body.Response.user_token = token;
                } else {
                    // password 오류.
                    message.set_result_message(response_body, "RS001", "Incorrect User Password");
                }

            } else {
                // 아이디 불일치.
                message.set_result_message(response_body, "RS001", "Incorrect User ID");
            }
            //log 기록
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body)
        })
        .catch(err => {
            message.set_result_message(response_body, "ES010");
            //log 기록
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body)
        })

});

//유저 정보 불러오기
router.get('/UserInfo', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        mysql_query.get_db_query_results(`select user_id, name, signup_date, profile_url, update_date, access_state, state_message from user where user_id = ?`, [user_id])
            .then(results => {
                //사용자 정보 요청 성공
                message.set_result_message(response_body, "RS000")
                response_body.Response = {};

                //회원 정보
                response_body.Response.user_info = {};
                for (let value in results[0]) {
                    response_body.Response.user_info[value] = results[0][value];
                }
                //날짜 데이터 다듬기
                response_body.Response.user_info.update_date = method.trim_date(response_body.Response.user_info.update_date);
                response_body.Response.user_info.signup_date = method.trim_date(response_body.Response.user_info.signup_date);

                //log 기록
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                console.log(err)
                message.set_result_message(response_body, "ES010")

                //log 기록
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        //log 기록
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }

});

//회원 정보 수정: 상태메세지
router.put('/UserInfo', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let state_message = req.body.state_message;

        if (state_message === undefined) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");

            //log 기록
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body)
            return;
        }

        mysql_query.get_db_query_results(`update user set state_message = ? where user_id = ?;`, [state_message, user_id])
            .then(results => {
                //요청 성공
                message.set_result_message(response_body, "RS000");
                response_body.Response = {};
                response_body.Response.state_message = state_message;
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                console.log(err)
                //데이터 베이스 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        //log 기록
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//회원 프로필 수정
router.put('/UserProfile', [log.regist_request_log], (req, res) => {
    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        let user_file_upload = multer({
            storage: multers3({
                s3: s3,
                bucket: user_bucket,
                metadata: function (req, file, cb) {
                    cb(null, { fieldName: `${method.email_parser(user_id)}-profile.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${method.email_parser(user_id)}-profile.jpg`);
                }
            })
        }).single('profile_image');

        user_file_upload(req, res, (err) => {
            if (err) {
                switch (err.code) {
                    case "LIMIT_UNEXPECTED_FILE": {
                        //파라메터 잘못 입력.
                        message.set_result_message(response_body, "EC001");
                    }
                    default: {
                        console.log("s3 file upload error.")

                        log.regist_s3_log(req.method, req.route.path, false, {
                            bucket: user_bucket,
                            method: "upload",
                            filename: `${method.email_parser(user_id)}-profile.jpg`
                        })
                        message.set_result_message(response_body, "EC001");
                    }
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            }
            else {
                if (req.file) {

                    //s3 로그 기록
                    log.regist_s3_log(req.method, req.route.path, true, {
                        bucket: user_bucket,
                        method: "upload",
                        filename: `${method.email_parser(user_id)}-profile.jpg`
                    })

                    //정보 수정
                    mysql_query.get_db_query_results(`update user set profile_url = ? where user_id = ?;`, [req.file.location, user_id])
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            response_body.Response = {};
                            response_body.Response.profile_url = req.file.location;

                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);
                        })
                        .catch(err => {
                            console.log(err)
                            //데이터 베이스 오류
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);
                        })
                }
                else {
                    //필수 파라미터 누락
                    message.set_result_message(response_body, "EC001");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body);
                }
            }

        });
    } else {

        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//회원 프로필 삭제
router.delete('/UserProfile', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        var params = {
            Bucket: user_bucket,
            Key: `${method.email_parser(user_id)}-profile.jpg`
        };

        let s3_log_data = {
            bucket: user_bucket,
            method: "delete",
            filename: `${method.email_parser(user_id)}-profile.jpg`
        };

        s3.deleteObject(params, function (err, data) {
            if (err) {
                console.log(err)
                log.regist_s3_log(req.method, req.route.path, false, s3_log_data);
                //S3 서버 오류
                message.set_result_message(response_body, "ES013");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            } else {
                log.regist_s3_log(req.method, req.route.path, true, s3_log_data);

                mysql_query.get_db_query_results(`update user set profile_url = null where user_id = ?;`, [user_id])
                    .then(results => {
                        //요청 성공.
                        message.set_result_message(response_body, "RS000");
                        log.regist_response_log(req.method, req.route.path, response_body);
                        res.json(response_body);
                    })
                    .catch(err => {
                        console.log(err)
                        //데이터 베이스 오류
                        message.set_result_message(response_body, "ES010");
                        log.regist_response_log(req.method, req.route.path, response_body);
                        res.json(response_body);
                    });
            }
        });
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 리스트 불러오기
router.get('/UserBook', [log.regist_request_log], (req, res) => {
    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let main_user_id = decoded.id;
        let user_id = req.query.user_id;

        //유저 권한 채크
        // 미구현
        //
        if (!user_id) {
            // 자기 자신의 책 검색.
            user_id = main_user_id;
        }
        //
        //

        let keyword = (req.query.keyword) ? req.query.keyword : null;
        let category = ((req.query.category) && keyword) ? req.query.category : "title";
        let max_count = (req.query.max_count) ? req.query.max_count : null;
        let sort_key = (req.query.sort_key) ? req.query.sort_key : null;
        let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";


        //파라미터 옮바른 값 확인.
        let check_list = {
            category: ["title", "author"],
            sort_key: ["title", "author", "publisher", "registration_date"],
            sort_method: ["asc", "desc"]
        }

        let params = { category, sort_key, sort_method };
        let check_result = method.params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        if (max_count && !method.isnumber(max_count)) {
            //파라미터 타입 오류
            message.set_result_message(response_body, "EC001", `max_count parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        // query 구문 구성
        let query = `select book_id, registration_date, isbn, second_candidate, third_candidate, fourth_candidate, fifth_candidate from registered_book where user_id = ? `

        // sort_key==="registration_date" 인 경우에만 예외처리. 각 db가 가진 스키마가 다르기 떄문.
        if (sort_key === "registration_date") {
            query += `order by ${sort_key} ${sort_method} `;

            if (max_count) {
                query += `limit ${max_count}`;
            }
        }

        mysql_query.get_db_query_results(query, [user_id])
            .then(results => {
                //책정보
                let book_list = [];
                //isbn 리스트
                let isbn_list = new Set(); // 중복제거
                for (let result in results) {
                    results[result].registration_date = method.trim_date(results[result].registration_date);
                    book_list.push(results[result]);

                    isbn_list.add(results[result].isbn);
                }

                isbn_list = Array.from(isbn_list)

                //책이 없는 경우.
                if (!(isbn_list.length)) {
                    message.set_result_message(response_body, "RS000");
                    response_body.Response = {
                        count: 0,
                        item: []
                    };
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body);
                    return;
                }

                let qs = {
                    keyword,
                    category,
                    sort_key,
                    sort_method
                }

                //book 정보 가져오기
                let internal_server_request_form = {
                    method: 'GET',
                    uri: `${host.internal_server}/UserBook`,
                    qs: {
                        isbn_list: isbn_list
                    },
                    json: true
                }

                //url 값 담기
                for (let i in qs) {
                    if (qs[i]) {
                        internal_server_request_form.qs[i] = qs[i];
                    }
                }

                if (sort_key === "registration_date") {
                    internal_server_request_form.qs.sort_key = null;
                }

                //도서 정보 요청
                request.get(internal_server_request_form, (err, httpResponse, response) => {
                    if (err) {
                        //내부 서버 오류
                        message.set_result_message(response_body, "ES004");
                        log.regist_response_log(req.method, req.route.path, response_body);
                        res.json(response_body);
                        return;
                    }

                    switch (response.Result_Code) {
                        case "RS000": {
                            let book_join_list = [];

                            if (sort_key === "registration_date") {
                                // isbn을 통한 join
                                // registration_date 인경우 예외처리.
                                book_join_list = method.injoin_json_list("isbn", book_list, response.Response.item);
                            } else {
                                // isbn을 통한 join
                                book_join_list = method.outjoin_json_list("isbn", response.Response.item, book_list);

                                if (max_count) {
                                    book_join_list = book_join_list.slice(0, max_count)
                                }
                            }

                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            response_body.Response = {
                                count: book_join_list.length,
                                item: book_join_list
                            };
                            break;
                        }
                        case "ES002":
                        case "ES011": {
                            message.set_result_message(response_body, response.Result_Code);
                            break;
                        }
                    }

                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                })
            })
            .catch(err => {
                console.log(err);
                //데이터 베이스 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
                return;
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 등록
router.post('/UserBook', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;

        if (!isbn) {
            // 필수 파라미터 누락.
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }


        (async () => {

            let presence_check_result = null;

            //isbn 존제 여부 확인.
            let internal_server_request_form = {
                method: 'GET',
                uri: `${host.internal_server}/CheckISBNExists`,
                qs: {
                    isbn: isbn
                },
                json: true
            }

            await new Promise((resolve, reject) => {
                request.get(internal_server_request_form, (err, httpResponse, response) => {
                    if (err) {
                        reject("ES004");
                    } else {
                        resolve(response);
                    }
                });
            }).then(response => {
                switch (response.Result_Code) {
                    case "RS000": {
                        presence_check_result = true;
                        break;
                    }
                    case "EC005": {
                        message.set_result_message(response_body, "EC005", "Not Exist isbn Parameter Info");
                        break;
                    }
                    case "EC001": {
                        message.set_result_message(response_body, "ES000");
                        break;
                    }
                    default: {
                        message.set_result_message(response_body, response.Result_Code);
                        break;
                    }
                }
            }).catch(err_code => {
                message.set_result_message(response_body, err_code);
            })

            if (!presence_check_result) {
                console.log("presence check error");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
                return;
            }

            let book_id = method.create_key(user_id);

            //책 저장.
            await mysql_query.get_db_query_results(`insert into registered_book(book_id ,user_id,isbn, registration_date) values(?, ?, ?, ?);`,
                [book_id, user_id, isbn, method.current_time()])
                .then(results => {
                    message.set_result_message(response_body, "RS000");
                    response_body.Response = {
                        book_id: book_id
                    };
                    mysql_query.update_user_update_date(user_id);
                })
                .catch(err => {
                    message.set_result_message(response_body, "ES010");
                });

            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);



        })(); //async exit


    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 정보 수정
router.put('/UserBook', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let book_id = req.body.book_id;
        let modify_isbn = req.body.modify_isbn;

        if (!book_id || !modify_isbn) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        (async () => {

            let book_id_check_result = null;

            await mysql_query.get_db_query_results(`select book_id from registered_book where user_id = ? and book_id = ?`, [user_id, book_id])
                .then(results => {
                    if (results.length) {
                        //해당 책번호 존제
                        book_id_check_result = true;
                    } else {
                        //일치하는 책 없음.
                        message.set_result_message(response_body, "EC005");
                    }
                })
                .catch(err => {
                    message.set_result_message(response_body, "ES010");
                })


            if (!book_id_check_result) {
                console.log("book_id check error");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
                return;
            }

            let modify_isbn_check_result = null;

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
                    } else {
                        resolve(response);
                    }
                });

            }).then(response => {
                switch (response.Result_Code) {
                    case "RS000": {
                        //해당 ISBN이 존제할 경우.
                        modify_isbn_check_result = true;
                        break;
                    }
                    case "EC005": {
                        // 존재하지 않는 정보, 일치하는 isbn 없음.
                        message.set_result_message(response_body, "EC005", "Not Exist modify_isbn Parameter Info");
                        break;
                    }
                    case "EC001": {
                        // 필수 파라미터 누락 및 입력오류
                        message.set_result_message(response_body, "ES000");
                        break;
                    }
                    default: {
                        message.set_result_message(response_body, response.Result_Code);
                        break;
                    }
                }

            }).catch(error_code => {
                message.set_result_message(response_body, error_code);
            });

            if (!modify_isbn_check_result) {
                console.log("modify_isbn check error");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
                return;
            }



            //책 정보 수정
            let query = `update registered_book set isbn = ?, second_candidate = null, third_candidate = null, fourth_candidate = null, fifth_candidate = null where user_id = ? and book_id = ? `
            await mysql_query.get_db_query_results(query, [modify_isbn, user_id, book_id])
                .then(results => {
                    message.set_result_message(response_body, "RS000");
                })
                .catch(err => {
                    message.set_result_message(response_body, "ES010");
                })
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);

        })(); // aysnc exit

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 등록 책 삭제
router.delete('/UserBook', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let book_id = req.body.book_id;

        if (!book_id || typeof (book_id) !== 'object' || book_id.length === 0) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001", `book_id parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `delete from registered_book where `;

        for (let i = 0; i < book_id.length; i++) {
            query += "book_id = ?";

            if (i !== book_id.length - 1) {
                query += " or ";
            }
        }

        mysql_query.get_db_query_results(query, book_id)
            .then(results => {
                if (results.affectedRows) {
                    //해당 책번호 존재
                    message.set_result_message(response_body, "RS000");
                    mysql_query.update_user_update_date(user_id);
                } else {
                    //해당 책번호 없음.
                    result_code = "EC005";
                    message.set_result_message(response_body, "EC005", "Not Exist book_id Parameter Info");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 등록책 isbn을 통한 삭제
router.delete('/UserBooks', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;

        if (!isbn) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001", `isbn parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `delete from registered_book where user_id = ? and isbn = ?`;

        mysql_query.get_db_query_results(query, [user_id, isbn])
            .then(results => {
                if (results.affectedRows) {
                    //해당 책번호 존재
                    message.set_result_message(response_body, "RS000");
                    mysql_query.update_user_update_date(user_id);
                } else {
                    //해당 책번호 없음.
                    result_code = "EC005";
                    message.set_result_message(response_body, "EC005", "Not Exist isbn Parameter Info");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//해당 isbn의 책을 유저가 가지고 있는지 확인.
router.get('/CheckUserISBNExists', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.query.isbn;

        if (!isbn) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001", `isbn parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select book_id from registered_book where user_id = ? and isbn = ?`;

        mysql_query.get_db_query_results(query, [user_id, isbn])
            .then(results => {
                if (results.length) {
                    // 해당 isbn이 존재하는 경우.
                    message.set_result_message(response_body, "RS000");
                }
                else {
                    // 해당 isbn이 유저 등록 책에 없는 경우
                    message.set_result_message(response_body, "RS001", "ISBN does not exist");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//같은 책을 읽는 유저 리스트 요청.
router.get('/UserReadSameBook', [log.regist_request_log], (req, res) => {
    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.query.isbn;

        if (!isbn) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select f.followee_id, u.name, u.profile_url
                    from following as f, user as u, registered_book as b
                    where f.user_id = ?
                    and f.followee_id = b.user_id
                    and b.isbn = ?
                    and f.followee_id = u.user_id
                    order by followee_id asc`


        mysql_query.get_db_query_results(query, [user_id, isbn])
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: results
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                //데이터 베이스 오류.
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 폴더 리스트 요청
router.get('/UserScrapFolder', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let sort_key = (req.query.sort_key) ? (req.query.sort_key) : "name";
        let sort_method = (req.query.sort_method) ? (req.query.sort_method) : "asc";

        //파라미터 옮바른 값 확인.
        let check_list = {
            sort_key: ["name", "creation_date", "update_date"],
            sort_method: ["asc", "desc"]
        }

        let params = { sort_key, sort_method };
        let check_result = method.params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `SELECT folder_id, name, creation_date, update_date, scrap_id, image_url, rnum
                    FROM (
                        SELECT s.*, 
                        (CASE @vfolder WHEN s.folder_id THEN @rownum:=@rownum+1 ELSE @rownum:=1 END) rnum,
                        (@vfolder:=s.folder_id) vjob
                        FROM (
	                        select f.folder_id, f.name, f.creation_date, f.update_date, s.scrap_id, s.creation_date as scrap_date, s.image_url
	                        from folder f
	                        left join scrap s
                            on f.folder_id = s.folder
                            where f.user_id = ?
                            ) s, (SELECT @vfolder:='', @rownum:=0 FROM DUAL) b
                        ORDER BY s.scrap_date desc) c
                    where rnum <=5
                    order by ${sort_key} ${sort_method}, rnum`

        mysql_query.get_db_query_results(query, [user_id])
            .then(results => {
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: 0,
                    item: []
                }

                for (let i = 0; i < results.length; i++) {
                    let folder_id = results[i].folder_id;
                    let name = results[i].name;

                    let folder_item = {
                        folder_id: results[i].folder_id,
                        name: results[i].name,
                        creation_date: method.trim_date(results[i].creation_date),
                        update_date: method.trim_date(results[i].update_date),
                        scrap: {
                            count: 0,
                            item: []
                        }
                    }

                    if (results[i].scrap_id) {
                        //폴더에 스크랩이 존재하면

                        while (true) {
                            let scrap_id = results[i].scrap_id;
                            let image_url = results[i].image_url;

                            folder_item.scrap.item.push({
                                scrap_id: scrap_id,
                                image_url: image_url
                            })
                            folder_item.scrap.count = folder_item.scrap.item.length;


                            if (i + 1 === results.length) {
                                //인덱스가 끝까지 간 경우.
                                break;
                            }

                            if (folder_id !== results[i + 1].folder_id) {
                                break;
                            } else {
                                i += 1;
                            }
                        }
                    }
                    response_body.Response.item.push(folder_item)
                }
                response_body.Response.count = response_body.Response.item.length;

                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 폴더 추가.
router.post('/UserScrapFolder', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let folder_name = req.body.folder_name;

        if (!folder_name) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }
        let creation_date = method.current_time();

        mysql_query.get_db_query_results("select name from folder where name = ? and user_id = ?", [folder_name, user_id])
            .then(results => {
                if (results.length) {
                    //해당 폴더이름이 이미 존재.
                    console.log("Same folder_name already exists.")
                    message.set_result_message(response_body, "RS001", "Same folder_name already exists");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body);
                }
                else {
                    mysql_query.get_db_query_results("insert folder(folder_id, name, creation_date, update_date, user_id) values (?, ?, ?, ?, ?)",
                        [method.create_key(user_id, creation_date), folder_name, creation_date, creation_date, user_id])
                        .then(results => {
                            //요청 성공.
                            console.log("Make Scrap Folder Success.")
                            message.set_result_message(response_body, "RS000");
                            //사용자 정보 업데이트
                            mysql_query.update_user_update_date(user_id);

                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);
                        })
                        .catch(err => {
                            //User DB 서버 오류
                            console.log("Make Scrap Folder Error.")
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);
                        })
                }
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });


    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 폴더 이름 수정.
router.put('/UserScrapFolder', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let folder_id = req.body.folder_id;
        let modify_name = req.body.modify_name;

        if (!folder_id || !modify_name) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select state from folder
                    where ( folder_id = ? and state <> 0)
                    or ( name = ? and user_id =?)`

        mysql_query.get_db_query_results(query, [folder_id, modify_name, user_id])
            .then(results => {
                if (results.length) {
                    //state 0인경우 폴더 중첩, 1인경우 변경할 수 없는 폴더.
                    let state = 0;
                    for (let i in results) {
                        if (results[i].state === 1) {
                            state = 1;
                        }
                    }
                    switch (state) {
                        case 1: {
                            //해당 폴더의 이름을 바꿀 수 없음.
                            message.set_result_message(response_body, "RS002", "Can't rename this folder");
                            break;
                        }
                        case 0: {
                            //해당 폴더이름이 이미 존재.
                            message.set_result_message(response_body, "RS001", "Same folder name already exists");
                            break;
                        }
                    }

                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body);
                }
                else {
                    mysql_query.get_db_query_results("update folder set name = ? where folder_id = ?", [modify_name, folder_id])
                        .then(results => {
                            if (results.affectedRows) {
                                //요청 성공.
                                message.set_result_message(response_body, "RS000");
                                //정보 업데이트.
                                mysql_query.update_user_update_date(user_id);
                                mysql_query.update_folder_update_date(folder_id);
                            } else {
                                //해당 폴더 없음.
                                message.set_result_message(response_body, "EC005", "Not Exist folder_id Parameter Info");
                            }

                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);

                        })
                        .catch(err => {
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        });
                }
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 폴더 삭제.
router.delete('/UserScrapFolder', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let folder_id = req.body.folder_id;

        if (typeof (folder_id) !== 'object' || folder_id.length === 0) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `delete from folder where `;

        for (let i = 0; i < folder_id.length; i++) {
            query += "folder_id = ?";

            if (i !== folder_id.length - 1) {
                query += " or ";
            }
        }

        query += " and state = 0";

        mysql_query.get_db_query_results(query, folder_id)
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");

                //유저정보 업데이트
                mysql_query.update_user_update_date(user_id);

                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 리스트 요청
router.get('/UserScrap', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let folder_id = req.query.folder_id;

        if (!folder_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }
        mysql_query.get_db_query_results('select * from folder where folder_id = ?;', [folder_id])
            .then(results => {
                if (results.length) {
                    let query = 'select scrap_id, creation_date, contents, source_isbn, source_title, folder, image_url from scrap where user_id = ? and folder = ? order by scrap_id desc';
                    mysql_query.get_db_query_results(query, [user_id, folder_id])
                        .then(results => {
                            message.set_result_message(response_body, "RS000");
                            response_body.Response = {
                                count: results.length,
                                item: []
                            }

                            for (let i in results) {
                                results[i]["creation_date"] = method.trim_date(results[i]["creation_date"])
                                response_body.Response.item.push(results[i]);
                            }
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                        .catch(err => {
                            //User DB 서버 오류
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                }
                else {
                    //User DB 서버 오류
                    message.set_result_message(response_body, "EC005");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                }
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 이미지 등록
router.post('/UserScrap', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let registration_date = method.current_time();

        let scrap_id = `${method.create_key(user_id, registration_date)}`;

        let user_file_upload = multer({
            storage: multers3({
                s3: s3,
                bucket: user_scrap,
                metadata: function (req, file, cb) {
                    cb(null, { fieldName: `${scrap_id}.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${scrap_id}.jpg`);
                }
            })
        }).single('image_file');

        user_file_upload(req, res, (err) => {
            if (err) {
                console.log("s3 scrap file upload error.")
                switch (err.code) {
                    case "LIMIT_UNEXPECTED_FILE": {
                        //파라메터 잘못 입력.
                        message.set_result_message(response_body, "EC001");
                    }
                    default: {
                        log.regist_s3_log(req.method, req.route.path, false, {
                            bucket: user_scrap,
                            method: "upload",
                            filename: `${scrap_id}.jpg`
                        })
                        message.set_result_message(response_body, "ES013");
                    }
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            }
            else {
                if (req.file) {
                    console.log("s3 scrap file upload success!");

                    //s3 로그 기록
                    log.regist_s3_log(req.method, req.route.path, true, {
                        bucket: user_scrap,
                        method: "upload",
                        filename: `${scrap_id}.jpg`
                    });

                    let insert_query = `insert into scrap(scrap_id, user_id, creation_date, folder, image_url)
                                        values(?,?,?,
                                            (
                                                select folder_id
                                                from folder
                                                where user_id = ? and state = 1
                                            ),?)`;
                    //정보 수정
                    mysql_query.get_db_query_results(insert_query,
                        [scrap_id, user_id, registration_date, user_id, req.file.location])
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            response_body.Response = {
                                scrap_id: scrap_id
                            }
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);
                        })
                        .catch(err => {
                            //데이터 베이스 오류
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);

                            //s3 파일 삭제.
                            var params = {
                                Bucket: user_scrap,
                                Key: `${scrap_id}.jpg`
                            };

                            s3.deleteObject(params, (err, data) => {
                                let result = false;
                                if (err) {
                                    console.log("s3 scrap file delete fail!");
                                } else {
                                    result = true;
                                    console.log("s3 scrap file delete success!");
                                }
                                //s3 로그 기록
                                log.regist_s3_log(req.method, req.route.path, result, {
                                    bucket: user_scrap,
                                    method: "delete",
                                    filename: `${scrap_id}.jpg`
                                })
                            });

                        })
                }
                else {
                    //필수 파라미터 누락
                    message.set_result_message(response_body, "EC001");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body);
                }
            }

        });
    } else {

        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 수정
router.put('/UserScrap', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let scrap_id = req.body.scrap_id;
        let modify_contents = req.body.modify_contents;
        let modify_source_isbn = req.body.modify_source_isbn;
        let modify_source_title = req.body.modify_source_title;
        let modify_folder = req.body.modify_folder;

        if (!scrap_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        if (modify_contents === undefined && modify_source_isbn === undefined && modify_source_title === undefined && modify_folder === undefined) {
            //아무런 수정 없음.
            message.set_result_message(response_body, "RS000");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `update scrap set `
        if (modify_contents !== undefined) {
            query += `contents = '${modify_contents}',`
        }
        if (modify_source_isbn !== undefined) {
            query += `source_isbn = '${modify_source_isbn}',`
        }
        if (modify_source_title !== undefined) {
            query += `source_title = '${modify_source_title}',`
        }
        if (modify_folder !== undefined) {
            query += `folder = '${modify_folder}',`
        }

        query = query.replace(/,(?=[^,]*$)/, " ");
        query += `where scrap_id = ?`

        mysql_query.get_db_query_results(query, scrap_id)
            .then(results => {
                if (results.affectedRows) {
                    //요청 성공.
                    message.set_result_message(response_body, "RS000");
                    if (modify_folder) {
                        mysql_query.update_folder_update_date(modify_folder)
                    }
                }
                else {
                    //해당 스크랩 존재하지 않음.
                    message.set_result_message(response_body, "EC005", "Not Exist scrap_id Info");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                switch (err.code) {
                    case "ER_NO_REFERENCED_ROW_2": {
                        //해당 폴더 존재하지 않음.
                        message.set_result_message(response_body, "EC005", "Not Exist folder Info");
                        break;
                    }
                    default: {
                        //User DB 서버 오류
                        message.set_result_message(response_body, "ES010");
                    }
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩 삭제
router.delete('/UserScrap', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let scrap_id = req.body.scrap_id;


        if (typeof (scrap_id) !== 'object' || scrap_id.length === 0) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let select_query = `select distinct folder from scrap where `

        for (let i = 0; i < scrap_id.length; i++) {
            select_query += "scrap_id = ?";

            if (i !== scrap_id.length - 1) {
                select_query += " or ";
            }
        }

        mysql_query.get_db_query_results(select_query, scrap_id)
            .then(results => {
                if (results.length) {
                    let folder_id_list = [];
                    for (let i in results) {
                        folder_id_list.push(results[i].folder_id);
                    }

                    let delete_query = `delete from scrap where `;

                    for (let i = 0; i < scrap_id.length; i++) {
                        delete_query += "scrap_id = ?";

                        if (i !== scrap_id.length - 1) {
                            delete_query += " or ";
                        }
                    }

                    //스크랩 삭제.
                    mysql_query.get_db_query_results(delete_query, scrap_id)
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            //정보 업데이트.
                            mysql_query.update_user_update_date(user_id);
                            for (let i in folder_id_list) {
                                mysql_query.update_folder_update_date(folder_id_list[i]);
                            }

                            //s3 파일 삭제.
                            var params = {
                                Bucket: user_scrap,
                                Delete: {
                                    Objects: [],
                                    Quiet: false
                                }
                            };

                            for (let i in scrap_id) {
                                params.Delete.Objects.push({
                                    Key: `${scrap_id[i]}.jpg`
                                });
                            }

                            s3.deleteObjects(params, (err, data) => {
                                let result = false;
                                if (err) {
                                    console.log("s3 scrap file delete fail!");
                                } else {
                                    result = true;
                                    console.log("s3 scrap file delete success!");
                                }
                                //s3 로그 기록
                                log.regist_s3_log(req.method, req.route.path, result, {
                                    bucket: user_scrap,
                                    method: "delete",
                                    filename: scrap_id
                                })
                            });

                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                        .catch(err => {
                            //User DB 서버 오류
                            console.log(err)
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })

                } else {
                    //해당 스크랩 없음.
                    message.set_result_message(response_body, "EC005", "Not Exist scrap_id Parameter Info");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                }
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//사용자 스크랩의 폴더 변경
router.put('/ChangeScrapFolder', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let scrap_id_list = req.body.scrap_id_list;
        let folder_id = req.body.folder_id;

        if (!scrap_id_list || typeof (scrap_id_list) !== 'object' || scrap_id_list.length === 0 || !folder_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }


        let query = `update scrap set folder = '${folder_id}' where `;

        for (let i = 0; i < scrap_id_list.length; i++) {
            query += "scrap_id = ?";

            if (i !== scrap_id_list.length - 1) {
                query += " or ";
            }
        }

        //스크랩 삭제.
        mysql_query.get_db_query_results(query, scrap_id_list)
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");
                //정보 업데이트.
                mysql_query.update_user_update_date(user_id);
                mysql_query.update_folder_update_date(folder_id);

                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                switch (err.code) {
                    case "ER_NO_REFERENCED_ROW_2": {
                        //해당 폴더가 존재하지 않음.
                        message.set_result_message(response_body, "EC005", "Not Exist folder_id Parameter Info");
                        break;
                    }
                    default: {
                        //User DB 서버 오류
                        message.set_result_message(response_body, "ES010");
                    }
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })


    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//등록중인 이미지 리스트 요청
router.get('/ImageList', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        let query = `select image_id, registration_date, image_url, state from registered_image where user_id = ?`
        mysql_query.get_db_query_results(query, [user_id])
            .then(results => {
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: []
                }

                for (let i in results) {
                    results[i]["registration_date"] = method.trim_date(results[i]["registration_date"])
                    response_body.Response.item.push(results[i]);
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//등록중인 이미지 삭제
router.delete('/ImageList', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let image_id = req.body.image_id;

        if (!image_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `delete from registered_image where user_id = ? and image_id = ?`;
        mysql_query.get_db_query_results(query, [user_id, image_id])
            .then(results => {
                if (results.affectedRows) {
                    //s3 업로드된 파일 삭제.
                    var params = {
                        Bucket: image_bucket,
                        Key: `${image_id}.jpg`
                    };

                    s3.deleteObject(params, function (err, data) {
                        if (err) {
                            console.log("delete s3 register_image fail");
                            //log 기록
                            log.regist_s3_log(req.method, req.route.path, false, {
                                bucket: image_bucket,
                                method: "delete",
                                filename: `${image_id}.jpg`
                            });

                        } else {
                            console.log("delete s3 register_image success");

                            //log 기록
                            log.regist_s3_log(req.method, req.route.path, true, {
                                bucket: image_bucket,
                                method: "delete",
                                filename: `${image_id}.jpg`
                            });
                        }
                    });
                    result_code = "RS000";
                } else {
                    result_code = "EC005";
                }
                message.set_result_message(response_body, result_code);
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                console.log(err)
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 대댓글 리스트 요청
router.get('/Comment', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.query.isbn;
        let sort_key = (req.query.sort_key) ? req.query.sort_key : "registration_date";
        let sort_method = (req.query.sort_method) ? req.query.sort_method : "desc";

        if (!isbn) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        //파라미터 옮바른 값 확인.
        let check_list = {
            sort_key: ["registration_date", "good_cnt", "bad_cnt"],
            sort_method: ["asc", "desc"]
        }

        let params = { sort_key, sort_method };
        let check_result = method.params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select c.comment_id, c.user_id, c.registration_date,
                            c.contents, c.good_cnt, c.bad_cnt, c.recomment_cnt, c.vote, c.grade, u.name, u.profile_url
                     from (
                        select c.comment_id, c.user_id, c.registration_date, c.contents, c.good_cnt, c.bad_cnt, c.recomment_cnt, v.vote, g.grade
                        from comment as c
                        left join comment_vote v
                        on c.comment_id = v.comment_id
                        left join grade g
                        on c.user_id = g.user_id and c.isbn = g.isbn
                        where c.isbn = ? and c.upper_comment is null
                     ) as c, user as u
                     where c.user_id = u.user_id
                     order by ${sort_key} ${sort_method};`

        mysql_query.get_db_query_results(query, [isbn])
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: []
                }
                for (var i in results) {
                    results[i].registration_date = method.trim_date(results[i].registration_date);
                    response_body.Response.item.push(results[i])
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 댓글 등록
router.post('/Comment', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;
        let contents = req.body.contents;
        let upper_comment = req.body.upper_comment;

        if (!isbn || !contents) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        //등록날짜
        let registration_date = method.current_time();
        // primary_key
        let comment_id = method.create_key(user_id, registration_date);


        if (upper_comment) {
            //대댓글 등록.
            let query = 'insert comment values(?, ?, ?, ?, ?, ?, ?, ?, ?)';
            mysql_query.get_db_query_results(query, [comment_id, user_id, isbn, registration_date, contents, 0, 0, upper_comment, null])
                .then(results => {
                    //요청 성공.

                    //upper_comment recomment_cnt 증가.
                    mysql_query.increment_comment_recomment_cnt(upper_comment);

                    message.set_result_message(response_body, "RS000");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                })
                .catch(err => {
                    switch (err.code) {
                        case "ER_NO_REFERENCED_ROW_2": {
                            message.set_result_message(response_body, "EC005", "Not Exist upper_comment Info");
                            break;
                        }
                        default: {
                            message.set_result_message(response_body, "ES010");
                            break;
                        }
                    }
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                });
        } else {
            //댓글 등록.
            let select_query = 'select comment_id from comment where user_id = ? and isbn = ? and upper_comment is null';
            mysql_query.get_db_query_results(select_query, [user_id, isbn])
                .then(results => {
                    if (results.length) {
                        //메인 댓글이 이미 존재하는 경우.
                        message.set_result_message(response_body, "RS001", "main comment already exists");
                        log.regist_response_log(req.method, req.route.path, response_body);
                        res.json(response_body)
                    }
                    else {
                        //댓글 등록.
                        let insert_query = 'insert comment values(?, ?, ?, ?, ?, ?, ?, ?, ?)';
                        mysql_query.get_db_query_results(insert_query, [comment_id, user_id, isbn, registration_date, contents, 0, 0, null, 0])
                            .then(results => {
                                //요청 성공.
                                message.set_result_message(response_body, "RS000");
                                log.regist_response_log(req.method, req.route.path, response_body);
                                res.json(response_body)
                            })
                            .catch(err => {
                                //User DB 서버 오류
                                console.log(err)
                                message.set_result_message(response_body, "ES010");
                                log.regist_response_log(req.method, req.route.path, response_body);
                                res.json(response_body)
                            });
                    }
                })
                .catch(err => {
                    //User DB 서버 오류
                    console.log(err)
                    message.set_result_message(response_body, "ES010");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                })

        }

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 댓글 내용 수정
router.put('/Comment', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let comment_id = req.body.comment_id;
        let contents = req.body.contents;

        if (!comment_id || !contents) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('update comment set contents = ? where comment_id = ?', [contents, comment_id])
            .then(results => {
                if (results.affectedRows) {
                    //요청 성공.
                    message.set_result_message(response_body, "RS000");
                } else {
                    //해당 id 없음.
                    message.set_result_message(response_body, "EC005", "Not Exist comment_id Info");
                }

                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });


    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 댓글 삭제
router.delete('/Comment', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let comment_id = req.body.comment_id;

        if (!comment_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('select upper_comment from comment where comment_id = ?', [comment_id])
            .then(results => {
                if (results.length) {
                    let upper_comment = results[0].upper_comment;

                    mysql_query.get_db_query_results('delete from comment where comment_id = ?', [comment_id])
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");

                            if (upper_comment) {
                                //대댓글인 경우, 상위 댓글의 recomment_cnt를 -1
                                mysql_query.decrement_comment_recomment_cnt(upper_comment);
                            }

                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                        .catch(err => {
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        });
                }
                else {
                    //해당 id 없음.
                    message.set_result_message(response_body, "EC005", "Not Exist comment_id Info");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                }

            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });




    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//내가 등록한 책 댓글 요청
router.get('/MyComment', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.query.isbn;

        if (!isbn) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select c.comment_id, c.user_id, c.registration_date,
                            c.contents, c.good_cnt, c.bad_cnt, c.recomment_cnt, c.vote, c.grade, u.name, u.profile_url
                     from (
                        select c.comment_id, c.user_id, c.registration_date, c.contents, c.good_cnt, c.bad_cnt, c.recomment_cnt, v.vote, g.grade
                        from comment as c
                        left join comment_vote v
                        on c.comment_id = v.comment_id
                        left join grade g
                        on c.user_id = g.user_id and c.isbn = g.isbn
                        where c.isbn = ? and c.upper_comment is null
                        and c.user_id = ?
                     ) as c, user as u
                     where c.user_id = u.user_id;`

        mysql_query.get_db_query_results(query, [isbn, user_id])
            .then(results => {
                if (results[0]) {
                    //요청 성공.
                    message.set_result_message(response_body, "RS000");
                    response_body.Response = results[0]
                } else {
                    //해당 댓글 없음.
                    message.set_result_message(response_body, "RS001", "Not Exist User Comment");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 대댓글 리스트 요청
router.get('/ReComment', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let comment_id = req.query.comment_id;
        let sort_key = (req.query.sort_key) ? req.query.sort_key : "registration_date";
        let sort_method = (req.query.sort_method) ? req.query.sort_method : "desc";

        if (!comment_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        //파라미터 옮바른 값 확인.
        let check_list = {
            sort_key: ["registration_date", "good_cnt", "bad_cnt"],
            sort_method: ["asc", "desc"]
        }

        let params = { sort_key, sort_method };
        let check_result = method.params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select c.comment_id, c.user_id, c.registration_date,
                            c.contents, c.good_cnt, c.bad_cnt, c.vote, u.name, u.profile_url
                     from (
                        select c.comment_id, c.user_id, c.registration_date, c.contents, c.good_cnt, c.bad_cnt, v.vote
                        from comment as c
                        left join comment_vote v
                        on c.comment_id = v.comment_id
                        where c.upper_comment = ?
                     ) as c, user as u
                     where c.user_id = u.user_id
                     order by ${sort_key} ${sort_method};`

        mysql_query.get_db_query_results(query, [comment_id])
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: []
                }
                for (var i in results) {
                    results[i].registration_date = method.trim_date(results[i].registration_date);
                    response_body.Response.item.push(results[i])
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 평점 등록.
router.get('/Grade', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.query.isbn;

        if (!isbn) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select round(sum(grade) / count(*),1) as grade, count(*) as count from grade where isbn = ?;`
        mysql_query.get_db_query_results(query, [isbn])
            .then(results => {
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results[0].count,
                    grade: results[0].grade
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});


//책 평점 등록.
router.post('/Grade', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;
        let grade = req.body.grade;

        if (!isbn || !method.isnumber(grade)) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('select grade_id from grade where user_id = ? and isbn = ?;', [user_id, isbn])
            .then(results => {
                if (results.length) {
                    //이미 평점이 존재함.
                    message.set_result_message(response_body, "RS001", "book grade already exists");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                } else {
                    mysql_query.get_db_query_results('insert grade values(?, ?, ?, ?)', [method.create_key(user_id), isbn, user_id, grade])
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                        .catch(err => {
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);
                        })
                }
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 평점 수정.
router.put('/Grade', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;
        let grade = req.body.grade;

        if (!isbn || !method.isnumber(grade)) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('update grade set grade = ? where user_id = ? and isbn = ?', [grade, user_id, isbn])
            .then(results => {
                if (results.affectedRows) {
                    //요청 성공.
                    message.set_result_message(response_body, "RS000");
                } else {
                    //해당 평점 없음.
                    message.set_result_message(response_body, "EC005", "Not Exist grade Info");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 평점 삭제.
router.delete('/Grade', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;

        if (!isbn) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('delete from grade where user_id = ? and isbn = ?', [user_id, isbn])
            .then(results => {
                if (results.affectedRows) {
                    //요청 성공.
                    message.set_result_message(response_body, "RS000");
                } else {
                    //해당 평점 없음.
                    message.set_result_message(response_body, "EC005", "Not Exist grade Info");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//댓글 좋아요/싫어요 등록.
router.post('/VoteBook', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let comment_id = req.body.comment_id;
        let vote = req.body.vote;

        if (!comment_id || !method.isnumber(vote)) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        if (!(vote == 1) && !(vote == -1)) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001", "invalid vote error");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('select * from comment_vote where comment_id = ? and user_id = ?', [comment_id, user_id])
            .then(results => {
                if (results.length) {
                    //이미 vote가 존재함.
                    message.set_result_message(response_body, "RS001", "Vote is already exists");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                }
                else {
                    mysql_query.get_db_query_results('insert comment_vote values (?, ?, ?, ?)',
                        [method.create_key(user_id), comment_id, user_id, vote])
                        .then(results => {
                            //요청 성공.
                            if (vote === 1 || vote === "1") {
                                //좋아요 수 증가.
                                mysql_query.increment_comment_good_cnt(comment_id);
                            } else if (vote === -1 || vote === "-1") {
                                //싫어요 수 증가.
                                mysql_query.increment_comment_bad_cnt(comment_id);
                            }

                            message.set_result_message(response_body, "RS000");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                        .catch(err => {
                            switch (err.code) {
                                case "ER_NO_REFERENCED_ROW_2": {
                                    //해당 id 없음.
                                    message.set_result_message(response_body, "EC005", "Not Exist comment_id Info");
                                    break;
                                }
                                default: {
                                    message.set_result_message(response_body, "ES010");
                                    break;
                                }
                            }
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body);

                        });
                }
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })



    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//댓글 좋아요/싫어요 취소.
router.delete('/VoteBook', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let comment_id = req.body.comment_id;

        if (!comment_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('select vote from comment_vote where comment_id = ? and user_id = ?', [comment_id, user_id])
            .then(results => {
                if (results.length) {
                    let vote = results[0].vote;

                    mysql_query.get_db_query_results('delete from comment_vote where comment_id = ? and user_id = ?', [comment_id, user_id])
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");

                            if (vote = 1) {
                                //해당 댓글의 good_cnt를 -1
                                mysql_query.decrement_comment_good_cnt(comment_id);
                            } else {
                                //해당 댓글의 bad_cnt를 -1
                                mysql_query.decrement_comment_bad_cnt(comment_id);
                            }

                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        })
                        .catch(err => {
                            message.set_result_message(response_body, "ES010");
                            log.regist_response_log(req.method, req.route.path, response_body);
                            res.json(response_body)
                        });
                }
                else {
                    //해당 vote 없음.
                    message.set_result_message(response_body, "EC005", "Not Exist comment_id Info");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                }

            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//팔로워 리스트 요청
router.get('/Follower', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";

        //파라미터 옮바른 값 확인.
        let check_list = {
            sort_method: ["asc", "desc"]
        }

        let params = { sort_method };
        let check_result = method.params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select f.user_id, u.name, u.state_message, u.profile_url, f.is_follow
                    from (
                        select user_id, followee_id, exists (
                            select *
                            from following
                            where user_id = u1.followee_id
                            and followee_id = u1.user_id
                            ) as 'is_follow'
                        from following as u1
                        where followee_id = ?
                        ) as f, user as u
                    where f.user_id = u.user_id
                    order by name ${sort_method};`



        mysql_query.get_db_query_results(query, [user_id])
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: results
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//팔로우한 유저 리스트 요청
router.get('/Followee', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";

        //파라미터 옮바른 값 확인.
        let check_list = {
            sort_method: ["asc", "desc"]
        }

        let params = { sort_method };
        let check_result = method.params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        let query = `select u.user_id, u.name, u.state_message, u.profile_url
                    from (select followee_id
                        from following
                        where user_id = ?) as f, user as u
                    where f.followee_id = u.user_id
                    order by name ${sort_method}`

        mysql_query.get_db_query_results(query, [user_id])
            .then(results => {
                //요청 성공.
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: results
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

// 다른 유저를 팔로우
router.post('/FollowUser', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let followee_id = req.body.followee_id;

        if (!followee_id) {
            //필수 파라미터 누락 및 오류
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('insert following values (?, ?)', [user_id, followee_id])
            .then(results => {
                //팔로우 성공.
                message.set_result_message(response_body, "RS000");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })
            .catch(err => {
                switch (err.code) {
                    case "ER_NO_REFERENCED_ROW_2": {
                        message.set_result_message(response_body, "EC005", "Not Exist followee_id Info");
                        break;
                    }
                    case "ER_DUP_ENTRY": {
                        message.set_result_message(response_body, "RS001", "Same followee_id already exists");
                        break;
                    }
                    default: {
                        message.set_result_message(response_body, "ES010");
                        break;
                    }
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

// 팔로우 취소
router.delete('/FollowUser', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let followee_id = req.body.followee_id;

        if (!followee_id) {
            //필수 파라미터 누락 및 오류
            message.set_result_message(response_body, "EC001");
            log.regist_response_log(req.method, req.route.path, response_body);
            res.json(response_body);
            return;
        }

        mysql_query.get_db_query_results('delete from following where user_id = ? and followee_id = ? ', [user_id, followee_id])
            .then(results => {

                if (results.affectedRows) {
                    //팔로우 성공.
                    message.set_result_message(response_body, "RS000");
                } else {
                    //존재 하지 않는 유저.
                    message.set_result_message(response_body, "EC005", "Not Exist followee_id Info");
                }
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })
            .catch(err => {
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//책 이미지 등록
router.post('/AnalyzeBookImage', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);
    if (decoded) {
        let user_id = decoded.id;
        let registration_date = method.current_time();
        let image_id = method.create_key(user_id, registration_date);

        let user_file_upload = multer({
            storage: multers3({
                s3: s3,
                bucket: image_bucket,
                metadata: function (req, file, cb) {
                    cb(null, { fieldName: `${image_id}.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${image_id}.jpg`);
                }
            })
        }).single('book_image');

        user_file_upload(req, res, (err) => {
            if (err) {
                //s3 저장 실패.
                switch (err.code) {
                    case "LIMIT_UNEXPECTED_FILE": {
                        //파라메터 잘못 입력.
                        message.set_result_message(response_body, "EC001");
                    }
                    default: {
                        message.set_result_message(response_body, "EC001");
                    }
                }

                //log 기록
                log.regist_s3_log(req.method, req.route.path, false, {
                    bucket: image_bucket,
                    method: "upload",
                    filename: `${image_id}.jpg`
                });
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
                return;
            }

            if (!req.file) {
                //필수 파라미터 누락
                message.set_result_message(response_body, "EC001");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body);
                return;
            }

            let image_url = req.file.location;

            let query = `insert into registered_image values (?, ?, ?, ?, ?)`;
            mysql_query.get_db_query_results(query, [image_id, user_id, registration_date, image_url, 0])
                .then(results => {
                    message.set_result_message(response_body, "RS000");

                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body);

                    //이미지 분석 요청.
                    let internal_server_request_form = {
                        method: 'GET',
                        uri: `${host.internal_server}/AnalyzeBookImage`,
                        qs: {
                            image_url: req.file.location
                        },
                        json: true
                    }

                    request.get(internal_server_request_form, (err, httpResponse, response) => {
                        let result = err ? false : true;
                        if (err) {
                            console.log("regist image fail: internal server error.")
                        } else {
                            switch (response.Result_Code) {
                                case "RS000": {
                                    result = true;
                                    console.log("analysis image success!.")
                                    break;
                                }
                                case "EC004": {
                                    console.log("invaild_url.");
                                    break;
                                }
                                case "ES001": {
                                    console.log("regist image fail: Analysis server error.")
                                    result = false;
                                    break;
                                }
                                case "ES014": {
                                    console.log("regist image fail: Elasticsearch Databsae server error.")
                                    result = false;
                                    break;
                                }
                                default: {
                                    result = false;
                                    break;
                                }
                            }
                        }

                        if (result) {
                            //검색 성공시.
                            let isbn = response.Response.isbn;
                            let second_candidate = response.Response.second_candidate;
                            let third_candidate = response.Response.third_candidate;
                            let fourth_candidate = response.Response.fourth_candidate;
                            let fifth_candidate = response.Response.fifth_candidate;

                            //등록 이미지 삭제.
                            let query = `delete from registered_image where user_id = ? and image_id = ?;`;
                            mysql_query.get_db_query_results(query, [user_id, image_id])
                                .then(results => {
                                    console.log("delete register_image success");
                                })
                                .catch(err => {
                                    console.log("delete register_image fail: Account Database error.");
                                });

                            //s3 업로드된 파일 삭제.
                            var params = {
                                Bucket: image_bucket,
                                Key: `${image_id}.jpg`
                            };

                            s3.deleteObject(params, function (err, data) {
                                if (err) {
                                    console.log("delete s3 register_image fail");
                                    //log 기록
                                    log.regist_s3_log(req.method, req.route.path, false, {
                                        bucket: image_bucket,
                                        method: "delete",
                                        filename: `${image_id}.jpg`
                                    });

                                } else {
                                    console.log("delete s3 register_image success");

                                    //log 기록
                                    log.regist_s3_log(req.method, req.route.path, true, {
                                        bucket: image_bucket,
                                        method: "delete",
                                        filename: `${image_id}.jpg`
                                    });
                                }
                            });

                            //책 등록.
                            let registration_date = method.current_time();
                            let book_id = method.create_key(user_id, registration_date);

                            query = `insert into registered_book values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
                            mysql_query.get_db_query_results(query, [book_id, user_id, registration_date, false, isbn, second_candidate, third_candidate, fourth_candidate, fifth_candidate, true])
                                .then(results => {
                                    console.log("insert register_book success");
                                })
                                .catch(err => {
                                    console.log("insert register_book fail: Account Database error.");
                                });

                            //사용자 정보 업데이트
                            mysql_query.update_user_update_date();
                        }
                        else {
                            //검색 실패.
                            let query = `update registered_image set state = ? where user_id = ? and image_id = ?;`;
                            mysql_query.get_db_query_results(query, [1, user_id, image_id])
                                .then(results => {
                                    console.log("update register_image state success");
                                })
                                .catch(err => {
                                    console.log("update register_image state fail: Account Database error.");
                                })
                            return;
                        }
                    });
                })
                .catch(err => {
                    //user db 오류
                    console.log(err)
                    message.set_result_message(response_body, "ES010");

                    //s3 업로드된 파일 삭제
                    var params = {
                        Bucket: image_bucket,
                        Key: `${image_id}.jpg`
                    };

                    s3.deleteObject(params, function (err, data) {
                        if (err) {
                            console.log("s3 file delete error");
                            //log 기록
                            log.regist_s3_log(req.method, req.route.path, false, {
                                bucket: image_bucket,
                                method: "delete",
                                filename: `${image_id}.jpg`
                            });
                            message.set_result_message(response_body, "ES013");
                        }
                        else {
                            //log 기록
                            log.regist_s3_log(req.method, req.route.path, true, {
                                bucket: image_bucket,
                                method: "delete",
                                filename: `${image_id}.jpg`
                            });
                        }

                        log.regist_response_log(req.method, req.route.path, response_body);
                        res.json(response_body);
                    });
                })

        })
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

//스크랩 이미지 분석.
router.get('/AnalyzeScrapImage', [log.regist_request_log], (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let scrap_id = req.query.scrap_id;

        mysql_query.get_db_query_results(`select image_url from scrap where scrap_id = ?`, [scrap_id])
            .then(results => {
                if (results.length) {
                    //요청 성공.
                    let image_url = results[0].image_url;

                    //이미지 분석값 요청
                    let internal_server_request_form = {
                        method: 'GET',
                        uri: `${host.internal_server}/AnalyzeScrapImage`,
                        qs: {
                            image_url: image_url
                        },
                        json: true
                    }

                    //도서 정보 요청
                    request.get(internal_server_request_form, (err, httpResponse, response) => {
                        if (err) {
                            //내부 서버 오류.
                            console.log("Internal server error.");
                            message.set_result_message(response_body, "ES004");
                        }
                        else {
                            switch (response.Result_Code) {
                                case "RS000": {
                                    message.set_result_message(response_body, "RS000");
                                    response_body.Response = response.Response;
                                    break;
                                }
                                case "EC004": {
                                    console.log("invaild_url.");
                                    message.set_result_message(response_body, "RS001", "Analyze Image Fail");
                                    break;
                                }
                                case "ES001": {
                                    console.log("Analysis server error.");
                                    message.set_result_message(response_body, "ES001");
                                    break;
                                }
                                default: {
                                    console.log("Analysis server error.");
                                    message.set_result_message(response_body, "ES001");
                                    break;
                                }
                            }
                        }
                        log.regist_response_log(req.method, req.route.path, response_body);
                        res.json(response_body)
                    });

                } else {
                    //해당 scrap존재하지 않음.
                    console.log("Not Exist scrap_id Info");
                    message.set_result_message(response_body, "EC005", "Not Exist scrap Info");
                    log.regist_response_log(req.method, req.route.path, response_body);
                    res.json(response_body)
                }

            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                log.regist_response_log(req.method, req.route.path, response_body);
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        log.regist_response_log(req.method, req.route.path, response_body);
        res.json(response_body);
    }
});

module.exports = router;
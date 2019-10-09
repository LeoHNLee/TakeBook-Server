const express = require('express');
const fs = require('fs');
const request = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');
const uuidv4 = require('uuid/v4');

const moment = require('moment-timezone');

const mysql_pool = require('../bin/mysql_pool');
const jwt_token = require("../bin/jwt_token");
const message = require("../bin/message");
const host = require('../config/host')

const router = express.Router();

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';

let s3 = new aws.S3();
const user_bucket = 'takebook-user-bucket';
const image_bucket = 'takebook-book-image';

function params_check(params, check_list) {
    // 입력받은 파라미터가 옳바른지 채크
    // @ param params: 채크하려는 파라미터
    // @ param check_list: 채크하려는 정보.
    // @ return 문제가 있는 param

    let result = null;

    for (let param in params) {
        if (params[param]) {
            if (!check_list[param].includes(params[param])) {
                result = param;
                break;
            }
        }
    }

    return result;
}

function isnumber(value) {
    // value 값이 숫자인지 아닌지 채크
    // @ param value: 채크하려는 string 값
    // @ return 숫자이면 true, 아니면 false

    value += ''; // 문자열로 변환
    value = value.replace(/^\s*|\s*$/g, ''); // 좌우 공백 제거
    if (value == '' || isNaN(value)) return false;
    return true;
}

function trim_date(datetime) {
    //mysql에서 나온 datetime를 다듬는다.
    // @ param datetime: 다듬으려는 datetime값
    // @ return 수정된 값.

    let trim_text = datetime.toISOString().slice(0, 19).replace('T', ' ');
    return trim_text;
}

function current_time() {
    //현재시간 표시
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss:SSS');
}

function email_parser(user_id) {
    let text = user_id;

    if (text.indexOf('@') !== -1) {
        text = text.substring(0, text.indexOf('@'))
    }
    return text;
}

function create_key(user_id, datetime) {
    //replaceAll prototype 선언
    String.prototype.replaceAll = function (org, dest) {
        return this.split(org).join(dest);
    }

    let time = null;
    if (datetime) {
        time = datetime;
        let replace_list = ['-', ' ', ':'];
        for (let i in replace_list) {
            time = time.replaceAll(replace_list[i], '');
        }

    } else {
        time = moment().tz("Asia/Seoul").format('YYYYMMDDHHmmssSSS');
    }

    let key = `${email_parser(user_id)}-${time}`;
    return key;
}

function injoin_json_list(join_key, list1, list2) {

    let join_list = [];
    for (let i in list1) {
        // if (list2.find(item => item[join_key] == list1[i][join_key])) {
        //     let result = Object.assign({}, list1[i], list2.find(item => item[join_key] == list1[i][join_key]))
        //     join_list.push(result)
        // }
        let result = Object.assign({}, list1[i], list2.find(item => item[join_key] == list1[i][join_key]))
        join_list.push(result)
    }

    return join_list;
}

function outjoin_json_list(join_key, list1, list2) {

    let join_list = [];
    for (let i in list1) {
        while (true) {
            let find_index = list2.findIndex(item => item[join_key] == list1[i][join_key])
            if (find_index === -1) {
                break;
            } else {
                let result = Object.assign({}, list1[i], list2[find_index])
                join_list.push(result);
                list2.splice(find_index, 1)
            }
        }
    }

    return join_list;
}

function update_user_update_date(user_id) {

    mysql_connetion.query(`update user set update_date = ? where user_id = ?`, [current_time(), user_id], (err, results, fields) => {
        if (err) {
            //User DB 서버 오류
            console.log("update user update_date fail");
        } else {
            console.log("update user update_date success!");
        }
    });

}

function get_db_query_results(query, values) {
    if (values) {
        return new Promise((resolve, reject) => {

            mysql_pool.getConnection((err, conn) => {
                if (err) {
                    //db 오류
                    conn.release();
                    reject(err)
                    return;
                }

                conn.query(query, values, (err, results, fields) => {
                    if (err) {
                        //db 오류
                        reject(err)
                    }
                    else {
                        resolve(results)
                    }
                    //connection pool 반환
                    conn.release();
                })
            })
        });
    } else {
        return new Promise((resolve, reject) => {
            mysql_pool.getConnection((err, conn) => {
                if (err) {
                    //db 오류
                    conn.release();
                    reject(err)
                }

                conn.query(query, (err, results, fields) => {
                    if (err) {
                        //db 오류
                        reject(err)
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

router.post('/CreaateUsers', (req, res) => {
    response_body = {}

    if (!req.body.user_id || !req.body.user_password || !req.body.user_name) {
        // 필수 파라미터 미입력
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";
        res.json(response_body)
        return;
    }

    let user_id = req.body.user_id;
    let user_password = req.body.user_password;
    let user_name = req.body.user_name;
    let signup_date = current_time();
    let access_state = 0;

    get_db_query_results(`insert into user (user_id, pw, name, signup_date, update_date, access_state) values (?,?,?,?,?,?)`
        , [user_id, user_password, user_name, signup_date, signup_date, access_state])
        .then(results => {
            message.set_result_message(response_body, "RS000");
            res.json(response_body);
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
            res.json(response_body)
        })

});

router.get('/CheckIDExists', (req, res) => {
    const response_body = {};

    let user_id = req.query.user_id;

    if (!user_id || typeof (user_id) === 'object') {
        //필수 파라미터 누락 및 입력오류
        message.set_result_message(response_body, "EC001")
        recode_log(req.route.path, req.method, req.query, response_body);
        res.json(response_body)
        return;
    }

    get_db_query_results(`select user_id from user where user_id = ?`, [user_id])
        .then(results => {
            if (results.length) {
                //동일 아이디 존제
                message.set_result_message(response_body, "RS001", "Same ID already exists")
            } else {
                //사용 가능한 아이디
                message.set_result_message(response_body, "RS000")
            }
            res.json(response_body)
        })
        .catch(err => {
            message.set_result_message(response_body, "ES010")
            res.json(response_body)
        });

});

//유저 로그인
router.post('/UserLogin', (req, res) => {
    const response_body = {};

    let user_id = req.body.user_id;
    let user_password = req.body.user_password;

    if (!user_id || !user_password) {
        //필수 파라미터 누락
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";
        recode_log(req.route.path, req.method, req.body, response_body);
        res.json(response_body)
        return;
    }

    get_db_query_results(`select user_id, pw, name, signup_date, profile_url, update_date from user where user_id = ?`, [user_id])
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
            res.json(response_body)
        })
        .catch(err => {
            message.set_result_message(response_body, "ES010");
            res.json(response_body)
        })

});

//유저 정보 불러오기
router.get('/UserInfo', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        get_db_query_results(`select user_id, name, signup_date, profile_url, update_date, access_state, state_message from user where user_id = ?`, [user_id])
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
                response_body.Response.user_info.update_date = trim_date(response_body.Response.user_info.update_date);
                response_body.Response.user_info.signup_date = trim_date(response_body.Response.user_info.signup_date);
                res.json(response_body);
            })
            .catch(err => {
                console.log(err)
                message.set_result_message(response_body, "ES010")
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }

});

//회원 정보 수정: 상태메세지
router.put('/UserInfo', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let state_message = req.body.state_message;

        if (state_message == undefined) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            recode_log(req.route.path, req.method, req.body, response_body);
            res.json(response_body)
            return;
        }

        get_db_query_results(`update user set state_message = ? where user_id = ?;`, [state_message, user_id])
            .then(results => {
                //요청 성공
                message.set_result_message(response_body, "RS000");
                response_body.Response = {};
                response_body.Response.state_message = state_message;
                res.json(response_body);
            })
            .catch(err => {
                console.log(err)
                //데이터 베이스 오류
                message.set_result_message(response_body, "ES010");
                res.json(response_body);
            });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//회원 프로필 수정
router.put('/UserProfile', (req, res) => {

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
                    cb(null, { fieldName: `${email_parser(user_id)}-profile.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${email_parser(user_id)}-profile.jpg`);
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
                        message.set_result_message(response_body, "EC001");
                    }
                }

                res.json(response_body);
            }
            else {
                if (req.file) {

                    //정보 수정
                    get_db_query_results(`update user set profile_url = ? where user_id = ?;`, [req.file.location, user_id])
                        .then(results => {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            response_body.Response = {};
                            response_body.Response.profile_url = req.file.location;
                            res.json(response_body);
                        })
                        .catch(err => {
                            console.log(err)
                            //데이터 베이스 오류
                            message.set_result_message(response_body, "ES010");
                            res.json(response_body);
                        })
                }
                else {
                    //필수 파라미터 누락
                    message.set_result_message(response_body, "EC001");
                    res.json(response_body);
                }
            }

        });
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//회원 프로필 삭제
router.delete('/UserProfile', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        var params = {
            Bucket: user_bucket,
            Key: `${email_parser(user_id)}-profile.jpg`
        };

        s3.deleteObject(params, function (err, data) {
            if (err) {
                console.log(err)
                //S3 서버 오류
                message.set_result_message(response_body, "ES013");
                recode_log(req.route.path, req.method, req.body, response_body);
                res.json(response_body);
            } else {
                get_db_query_results(`update user set profile_url = null where user_id = ?;`, [user_id])
                    .then(results => {
                        //요청 성공.
                        message.set_result_message(response_body, "RS000");
                        res.json(response_body);
                    })
                    .catch(err => {
                        console.log(err)
                        //데이터 베이스 오류
                        message.set_result_message(response_body, "ES010");
                        res.json(response_body);
                    });
            }
        });
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//책 리스트 불러오기
router.get('/UserBook', (req, res) => {

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
            user_id = main_user_id;
        } else {
            // 다른 사용자 검색 일 경우.
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
        let check_result = params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            recode_log(req.route.path, req.method, req.query, response_body);
            res.json(response_body);
            return;
        }

        if (max_count && !isnumber(max_count)) {
            //파라미터 타입 오류
            message.set_result_message(response_body, "EC001", `max_count parameter error`);
            recode_log(req.route.path, req.method, req.query, response_body);
            res.json(response_body);
            return;
        }

        // query 구문 구성
        let query = `select book_id, registration_date, bookmark, isbn, second_candidate, third_candidate, fourth_candidate, fifth_candidate from registered_book where user_id = ? `

        // sort_key==="registration_date" 인 경우에만 예외처리. 각 db가 가진 스키마가 다르기 떄문.
        if (sort_key === "registration_date") {
            query += `order by ${sort_key} ${sort_method} `;

            if (max_count) {
                query += `limit ${max_count}`;
            }
        }

        get_db_query_results(query, [user_id])
            .then(results => {
                //책정보
                let book_list = [];
                //isbn 리스트
                let isbn_list = new Set(); // 중복제거
                for (let result in results) {
                    results[result].registration_date = trim_date(results[result].registration_date);
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
                    recode_log(req.route.path, req.method, req.query, response_body);
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
                        recode_log(req.route.path, req.method, req.query, response_body);
                        res.json(response_body);
                        return;
                    }

                    switch (response.Result_Code) {
                        case "RS000": {
                            let book_join_list = [];

                            if (sort_key === "registration_date") {
                                // isbn을 통한 join
                                // registration_date 인경우 예외처리.
                                book_join_list = injoin_json_list("isbn", book_list, response.Response.item);
                            } else {
                                // isbn을 통한 join
                                book_join_list = outjoin_json_list("isbn", response.Response.item, book_list);

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

                    res.json(response_body)
                })
            })
            .catch(err => {
                console.log(err);
                //데이터 베이스 오류
                message.set_result_message(response_body, "ES010");
                res.json(response_body);
                return;
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//책 등록
router.post('/UserBook', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let isbn = req.body.isbn;

        if (!isbn) {
            // 필수 파라미터 누락.
            message.set_result_message(response_body, "EC001");
            res.json(response_body);
            return;
        }

        let bookmark = (req.body.bookmark) ? true : false;


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
                recode_log(req.route.path, req.method, req.body, response_body);
                res.json(response_body);
                return;
            }

            let book_id = create_key(user_id);

            //책 저장.
            await get_db_query_results(`insert into registered_book(book_id ,user_id,isbn, registration_date, bookmark) values(?, ?, ?, ?, ?);`,
                [book_id, user_id, isbn, current_time(), bookmark])
                .then(results => {
                    message.set_result_message(response_body, "RS000");
                    update_user_update_date(user_id);
                })
                .catch(err => {
                    message.set_result_message(response_body, "ES010");

                });

            res.json(response_body);



        })(); //async exit


    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//책 정보 수정
router.put('/UserBook', (req, res) => {

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
            recode_log(req.route.path, req.method, req.body, response_body);
            res.json(response_body);
            return;
        }

        (async () => {

            let book_id_check_result = null;

            await get_db_query_results(`select book_id from registered_book where user_id = ? and book_id = ?`, [user_id, book_id])
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
                recode_log(req.route.path, req.method, req.body, response_body);
                res.json(response_body);
                return;
            }


            //책 정보 수정
            let query = `update registered_book set isbn = ?, second_candidate = null, third_candidate = null, fourth_candidate = null, fifth_candidate = null where user_id = ? and book_id = ? `
            await get_db_query_results(query, [modify_isbn, user_id, book_id])
                .then(results => {
                    message.set_result_message(response_body, "ES010");
                })
                .catch(err => {
                    message.set_result_message(response_body, "RS000");
                })
            res.json(response_body);

        })(); // aysnc exit

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//사용자 등록 책 삭제
router.delete('/UserBook', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let book_id = req.body.book_id;

        if (!book_id) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001", `book_id parameter error`);
            res.json(response_body);
            return;
        }

        get_db_query_results(`delete from registered_book where user_id = ? and book_id = ?`, [user_id, book_id])
            .then(results => {
                if (results.affectedRows) {
                    //해당 책번호 존재
                    message.set_result_message(response_body, "RS000");
                    update_user_update_date(user_id);
                } else {
                    //해당 책번호 없음.
                    result_code = "EC005";
                    message.set_result_message(response_body, "EC005", "Not Exist book_id Parameter Info");
                }
                res.json(response_body);
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                res.json(response_body);
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//책 이미지 등록
router.post('/AnalyzeImage', (req, res) => {
    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);
    if (decoded) {
        let user_id = decoded.id;
        let registration_date = current_time();
        let image_id = create_key(user_id, registration_date);

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
                switch (err.code) {
                    case "LIMIT_UNEXPECTED_FILE": {
                        //파라메터 잘못 입력.
                        message.set_result_message(response_body, "EC001");
                    }
                    default: {
                        message.set_result_message(response_body, "EC001");
                    }
                }

                res.json(response_body);
                return;
            }

            if (!req.file) {
                //필수 파라미터 누락
                message.set_result_message(response_body, "EC001");
                recode_log(req.route.path, req.method, req.body, response_body);
                res.json(response_body);
                return;
            }

            let image_url = req.file.location;

            let query = `insert into registered_image values (?, ?, ?, ?, ?)`;
            get_db_query_results(query, [image_id, user_id, registration_date, image_url, 0])
                .then(results => {
                    message.set_result_message(response_body, "RS000");

                    res.json(response_body);

                    //이미지 분석 요청.
                    let internal_server_request_form = {
                        method: 'GET',
                        uri: `${host.internal_server}/AnalyzeImage`,
                        qs: {
                            image_id: image_id,
                            user_id: user_id,
                            image_url: req.file.location
                        },
                        json: true
                    }

                    request.get(internal_server_request_form, (err, httpResponse, response) => {
                        if (err) {
                            console.log("internal server error.")
                            mysql_connetion.query(`update registered_image set state = ? where user_id = ? and image_id = ?;`,
                                [1, user_id, image_id], (err, results, fields) => {
                                    if (err) {
                                        //User DB 서버 오류
                                        console.log("update registered image state fail")
                                    } else {
                                        //정보 수정 성공.
                                        console.log("update registered image state success!")
                                    }
                                });
                            return;
                        }
                        console.log(response)
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
                            message.set_result_message(response_body, "ES013");
                        }
                        res.json(response_body);
                    });
                })

        })
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//등록중인 이미지 리스트 요청
router.get('/ImageList', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        let query = `select image_id, registration_date, image_url, state from registered_image where user_id = ?`
        get_db_query_results(query, [user_id])
            .then(results => {
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: []
                }

                for (let i in results) {
                    results[i]["registration_date"] = trim_date(results[i]["registration_date"])
                    response_body.Response.item.push(results[i]);
                }
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//등록중인 이미지 삭제
router.delete('/ImageList', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let image_id = req.body.image_id;

        if (!image_id) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            res.json(response_body);
            return;
        }

        let query = `delete from registered_image where user_id = ? and image_id = ?`;
        get_db_query_results(query, [user_id, image_id])
            .then(results => {
                if (results.affectedRows) {
                    result_code = "RS000";
                } else {
                    result_code = "EC005";
                }
                message.set_result_message(response_body, result_code);
                res.json(response_body)
            })
            .catch(err => {
                //User DB 서버 오류
                console.log(err)
                message.set_result_message(response_body, "ES010");
                res.json(response_body)
            })

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.json(response_body);
    }
});

//internal api

//책 정보 등록
router.post('/AddUserBook', (req, res) => {

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
            let registration_date = current_time();
            let book_id = create_key(user_id, registration_date)

            let query = `insert into registered_book values (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
            await get_db_query_results(query, [book_id, user_id, registration_date, bookmark, isbn, second_candidate, third_candidate, fourth_candidate, fifth_candidate])
                .then(results => {
                    message.set_result_message(response_body, "RS000");
                })
                .catch(err => {
                    message.set_result_message(response_body, "ES010");
                })
            res.json(response_body);

        })();

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
    }

});

//책 정보 수정
router.put('/RegisteredImage', (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let image_id = req.body.image_id;

    if (!user_id || !image_id) {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
    }

    let query = `update registered_image set state = ? where user_id = ? and image_id = ?;`;
    get_db_query_results(query, [1, user_id, image_id])
        .then(results=>{
            message.set_result_message(response_body, "RS000");
            res.json(response_body);
        })
        .catch(err=>{
            message.set_result_message(response_body, "ES010");
            res.json(response_body);
        })

});

//책 정보 수정
router.delete('/RegisteredImage', (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let image_id = req.body.image_id;

    if (user_id && image_id) {

        // delete from user where id
        let query = `delete from registered_image where user_id = ? and image_id = ?;`;
        get_db_query_results(query, [user_id, image_id])
            .then(results=>{
                message.set_result_message(response_body, "RS000");
                res.json(response_body);
            })
            .catch(err=>{
                message.set_result_message(response_body, "ES010");
                res.json(response_body);
            }) 

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
    }

});


module.exports = router;
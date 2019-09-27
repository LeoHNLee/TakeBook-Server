const express = require('express');
const fs = require('fs');
const request = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');

const moment = require('moment-timezone');

const mysql_connetion = require('../bin/mysql_connetion');
const jwt_token = require("../bin/jwt_token");
const message = require("../bin/message");
const host = require('../config/host')

const router = express.Router();

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';
let s3 = new aws.S3();
const user_bucket = 'takebook-user-bucket';
const image_bucket = 'takebook-book-image';

//mysql 연결
mysql_connetion.connect();

//시간설정
moment.tz("Asia/Seoul");


// let user_file_upload = multer({
//     storage: multers3({
//         s3: s3,
//         bucket: "takebook-user-bucket",
//         metadata: function (req, file, cb) {
//             let user_id = req.body.user_id;
//             cb(null, { fieldName: `${user_id}-profile.jpg` });
//         },
//         key: function (req, file, cb) {
//             let user_id = req.body.user_id;
//             cb(null, `${user_id}-profile.jpg`);
//         }
//     })
// }).single('profile_image');


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
    // string 값이 숫자인지 아닌지 채크
    // @ param value: 채크하려는 string 값
    // @ return 숫자이면 true, 아니면 false

    value += ''; // 문자열로 변환
    value = value.replace(/^\s*|\s*$/g, ''); // 좌우 공백 제거
    if (value == '' || isNaN(value)) return false;
    return true;
}

function trim_date(datetime) {
    let trim_text = datetime.toISOString().slice(0, 19).replace('T',' ');
    return trim_text;
}

function current_time(){
    //현재시간 표시
    return moment().format('YYYY-MM-DD HH:mm:ss');
}

function email_parser(user_id) {
    let text = user_id;

    if (text.indexOf('@') !== -1) {
        text = text.substring(0, text.indexOf('@'))
    }
    return text;
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
        while(true){
            let find_index = list2.findIndex(item => item[join_key] == list1[i][join_key])
            if(find_index === -1){
                break;
            }else{
                let result = Object.assign({}, list1[i], list2[find_index])
                join_list.push(result);
                list2.splice(find_index,1)
            }
        }
    }

    return join_list;
}

function update_user_update_date(user_id) {

    mysql_connetion.query(`update user set update_date = ? where id = ?`, [current_time(), user_id], (err, results, fields) => {
        if (err) {
            //User DB 서버 오류
            console.log("update user update_date fail");
        } else {
            console.log("update user update_date success!");
        }
    });

}
router.post('/CreaateUsers', (req, res) => {
    response_body = {}

    if (!req.body.user_id || !req.body.user_password || !req.body.user_name) {
        // 필수 파라미터 미입력
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";
        res.json(response_body)
    }
    else {
        let user_id = req.body.user_id;
        let user_password = req.body.user_password;
        let user_name = req.body.user_name;
        let signup_date = current_time();
        let access_state = 0;

        mysql_connetion.query(`insert into user (id, pw, name, signup_date, update_date, access_state) 
                                        values (?,?,?,?,?,?)`, [user_id, user_password, user_name, signup_date, signup_date, access_state], (err, results, fields) => {
            if (err) {
                switch (err.code) {
                    case "ER_DUP_ENTRY":
                        //해당 아이디 이미 존제
                        message.set_result_message(response_body, "RS001", "Same ID already exists")
                        break;
                    default:
                        //데이터 베이스 에러
                        message.set_result_message(response_body, "ES010")
                        break;
                }
                console.log(err)
            }
            else {
                //요청 성공
                message.set_result_message(response_body, "RS000")
            }
            res.json(response_body)
        })
    }

});

router.get('/CheckIDExists', (req, res) => {
    const response_body = {};

    let user_id = req.query.user_id;

    if (!user_id || typeof (user_id) === 'object') {
        //필수 파라미터 누락 및 입력오류
        message.set_result_message(response_body, "EC001")
        res.json(response_body)
        return;
    }

    mysql_connetion.query(`select id from user where id = ?`, [user_id], (err, results, fields) => {
        if (err) {
            console.log(err)
            message.set_result_message(response_body, "ES010")
        }
        else {
            if (results.length) {
                //동일 아이디 존제
                message.set_result_message(response_body, "RS001", "Same ID already exists")
            } else {
                //사용 가능한 아이디
                message.set_result_message(response_body, "RS000")
            }
        }
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
        res.json(response_body)
        return;
    }

    mysql_connetion.query(`select id, pw, name, signup_date, profile_url, update_date from user where id = ?`, [user_id], (err, results, fields) => {
        if (err) {
            console.log(err);
            message.set_result_message(response_body, "ES010");
        }
        else {
            if (results.length) {

                if (results[0].pw === user_password) {

                    // jwt 토큰 생성
                    let token = jwt_token.create_token({ id: results[0].id });

                    //로그인 성공.
                    message.set_result_message(response_body, "RS000")
                    response_body.Response = {};

                    //유저 토큰
                    response_body.Response.user_token = token;

                    // //회원 정보
                    // response_body.Response.user_info = {};
                    // response_body.Response.user_info.id = results[0].id;
                    // response_body.Response.user_info.name = results[0].name;
                    // response_body.Response.user_info.signup_date = results[0].signup_date.toISOString().slice(0, 19).replace('T', ' ');
                    // response_body.Response.user_info.profile_url = results[0].profile_url;
                    // response_body.Response.user_info.update_date = results[0].update_date;
                } else {
                    // password 오류.
                    message.set_result_message(response_body, "RS001", "Incorrect User Password");
                }

            } else {
                // 아이디 불일치.
                message.set_result_message(response_body, "RS001", "Incorrect User ID");
            }
        }
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

        mysql_connetion.query(`select id, name, signup_date, profile_url, update_date, state_message from user where id = ?`, [user_id], (err, results, fields) => {
            if (err) {
                console.log(err)
                //데이터베이스 오류
                message.set_result_message(response_body, "ES010")
            }
            else {
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
            }
            res.send(response_body);
        });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
    }

});

//회원 정보 수정: 상태메세지
router.put('/UserInfo', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    let state_message = req.body.state_message;

    if (decoded) {
        let user_id = decoded.id;

        if (!state_message) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            res.json(response_body)
            return;
        }

        mysql_connetion.query(`update user set state_message = ? where id = ?;`, [state_message, user_id], (err, results, fields) => {
            if (err) {
                console.log(err)
                //데이터 베이스 오류
                message.set_result_message(response_body, "ES010");
            }
            else {
                //요청 성공
                message.set_result_message(response_body, "RS000");
                response_body.Response = {};
                response_body.Response.state_message = state_message;
            }
            res.send(response_body);
        });
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
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
                        message.set_result_message(response_body, "EC001");
                    }
                }

                res.json(response_body);
            }
            else {
                if (req.file) {

                    //정보 수정
                    mysql_connetion.query(`update user set profile_url = ? where id = ?;`, [req.file.location, user_id], (err, results, fields) => {
                        if (err) {
                            console.log(err)
                            //데이터 베이스 오류
                            message.set_result_message(response_body, "ES010");
                        }
                        else {
                            //요청 성공.
                            message.set_result_message(response_body, "RS000");
                            response_body.Response = {};
                            response_body.Response.profile_url = req.file.location;
                        }
                        res.send(response_body);
                    });
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
        res.send(response_body);
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
                res.send(response_body);
            } else {
                //정보 수정
                mysql_connetion.query(`update user set profile_url = null where id = ?;`, [user_id], (err, results, fields) => {
                    if (err) {
                        console.log(err)
                        //데이터 베이스 오류
                        message.set_result_message(response_body, "ES010");
                    }
                    else {
                        //요청 성공.
                        message.set_result_message(response_body, "RS000");
                    }
                    res.send(response_body);
                });
            }
        });
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
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
        let category = ((req.query.category) && keyword) ? req.query.category : "isbn";
        let max_count = (req.query.max_count) ? req.query.max_count : null;
        let sort_key = (req.query.sort_key) ? req.query.sort_key : null;
        let sort_method = (req.query.sort_method) ? req.query.sort_method : "asc";


        //파라미터 옮바른 값 확인.
        let check_list = {
            category: ["title", "isbn", "author"],
            sort_key: ["isbn", "title", "author", "publisher", "registration_date"],
            sort_method: ["asc", "desc"]
        }

        let params = { category, sort_key, sort_method };
        let check_result = params_check(params, check_list);

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            res.send(response_body);
            return;
        }


        if (max_count && !isnumber(max_count)) {
            //파라미터 타입 오류
            message.set_result_message(response_body, "EC001", `max_count parameter error`);
            res.send(response_body);
            return;
        }


        // query 구문 구성
        let query = `select book_num, isbn, second_isbn, third_isbn, fourth_isbn, fifth_isbn, registration_date, bookmark from registered_book where user_id = ? `

        // sort_key==="registration_date" 인 경우에만 예외처리. 디비의 스키마가 다르기 떄문.
        if (sort_key === "registration_date") {
            query += `order by ${sort_key} ${sort_method} `;

            if (max_count) {
                query += `limit ${max_count}`;
            }
        }

        mysql_connetion.query(query, [user_id], (err, results, fields) => {
            if (err) {
                console.log(err);
                //데이터 베이스 오류
                message.set_result_message(response_body, "ES010");
                res.send(response_body);
                return;
            }

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

            //book 정보 가져오기
            let internal_server_request_form = {
                method: 'POST',
                uri: `${host.internal_server}/UserBookList`,
                body: {
                    isbn_list: isbn_list
                },
                json: true
            }

            let query_key = {
                keyword: keyword,
                category: category,
                max_count: max_count,
                sort_key: sort_key,
                sort_method: sort_method
            }

            for (let key in query_key) {
                if (query_key[key]) {
                    internal_server_request_form.body[key] = query_key[key];
                }
            }

            if (sort_key === "registration_date") {
                internal_server_request_form.body.sort_key = null;
                internal_server_request_form.body.max_count = null;
            }

            //도서 정보 요청
            request.post(internal_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    //내부 서버 오류
                    message.set_result_message(response_body, "ES004");
                    res.send(response_body);
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
                            //isbn을 통한 join
                            book_join_list = outjoin_json_list("isbn", response.Response.item, book_list)
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

        });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
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
            return;
        }

        let bookmark = (req.body.bookmark) ? req.body.bookmark : false;

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
                res.json(response_body);
                return;
            }

            let book_num = null;
            //book_num 불러오기.
            await new Promise((resolve, reject) => {

                mysql_connetion.query(`select ifnull((select max(book_num) from registered_book where user_id = ?),0) as maxnum;`,
                    [user_id], (err, results, fields) => {
                        if (err) {
                            reject("ES010");
                        } else {
                            //등록 성공
                            resolve(results)
                        }
                    });

            }).then(results => {
                book_num = results[0].maxnum + 1;
            }).catch(err_code => {
                message.set_result_message(response_body, err_code);
            });

            if (!book_num) {
                console.log('Load book_num error');
                res.json(response_body);
                return;
            }

            //책 저장.
            await new Promise((resolve, reject) => {

                mysql_connetion.query(`insert into registered_book(user_id, book_num, isbn, registration_date, bookmark) values(?, ?, ?, ?, ?);`,
                    [user_id, book_num, isbn, current_time(), bookmark], (err, results, fields) => {
                        if (err) {
                            reject("ES010");
                        } else {
                            //등록 성공
                            resolve("RS000");
                        }
                    });

            }).then(results => {
                message.set_result_message(response_body, results);
                update_user_update_date(user_id);
            }).catch(err_code => {
                message.set_result_message(response_body, err_code);
            });

            res.json(response_body);

        })(); //async exit


    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
    }
});

//책 정보 수정
router.put('/UserBook', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let book_num = req.body.book_num;
        let modify_isbn = req.body.modify_isbn;

        if (!book_num || !isnumber(book_num)) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001", `book_num parameter error`);
            res.send(response_body);
            return;
        }

        if (!modify_isbn) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001", `modify_isbn parameter error`);
            res.json(response_body);
            return;
        }

        (async () => {

            let book_num_check_result = null;

            //사용자 책이 등록되어 있는지 확인.
            await new Promise((resolve, reject) => {

                mysql_connetion.query(`select book_num from registered_book where user_id = ? and book_num = ?`, [user_id, book_num], (err, results, fields) => {
                    if (err) {
                        //User DB 서버 오류
                        reject("ES010");
                    } else {
                        if (results.length) {
                            //해당 책번호 존제
                            resolve("success");
                        } else {
                            //일치하는 책 없음.
                            reject("EC005");
                        }
                    }

                });
            }).then(result => {
                book_num_check_result = true;
            }).catch(error_code => {
                switch (error_code) {
                    case "EC005": {
                        message.set_result_message(response_body, "EC005", "Not Exist book_num Parameter Info");
                        break;
                    }
                    default: {
                        message.set_result_message(response_body, error_code);
                        break;
                    }
                }
            });

            if (!book_num_check_result) {
                console.log("book_num check error");
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
                res.json(response_body);
                return;
            }


            //책 정보 수정
            await new Promise((resolve, reject) => {
                let query = `update registered_book set isbn = ?, second_isbn = null, third_isbn = null, fourth_isbn = null, fifth_isbn = null where user_id = ? and book_num = ? `
                mysql_connetion.query(query, [modify_isbn, user_id, book_num], (err, results, fields) => {
                    if (err) {
                        reject("ES010");
                    } else {
                        resolve("RS000");
                    }
                })
            }).then(result => {
                message.set_result_message(response_body, result);
            }).catch(error_code => {
                message.set_result_message(response_body, error_code);
            });

            //책 정보 수정
            await new Promise((resolve, reject) => {
                let query = `update registered_book set isbn = ?, second_isbn = null, third_isbn = null, fourth_isbn = null, fifth_isbn = null where user_id = ? and book_num = ? `
                mysql_connetion.query(query, [modify_isbn, user_id, book_num], (err, results, fields) => {
                    if (err) {
                        reject("ES010");
                    } else {
                        resolve("RS000");
                    }
                })
            }).then(result => {
                message.set_result_message(response_body, result);
                update_user_update_date(user_id);
            }).catch(error_code => {
                message.set_result_message(response_body, error_code);
            });
            res.json(response_body);



        })(); // aysnc exit

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
    }
});

//사용자 등록 책 삭제
router.delete('/UserBook', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let book_num = req.body.book_num;

        if (!book_num || !isnumber(book_num)) {
            //파라미터 타입 오류 및 누락
            message.set_result_message(response_body, "EC001", `book_num parameter error`);
            res.send(response_body);
            return;
        }

        mysql_connetion.query(`delete from registered_book where user_id = ? and book_num = ?`, [user_id, book_num], (err, results, fields) => {
            if (err) {
                //User DB 서버 오류
                result_code = "ES010";
                message.set_result_message(response_body, "ES010");
            } else {
                if (results.affectedRows) {
                    //해당 책번호 존재
                    result_code = "RS000";
                    message.set_result_message(response_body, "RS000");
                    update_user_update_date(user_id);
                } else {
                    //해당 책번호 없음.
                    result_code = "EC005";
                    message.set_result_message(response_body, "EC005", "Not Exist book_num Parameter Info");
                }
            }
            res.send(response_body);
        });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
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

        let user_file_upload = multer({
            storage: multers3({
                s3: s3,
                bucket: image_bucket,
                metadata: function (req, file, cb) {
                    cb(null, { fieldName: `${email_parser(user_id)}-${registration_date}.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${email_parser(user_id)}-${registration_date}.jpg`);
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
                res.json(response_body);
                return;
            }

            let image_url = req.file.location;

            mysql_connetion.query(`insert into registered_image values (?, ?, ?, ?)`, [user_id, registration_date, image_url, 0], (err, results, fields) => {
                if (err) {
                    //user db 오류
                    message.set_result_message(response_body, "ES010");

                    //s3 업로드된 파일 삭제
                    var params = {
                        Bucket: image_bucket,
                        Key: `${user_id}-${registration_date}.jpg`
                    };

                    s3.deleteObject(params, function (err, data) {
                        if (err) {
                            console.log("s3 file delete error");
                            message.set_result_message(response_body, "ES013");
                        }
                        res.json(response_body);
                    });

                    return;
                }

                message.set_result_message(response_body, "RS000");

                //book 정보 가져오기
                let internal_server_request_form = {
                    method: 'GET',
                    uri: `${host.internal_server}/AnalyzeImage`,
                    qs: {
                        user_id: user_id,
                        registration_date: registration_date,
                        image_url: req.file.location
                    },
                    json: true
                }

                request.get(internal_server_request_form, (err, httpResponse, response) => {
                    console.log(response)
                });

                res.json(response_body);
            });

        })
    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
    }
});

//등록중인 이미지 리스트 요청
router.get('/ImageList', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        mysql_connetion.query(`select registration_date, state, image_url from registered_image where user_id = ?`, [user_id], (err, results, fields) => {
            if (err) {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
            } else {
                message.set_result_message(response_body, "RS000");
                response_body.Response = {
                    count: results.length,
                    item: []
                }

                for (let i in results) {
                    response_body.Response.item.push(results[i]);
                }
            }
            res.json(response_body)

        });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
    }
});

//등록중인 이미지 삭제
router.delete('/ImageList', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let registration_date = req.body.registration_date;

        if (!registration_date) {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            res.send(response_body);
            return;
        }

        mysql_connetion.query(`delete from registered_image where user_id = ? and registration_date = ?`, [user_id, registration_date], (err, results, fields) => {
            let result_code = null;
            if (err) {
                //User DB 서버 오류
                console.log(err)
                result_code = "ES010";
            } else {
                if (results.affectedRows) {
                    result_code = "RS000";
                } else {
                    result_code = "EC005";
                }
            }
            message.set_result_message(response_body, result_code);
            res.json(response_body)

        });

    } else {
        //권한 없는 토큰.
        message.set_result_message(response_body, "EC002");
        res.send(response_body);
    }
});

//internal api

//책 정보 등록
router.post('/AddUserBook', (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let isbn = req.body.isbn;

    if (user_id && isbn) {
        let second_isbn = (req.body.second_isbn) ? req.body.second_isbn : null;
        let third_isbn = (req.body.third_isbn) ? req.body.third_isbn : null;
        let fourth_isbn = (req.body.fourth_isbn) ? req.body.fourth_isbn : null;
        let fifth_isbn = (req.body.fifth_isbn) ? req.body.fifth_isbn : null;
        let bookmark = (req.body.bookmark) ? req.body.bookmark : false;

        (async () => {
            let book_num = null;
            //book_num 불러오기.
            await new Promise((resolve, reject) => {

                mysql_connetion.query(`select ifnull((select max(book_num) from registered_book where user_id = ?),0) as maxnum;`,
                    [user_id], (err, results, fields) => {
                        if (err) {
                            reject("ES010");
                        } else {
                            //등록 성공
                            resolve(results)
                        }
                    });

            }).then(results => {
                book_num = results[0].maxnum + 1;
            }).catch(err_code => {
                message.set_result_message(response_body, err_code);
            });

            await new Promise((resolve, reject) => {
                mysql_connetion.query(`insert into registered_book values (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [user_id, isbn, current_time(), bookmark, second_isbn, third_isbn, fourth_isbn, fifth_isbn, book_num], (err, results, fields) => {
                        if (err) {
                            reject("ES010");
                        } else {
                            //등록 성공
                            resolve("RS000");
                        }
                    });
            }).then(results => {
                message.set_result_message(response_body, results);
            }).catch(err_code => {
                message.set_result_message(response_body, err_code);
            });;

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
    let registration_date = req.body.registration_date;

    if (user_id && registration_date) {

        console.log(registration_date)
        mysql_connetion.query(`update registered_image set state = ? where user_id = ? and registration_date = ?;`,
            [1, user_id, registration_date], (err, results, fields) => {
                let result_code = "";
                if (err) {
                    //User DB 서버 오류
                    result_code = "ES010";
                } else {
                    //등록 성공
                    result_code = "RS000";
                }
                message.set_result_message(response_body, result_code);
                res.json(response_body);
            });

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
    }

});

//책 정보 수정
router.delete('/RegisteredImage', (req, res) => {

    const response_body = {};

    let user_id = req.body.user_id;
    let registration_date = req.body.registration_date;

    if (user_id && registration_date) {

        // delete from user where id
        mysql_connetion.query(`delete from registered_image where user_id = ? and registration_date = ?;`,
            [user_id, registration_date], (err, results, fields) => {
                let result_code = "";
                if (err) {
                    //User DB 서버 오류
                    result_code = "ES010";
                } else {
                    //등록 성공
                    result_code = "RS000";
                }
                message.set_result_message(response_body, result_code);
                res.json(response_body);
            });

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001");
        res.json(response_body);
    }

});


// router.post('/analysis', (req, res) => {
//     upload(req, res, (err) => {

//         const response_body = {};

//         if (err) {
//             response_body.is_error = true;
//             //error_code: 1     Request 필수값 미설정.
//             response_body.error_code = 1;
//             res.json(response_body);
//             return;
//         }

//         let file = req.file;
//         let user_id = req.body.user_id;

//         //필수값 없을시
//         if (file && user_id) {

//             let filename = file.originalname;

//             (async (response_body) => {
//                 let analysis_result = {};

//                 //도서 분석 요청
//                 await new Promise((resolve, reject) => {

//                     // 도서 분석 요청 request form
//                     let form = {
//                         method: 'POST',
//                         uri: `${analysis_server_address}/result`,
//                         body: {
//                             'filename': filename,
//                         },
//                         json: true
//                     }

//                     request.post(form, (err, httpResponse, response) => {
//                         if (err) {
//                             // 요청 에러
//                             response_body.is_error = true;
//                             response_body.error_code = 1;
//                             analysis_result = false;
//                             resolve("analysis_requset_error")
//                         }
//                         else {
//                             let is_error = response.is_error;

//                             if (is_error) {
//                                 console.log("분석 요청 오류");
//                                 response_body.is_error = is_error
//                                 response_body.error_code = 1
//                                 analysis_result = false;
//                                 resolve("analysis_requset_fail");
//                             } else {
//                                 analysis_result = response;
//                                 resolve("analysis_requset_success!");
//                             }
//                         }
//                     });
//                 });
//                 res.json(analysis_result);

//             })(response_body);

//         } else {
//             console.log("form 값 오류");
//             response_body.is_error = true;
//             //error_code: 1     Request 필수값 미설정.
//             response_body.error_code = 1;
//             res.json(response_body)
//         }
//     })
// });

// router.post('/ocrtest', (req, res) => {

//     upload(req, res, (err) => {

//         const response_body = {};

//         if (err) {
//             response_body.is_error = true;
//             //error_code: 1     Request 필수값 미설정.
//             response_body.error_code = 1;
//             res.json(response_body);
//             return;
//         }

//         let file = req.file;
//         let user_id = req.body.user_id;

//         //필수값 없을시
//         if (file && user_id) {

//             let filename = file.originalname;

//             (async (response_body) => {
//                 await new Promise((resolve, reject) => {
//                     //요청을 보낼 request form
//                     const form = {
//                         method: 'POST',
//                         uri: `${analysis_server_address}/result`,
//                         body: {
//                             'filename': filename,
//                         },
//                         json: true
//                     }

//                     //도서 분석 요청
//                     request.post(form, (err, httpResponse, response) => {
//                         if (err) {
//                             return console.error('response failed:', err);
//                         }

//                         let is_error = response.is_error;

//                         if (is_error) {
//                             console.log("분석 요청 오류");
//                             response_body.is_error = is_error
//                             response_body.error_code = response.error_code
//                             response_body.error_code = 1
//                             res.json(response_body)
//                         } else {
//                             response_body.result = response.result;
//                             res.json(response_body)
//                         }
//                     })

//                 });
//             })(response_body);

//         } else {
//             console.log("form 값 오류");
//             response_body.is_error = true;
//             //error_code: 1     Request 필수값 미설정.
//             response_body.error_code = 1;
//             res.json(response_body)
//         }
//     })

// });

module.exports = router;
const express = require('express');
const fs = require('fs');
const request = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');

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


function params_check(params, check_list) {
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

function email_parser(user_id) {
    let text = user_id;

    if (text.indexOf('@') !== -1) {
        text = text.substring(0, text.indexOf('@'))
    }
    return text;
}

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

function join_json_list(join_key, list1, list2) {

    let join_list = [];
    for (let i in list1) {
        let result = Object.assign({}, list1[i]
            , list2.find(item => item[join_key] == list1[i][join_key]))
        join_list.push(result)
    }

    return join_list;
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
        let signup_date = new Date();
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

    let user_id = req.query.user_id

    if (user_id) {
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
        })

    } else {
        //필수 파라미터 누락
        message.set_result_message(response_body, "EC001")
        res.json(response_body)
    }

});

//유저 로그인
router.post('/UserLogin', (req, res) => {
    const response_body = {};

    let user_id = req.body.user_id;
    let user_password = req.body.user_password;

    if (user_id && user_password) {
        mysql_connetion.query(`select id, pw, name, signup_date, profile_url, update_date from user where id = ?`, [user_id], (err, results, fields) => {
            if (err) {
                console.log(err)
                message.set_result_message(response_body, "ES010")
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

                        //회원 정보
                        response_body.Response.user_info = {};
                        response_body.Response.user_info.id = results[0].id;
                        response_body.Response.user_info.name = results[0].name;
                        response_body.Response.user_info.signup_date = results[0].signup_date.toISOString().slice(0, 19).replace('T', ' ');
                        response_body.Response.user_info.profile_url = results[0].profile_url;
                        response_body.Response.user_info.update_date = results[0].update_date;
                    } else {
                        // password 오류.
                        message.set_result_message(response_body, "RS001", "Incorrect User Information")
                    }

                } else {
                    // 아이디 불일치.
                    message.set_result_message(response_body, "RS001", "Incorrect User Information")
                }
            }
            res.json(response_body)
        })

    } else {
        //필수 파라미터 누락
        response_body.Result_Code = "EC001";
        response_body.Message = "invalid parameter error";
        res.json(response_body)
    }

});

//유저 정보 불러오기
router.get('/UserInfo', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;

        mysql_connetion.query(`select id, name, signup_date, profile_url, update_date from user where id = ?`, [user_id], (err, results, fields) => {
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
                response_body.Response.user_info.update_date = response_body.Response.user_info.update_date.toISOString().slice(0, 19).replace('T', ' ');
                response_body.Response.user_info.signup_date = response_body.Response.user_info.signup_date.toISOString().slice(0, 19).replace('T', ' ');
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
                    cb(null, { fieldName: `${email_parser(user)}-profile.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${email_parser(user)}-profile.jpg`);
                }
            })
        }).single('profile_image');

        user_file_upload(req, res, (err) => {
            if (err) {
                //필수 파라미터 누락
                message.set_result_message(response_body, "EC001");
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

        let query_key = {
            keyword: keyword,
            category: category,
            max_count: max_count,
            sort_key: sort_key,
            sort_method: sort_method
        }

        //파라미터 값 확인.
        let check_list = {
            category: ["title", "isbn", "author"],
            sort_key: ["isbn", "title", "author", "publisher", "registration_date"],
            sort_method: ["asc", "desc"]
        }

        let params = { category, sort_key, sort_method }

        let check_result = params_check(params, check_list)

        if (check_result) {
            //파라미터 값 오류
            message.set_result_message(response_body, "EC001", `${check_result} parameter error`);
            res.send(response_body);
            return;
        }

        // query 구문 구성
        let query = `select isbn, registration_date, bookmark from registered_book where user_id = ? `

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

            let book_list = [];
            let isbn_list = [];
            for (let result in results) {
                book_list.push({
                    isbn: results[result].isbn,
                    registration_date: results[result].registration_date.toISOString().slice(0, 19).replace('T', ' '),
                    bookmark: results[result].bookmark
                });
                isbn_list.push(results[result].isbn);
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

            for (let key in query_key) {
                if (query_key[key]) {
                    internal_server_request_form.qs[key] = query_key[key];
                }
            }

            if (sort_key === "registration_date") {
                internal_server_request_form.qs.sort_key = null;
                internal_server_request_form.qs.max_count = null;
            }

            //도서 정보 요청
            request.get(internal_server_request_form, (err, httpResponse, response) => {
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
                            book_join_list = join_json_list("isbn", book_list, response.Response.item);
                        } else {
                            //isbn을 통한 join
                            book_join_list = join_json_list("isbn", response.Response.item, book_list)
                        }

                        //요청 성공.
                        message.set_result_message(response_body, "RS000");
                        response_body.Response = {
                            count: book_join_list.length,
                            item: book_join_list
                        };
                        break;
                    }
                    case "ES011": {
                        message.set_result_message(response_body, "ES011");
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

        let second_isbn = (req.body.second_isbn) ? req.body.second_isbn : null;
        let third_isbn = (req.body.third_isbn) ? req.body.third_isbn : null;
        let fourth_isbn = (req.body.fourth_isbn) ? req.body.fourth_isbn : null;
        let fifth_isbn = (req.body.fifth_isbn) ? req.body.fifth_isbn : null;
        let bookmark = (req.body.bookmark) ? req.body.bookmark : false;

        mysql_connetion.query(`insert into registered_book values (?, ?, ?, ?, ?, ?, ?, ?);`,
            [user_id, isbn, new Date(), bookmark, second_isbn, third_isbn, fourth_isbn, fifth_isbn], (err, results, fields) => {
                let result_code = null;
                if (err) {
                    //User DB 서버 오류
                    if (err.code == "ER_DUP_ENTRY") {
                        //데이터 중복
                        result_code = "RS000";
                    }
                    else {
                        //유저 db 오류
                        result_code = "ES010";
                    }
                } else {
                    //등록 성공
                    result_code = "RS000";
                }
                message.set_result_message(response_body, result_code);
                res.json(response_body);
            });

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
        let isbn = req.body.isbn;
        let modify_isbn = req.body.modify_isbn;

        if (isbn && modify_isbn) {
            (async () => {

                let isbn_check_result = null;

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
                    message.set_result_message(response_body, error_code);
                });

                if (!isbn_check_result) {
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
                            modify_isbn_check_result = "success";
                            break;
                        }
                        case "EC005": {
                            // 존재하지 않는 정보, 일치하는 isbn 없음.
                            message.set_result_message(response_body, "EC005", "Not Exist modify_isbn Parameter Info");
                            break;
                        }
                        case "EC001": // 필수 파라미터 누락 및 입력오류
                        case "ES002": {
                            // 책 서버 오류
                            message.set_result_message(response_body, "ES002");
                            break;
                        }
                        case "ES011": {
                            // Book DB 서버 오류
                            message.set_result_message(response_body, "ES011");
                            break;
                        }
                    }

                }).catch(error_code => {
                    message.set_result_message(response_body, error_code);
                });

                if (!modify_isbn_check_result) {
                    res.json(response_body);
                    return;
                }


                await new Promise((resolve, reject) => {

                    mysql_connetion.query(`update registered_book set isbn = ? where user_id = ? and isbn = ? `, [modify_isbn, user_id, isbn], (err, results, fields) => {
                        if (err) {
                            if (err.code === "ER_DUP_ENTRY") {
                                reject("RS002");
                            } else {
                                reject("ES010");
                            }
                        } else {
                            resolve("EC001");
                        }
                    })
                }).then(result => {
                    message.set_result_message(response_body, result);
                }).catch(error_code => {
                    message.set_result_message(response_body, error_code);
                });
                res.json(response_body);

            })();

        } else {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            res.json(response_body);
        }
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
        let isbn = req.body.isbn;

        if (isbn) {
            (async () => {

                let isbn_check_result = null;

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
                    message.set_result_message(response_body, error_code);
                });

                if (!isbn_check_result) {
                    res.json(response_body);
                    return;
                }

                await new Promise((resolve, reject) => {

                    mysql_connetion.query(`delete from registered_book where user_id = ? and isbn = ?`, [user_id, isbn], (err, results, fields) => {
                        if (err) {
                            //User DB 서버 오류
                            reject("ES010");
                        } else {
                            //해당 isbn 존제
                            resolve("success");
                        }
                    });
                }).then(result => {
                    //요청 성공!.
                    message.set_result_message(response_body, "RS000");
                }).catch(error_code => {
                    message.set_result_message(response_body, error_code);
                });

                req.json(response_body);

            })();

        } else {
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            res.json(response_body);
        }
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

        let user_file_upload = multer({
            storage: multers3({
                s3: s3,
                bucket: image_bucket,
                metadata: function (req, file, cb) {
                    cb(null, { fieldName: `${email_parser(user_id)}-${file.originalname}` });
                },
                key: function (req, file, cb) {
                    cb(null, `${email_parser(user_id)}-${file.originalname}`);
                }
            })
        }).single('book_image');

        user_file_upload(req, res, (err) => {
            if (err) {
                //필수 파라미터 누락
                message.set_result_message(response_body, "EC001");
                res.json(response_body);
                return;
            }

            let image_name = req.file.originalname;
            let image_url = req.file.location;

            mysql_connetion.query(`insert into registered_image values (?, ?, ?, ?, ?)`, [image_name, user_id, new Date(), false, image_url], (err, results, fields) => {
                if (err) {
                    console.log(err)
                    //user db 오류
                    message.set_result_message(response_body, "ES010");

                    //s3 업로드된 파일 삭제
                    var params = {
                        Bucket: image_bucket,
                        Key: `${user_id}-${image_name}`
                    };

                    s3.deleteObject(params, function (err, data) {
                        if (err) {
                            console.log(err)
                        }
                    });

                } else {
                    message.set_result_message(response_body, "RS000");

                    //book 정보 가져오기
                    let internal_server_request_form = {
                        method: 'GET',
                        uri: `${host.internal_server}/AnalyzeImage`,
                        qs: {
                            user_id: user_id,
                            file_name: req.file.originalname,
                            image_url: req.file.location
                        },
                        json: true
                    }

                    request.get(internal_server_request_form, (err, httpResponse, response) => {
                        console.log(response)
                    });

                }
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

        mysql_connetion.query(`select file_name, registration_date, state, image_url from registered_image where user_id = ?`, [user_id], (err, results, fields) => {
            if (err) {
                //User DB 서버 오류
                message.set_result_message(response_body, "ES010");
            } else {
                message.set_result_message(response_body, "RS000");
                response_body.Response={
                    count: results.length,
                    item:[]
                }

                for(let i in results){
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

//등록중인 이미지 리스트 요청
router.delete('/ImageList', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;
        let file_name = req.body.file_name;

        if(!file_name){
            //필수 파라미터 누락
            message.set_result_message(response_body, "EC001");
            res.send(response_body);
            return;
        }

        mysql_connetion.query(`delete from registered_image where user_id = ? and file_name = ?`, [user_id, file_name], (err, results, fields) => {
            let result_code = null;
            if (err) {
                //User DB 서버 오류
                result_code = "ES010";
            } else {
                if(results.affectedRows){
                    result_code = "RS000";
                }else{
                    result_code = "EC005";
                }
            }
            message.set_result_message(response_body,result_code);
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

        mysql_connetion.query(`insert into registered_book values (?, ?, ?, ?, ?, ?, ?, ?);`,
            [user_id, isbn, new Date(), bookmark, second_isbn, third_isbn, fourth_isbn, fifth_isbn], (err, results, fields) => {
                if (err) {
                    //User DB 서버 오류
                    if (err.code == "ER_DUP_ENTRY") {
                        //데이터 중복
                        message.set_result_message(response_body, "RS000");
                    }
                    else {
                        message.set_result_message(response_body, "ES010");
                    }
                } else {
                    //등록 성공
                    message.set_result_message(response_body, "RS000");
                }
                res.json(response_body);
            });

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
    let file_name = req.body.file_name;

    if (user_id && file_name) {

        mysql_connetion.query(`update registered_image set state = ? where user_id = ? and file_name = ?;`,
            [true, user_id, file_name], (err, results, fields) => {
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
    let file_name = req.body.file_name;

    if (user_id && file_name) {

        // delete from user where id
        mysql_connetion.query(`delete from registered_image where user_id = ? and file_name = ?;`,
            [user_id, file_name], (err, results, fields) => {
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
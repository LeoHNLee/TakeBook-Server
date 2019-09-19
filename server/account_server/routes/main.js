const express = require('express');
const fs = require('fs');
const request = require('request');
const multer = require('multer');
const multers3 = require('multer-s3');
const aws = require('aws-sdk');

const mysql_connetion = require('../bin/mysql_connetion');
const jwt_token = require("../bin/jwt_token");

const router = express.Router();
const internal_server_address = `http://127.0.0.1:5910`;
const analysis_server_address = `http://127.0.0.1:5901`;
const es_server_address = `http://127.0.0.1:5902`;

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';
let s3 = new aws.S3();
var db = new aws.DynamoDB.DocumentClient();
let bucket = 'red-bucket';
const user_bucket = 'takebook-user-bucket';

//mysql 연결
mysql_connetion.connect();

// 업로드 설정
let upload = multer({
    storage: multers3({
        s3: s3,
        bucket: bucket,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, file.originalname);
        }
    })
}).single('image_file');

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

function join_json_list(join_key, list1,list2){

    let join_list=[];
    for(let i in list1){
        let result = Object.assign({},list1[i]
            ,list2.find(item=>item[join_key]==list1[i][join_key]))
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
                        response_body.Result_Code = "RS001";
                        response_body.Message = "Same ID already exists";
                        break;
                    default:
                        //데이터 베이스 에러
                        response_body.Result_Code = "ES010";
                        response_body.Message = "DataBase Server Error";
                        break;
                }
                console.log(err)
            }
            else {
                //요청 성공
                response_body.Result_Code = "RS000";
                response_body.Message = "Response Success";
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
                response_body.Result_Code = "ES010";
                response_body.Message = "DataBase Server Error";
            }
            else {
                if (results.length) {
                    //동일 아이디 존제
                    response_body.Result_Code = "RS001";
                    response_body.Message = "Response Success";
                    response_body.Response = {};
                    response_body.Response.Result = false;
                    response_body.Response.Message = "Same ID already exists";
                } else {
                    //사용 가능한 아이디
                    response_body.Result_Code = "RS000";
                    response_body.Message = "Response Success";
                    response_body.Response = {};
                    response_body.Response.Result = true;
                    response_body.Response.Message = "ID is Available";
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

//유저 로그인
router.post('/UserLogin', (req, res) => {
    const response_body = {};

    let user_id = req.body.user_id;
    let user_password = req.body.user_password;

    if (user_id && user_password) {
        mysql_connetion.query(`select id, pw, name, signup_date, profile_url, update_date from user where id = ?`, [user_id], (err, results, fields) => {
            if (err) {
                console.log(err)
                response_body.Result_Code = "ES010";
                response_body.Message = "DataBase Server Error";
            }
            else {
                if (results.length) {

                    if (results[0].pw === user_password) {

                        // jwt 토큰 생성
                        let token = jwt_token.create_token({ id: results[0].id });

                        //로그인 성공.
                        response_body.Result_Code = "RS001";
                        response_body.Message = "Response Success";
                        response_body.Response = {};

                        //유저 토큰
                        response_body.Response.user_token = token;

                        //회원 정보
                        response_body.Response.user_info = {};
                        response_body.Response.user_info.id = results[0].id;
                        response_body.Response.user_info.name = results[0].name;
                        response_body.Response.user_info.signup_date = results[0].signup_date;
                        response_body.Response.user_info.profile_url = results[0].profile_url;
                        response_body.Response.user_info.update_date = results[0].update_date;
                    } else {
                        // password 오류.
                        response_body.Result_Code = "RS001";
                        response_body.Message = "Incorrect User Information";
                    }

                } else {
                    // 아이디 불일치.
                    response_body.Result_Code = "RS001";
                    response_body.Message = "Incorrect User Information";
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
                response_body.Result_Code = "ES010";
                response_body.Message = "DataBase Server Error";
            }
            else {
                //사용자 정보 요청 성공
                response_body.Result_Code = "RS001";
                response_body.Message = "Response Success";
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
        response_body.Result_Code = "EC002";
        response_body.Message = "Unauthorized token";
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
            response_body.Result_Code = "EC001";
            response_body.Message = "invalid parameter error";
            res.json(response_body)
            return;
        }

        mysql_connetion.query(`update user set state_message = ? where id = ?;`, [state_message, user_id], (err, results, fields) => {
            if (err) {
                console.log(err)
                //데이터 베이스 오류
                response_body.Result_Code = "ES010";
                response_body.Message = "DataBase Server Error";
            }
            else {
                //요청 성공
                response_body.Result_Code = "RS001";
                response_body.Message = "Response Success";
                response_body.Response = {};
                response_body.Response.state_message = state_message;
            }
            res.send(response_body);
        });
    } else {
        //권한 없는 토큰.
        response_body.Result_Code = "EC002";
        response_body.Message = "Unauthorized token";
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
                    cb(null, { fieldName: `${user_id}-profile.jpg` });
                },
                key: function (req, file, cb) {
                    cb(null, `${user_id}-profile.jpg`);
                }
            })
        }).single('profile_image');

        user_file_upload(req, res, (err) => {
            if (err) {
                //필수 파라미터 누락
                response_body.Result_Code = "EC001";
                response_body.Message = "invalid parameter error";
                res.json(response_body);
            }
            else {
                if (req.file) {

                    //정보 수정
                    mysql_connetion.query(`update user set profile_url = ? where id = ?;`, [req.file.location, user_id], (err, results, fields) => {
                        if (err) {
                            console.log(err)
                            //데이터 베이스 오류
                            response_body.Result_Code = "ES010";
                            response_body.Message = "DataBase Server Error";
                        }
                        else {
                            //요청 성공.
                            response_body.Result_Code = "RS000";
                            response_body.Message = "Response Success";
                            response_body.Response = {};
                            response_body.Response.profile_url = req.file.location;
                        }
                        res.send(response_body);
                    });
                }
                else {
                    //필수 파라미터 누락
                    response_body.Result_Code = "EC001";
                    response_body.Message = "invalid parameter error";
                    res.json(response_body);
                }
            }

        });
    } else {
        //권한 없는 토큰.
        response_body.Result_Code = "EC002";
        response_body.Message = "Unauthorized token";
        res.send(response_body);
    }
});

//회원 프로필 수정
router.delete('/UserProfile', (req, res) => {

    const response_body = {};

    let token = req.headers.authorization;
    let decoded = jwt_token.token_check(token);

    if (decoded) {
        let user_id = decoded.id;


        var params = {
            Bucket: user_bucket,
            Key: `${user_id}-profile.jpg`
        };

        s3.deleteObject(params, function (err, data) {
            if (err) {
                console.log(err)
                //S3 서버 오류
                response_body.Result_Code = "ES011";
                response_body.Message = "S3 Server Error";
                res.send(response_body);
            } else {
                console.log(data)
                //정보 수정
                mysql_connetion.query(`update user set profile_url = null where id = ?;`, [user_id], (err, results, fields) => {
                    if (err) {
                        console.log(err)
                        //데이터 베이스 오류
                        response_body.Result_Code = "ES010";
                        response_body.Message = "DataBase Server Error";
                    }
                    else {
                        //요청 성공.
                        response_body.Result_Code = "RS000";
                        response_body.Message = "Response Success";
                    }
                    res.send(response_body);
                });
            }
        });
    } else {
        //권한 없는 토큰.
        response_body.Result_Code = "EC002";
        response_body.Message = "Unauthorized token";
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
        }else{
            // 다른 사용자 검색 일 경우.
            user_id = main_user_id;
        }
        //
        //

        let keyword = (req.query.keyword) ? req.query.keyword : null;
        let category = ((req.query.category)&&keyword) ? req.query.category : "isbn";
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


        if(category){
            if(!["title", "isbn", "author"].includes(category)){
                //파라미터 값 오류
                response_body.Result_Code = "EC001";
                response_body.Message = "category parameter error";
                res.send(response_body);
                return;
            }
        }

        if(sort_key){
            if(!["title", "author", "publisher", "registration_date"].includes(sort_key)){
                //파라미터 값 오류
                response_body.Result_Code = "EC001";
                response_body.Message = "sort_key parameter error";
                res.send(response_body);
                return;
            }
        }

        if(sort_method){
            if(!["asc", "desc"].includes(sort_method)){
                //파라미터 값 오류
                response_body.Result_Code = "EC001";
                response_body.Message = "sort_method parameter error";
                res.send(response_body);
                return;
            }
        }

        // query 구문 구성
        let query = `select isbn, registration_date from registered_book where user_id = ? `

        // sort_key==="registration_date" 인 경우에만 예외처리. 디비의 스키마가 다르기 떄문.
        if(sort_key==="registration_date"){
            query+= `order by ${sort_key} ${sort_method} `;

            if(max_count){
                query+=`limit ${max_count}`;
            }
        }

        mysql_connetion.query(query, [user_id], (err, results, fields) => {
            if (err) {
                console.log(err);
                //데이터 베이스 오류
                response_body.Result_Code = "ES010";
                response_body.Message = "DataBase Server Error";
                res.send(response_body);
                return;
            }

            let book_list = [];
            let isbn_list = [];
            for (let result in results) {
                book_list.push({
                    isbn: results[result].isbn,
                    registration_date: results[result].registration_date.toISOString().slice(0, 19).replace('T', ' ')
                });
                isbn_list.push(results[result].isbn);
            }
            
            //book 정보 가져오기
            let internal_server_request_form = {
                method: 'GET',
                uri: `${internal_server_address}/UserBook`,
                qs: {
                    isbn_list: isbn_list
                },
                json: true
            }

            for(let key in query_key){
                if(query_key[key]){
                    internal_server_request_form.qs[key] = query_key[key];
                }
            }

            if(sort_key==="registration_date"){
                internal_server_request_form.qs.sort_key = null;
                internal_server_request_form.qs.max_count = null;
            }

            //도서 정보 요청
            request.get(internal_server_request_form, (err, httpResponse, response) => {
                if (err) {
                    //내부 서버 오류
                    response_body.Result_Code = "ES004";
                    response_body.Message = "Internal Server Error";
                    res.send(response_body);
                    return;
                }
                
                switch(response.Result_Code){
                    case "RS000":{
                        let book_join_list = [];
                        if(sort_key==="registration_date"){
                            // isbn을 통한 join
                            // registration_date 인경우 예외처리.
                            book_join_list = join_json_list("isbn",book_list,response.Response.item);
                        }else{
                            //isbn을 통한 join
                            book_join_list = join_json_list("isbn",response.Response.item,book_list)
                        }

                        //요청 성공.
                        response_body.Result_Code = response.Result_Code;
                        response_body.Message = "Response Success";
                        response_body.Response = {
                            count: book_join_list.length,
                            item: book_join_list
                        };
                        break;
                    }
                    case "ES011":{
                        response_body.Result_Code = response.Result_Code;
                        response_body.Message = "Book DataBase Server Error";
                        break;
                    }
                }
                res.json(response_body)
            })


        });

    } else {
        //권한 없는 토큰.
        response_body.Result_Code = "EC002";
        response_body.Message = "Unauthorized token";
        res.send(response_body);
    }
});


router.post('/result', (req, res) => {
    upload(req, res, (err) => {

        const response_body = {};

        if (err) {
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body);
            return;
        }

        let file = req.file;
        let user_id = req.body.user_id;

        //필수값 없을시
        if (file && user_id) {

            let filename = file.originalname;

            (async (response_body) => {
                let analysis_result = {};

                //도서 분석 요청
                await new Promise((resolve, reject) => {

                    // 도서 분석 요청 request form
                    let form = {
                        method: 'POST',
                        uri: `${analysis_server_address}/result`,
                        body: {
                            'filename': filename,
                        },
                        json: true
                    }

                    request.post(form, (err, httpResponse, response) => {
                        if (err) {
                            // 요청 에러
                            response_body.is_error = true;
                            response_body.error_code = 1;
                            analysis_result = false;
                            resolve("analysis_requset_error")
                        }
                        else {
                            let is_error = response.is_error;

                            if (is_error) {
                                console.log("분석 요청 오류");
                                response_body.is_error = is_error
                                response_body.error_code = 1
                                analysis_result = false;
                                resolve("analysis_requset_fail");
                            } else {
                                analysis_result = response;
                                resolve("analysis_requset_success!");
                            }
                        }
                    });
                });

                if (!analysis_result) {
                    res.json(response_body);
                    return;
                }

                let elasticsearch_result = {};
                // 분석 결과값 elastic_search 검색요청.
                await new Promise((resolve, reject) => {
                    //request form
                    const form = {
                        method: 'POST',
                        uri: `${es_server_address}/search`,
                        body: {
                            'result': analysis_result.result,
                        },
                        json: true
                    }

                    request.post(form, (err, httpResponse, response) => {
                        if (err) {
                            // 요청 에러
                            resolve("elasticsearch_requset_failed")
                            response_body.is_error = true;
                            response_body.result = 3;
                            elasticsearch_result = false;
                            return;
                        }

                        let is_find = response.hits.total;
                        if (is_find === 0) {
                            response_body.is_error = true;
                            response_body.result = 3;
                            elasticsearch_result = false;
                            resolve("elasticsearch_requset_success");
                            return;
                        } else {
                            elasticsearch_result = response.hits.hits[0]._source;
                            resolve("elasticsearch_requset_success");
                        }
                    });
                });
                if (!elasticsearch_result) {
                    res.json(response_body);
                    return;
                }

                //database 에검색
                await new Promise((resolve, reject) => {
                    let search_isbn = elasticsearch_result.isbn;

                    // mysql_connetion.query(`SELECT * FROM book WHERE isbn=${search_isbn};`, (err, results, fields) => {
                    //     if (err) {
                    //         console.log(err);
                    //         resolve("mysql_requset_failed");
                    //         return;
                    //     }

                    //     if (results.length) {
                    //         for (let key in results[0]) {
                    //             let upperkey = key.toLowerCase();
                    //             response_body[upperkey] = results[0][key];
                    //         }
                    //     }
                    //     response_body.is_error = false;
                    //     res.json(response_body)
                    //     resolve("mysql_requset_success");
                    //     return;
                    // })

                    let keyorder = ['isbn', 'title', 'author', 'translator',
                        'publisher', 'published_date', 'url_alladin',
                        'image_url', 'contents', 'discriptions']
                    var params = {
                        TableName: "book",
                        Key: {
                            isbn: '9788981793418'
                        },
                        AttributesToGet: keyorder
                    }

                    db.get(params, function (err, data) {
                        if (err) {
                            console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                            resolve("database_requset_failed");
                        } else {
                            response_body.is_error = false;
                            for (let key in keyorder) {
                                if (data["Item"][keyorder[key]]) {
                                    response_body[keyorder[key]] = data["Item"][keyorder[key]];
                                }
                            }
                            res.json(response_body)
                            resolve("database_requset_success");
                        }
                    });
                });

            })(response_body);

        } else {
            console.log("form 값 오류");
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })

});

router.post('/analysis', (req, res) => {
    upload(req, res, (err) => {

        const response_body = {};

        if (err) {
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body);
            return;
        }

        let file = req.file;
        let user_id = req.body.user_id;

        //필수값 없을시
        if (file && user_id) {

            let filename = file.originalname;

            (async (response_body) => {
                let analysis_result = {};

                //도서 분석 요청
                await new Promise((resolve, reject) => {

                    // 도서 분석 요청 request form
                    let form = {
                        method: 'POST',
                        uri: `${analysis_server_address}/result`,
                        body: {
                            'filename': filename,
                        },
                        json: true
                    }

                    request.post(form, (err, httpResponse, response) => {
                        if (err) {
                            // 요청 에러
                            response_body.is_error = true;
                            response_body.error_code = 1;
                            analysis_result = false;
                            resolve("analysis_requset_error")
                        }
                        else {
                            let is_error = response.is_error;

                            if (is_error) {
                                console.log("분석 요청 오류");
                                response_body.is_error = is_error
                                response_body.error_code = 1
                                analysis_result = false;
                                resolve("analysis_requset_fail");
                            } else {
                                analysis_result = response;
                                resolve("analysis_requset_success!");
                            }
                        }
                    });
                });
                res.json(analysis_result);

            })(response_body);

        } else {
            console.log("form 값 오류");
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })
});

router.post('/ocrtest', (req, res) => {

    upload(req, res, (err) => {

        const response_body = {};

        if (err) {
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body);
            return;
        }

        let file = req.file;
        let user_id = req.body.user_id;

        //필수값 없을시
        if (file && user_id) {

            let filename = file.originalname;

            (async (response_body) => {
                await new Promise((resolve, reject) => {
                    //요청을 보낼 request form
                    const form = {
                        method: 'POST',
                        uri: `${analysis_server_address}/result`,
                        body: {
                            'filename': filename,
                        },
                        json: true
                    }

                    //도서 분석 요청
                    request.post(form, (err, httpResponse, response) => {
                        if (err) {
                            return console.error('response failed:', err);
                        }

                        let is_error = response.is_error;

                        if (is_error) {
                            console.log("분석 요청 오류");
                            response_body.is_error = is_error
                            response_body.error_code = response.error_code
                            response_body.error_code = 1
                            res.json(response_body)
                        } else {
                            response_body.result = response.result;
                            res.json(response_body)
                        }
                    })

                });
            })(response_body);

        } else {
            console.log("form 값 오류");
            response_body.is_error = true;
            //error_code: 1     Request 필수값 미설정.
            response_body.error_code = 1;
            res.json(response_body)
        }
    })

});


router.get('/save', (req, res) => {

    (async () => {
        let mysql_data = [];
        await new Promise((resolve, reject) => {
            mysql_connetion.query(`select TITLE,ISBN, IMAGE_URL from book where PUBLISHED_DATE like '201801%'`, (err, results, fields) => {
                mysql_data = results;
            })
        })
        let keyorder = ['isbn', 'title', 'author', 'translator',
            'publisher', 'published_date', 'url_alladin',
            'image_url', 'contents', 'discriptions']
        var params = {
            TableName: "book",
            Key: {
                isbn: '9788981793418'
            },
            AttributesToGet: keyorder
        }

        db.get(params, function (err, data) {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                resolve("database_requset_failed");
            } else {
                response_body.is_error = false;
                for (let key in keyorder) {
                    if (data["Item"][keyorder[key]]) {
                        response_body[keyorder[key]] = data["Item"][keyorder[key]];
                    }
                }
                res.json(response_body)
                resolve("database_requset_success");
            }
        });

        // for (let key in mysql_data) {
        //     await new Promise((resolve, reject) => {
        //         //다른 서버에 요청을 보낼 request form
        //         let form = {
        //             method: 'POST',
        //             uri: `${es_server_address}/save`,
        //             body: {},
        //             json: true
        //         }

        //         form.body.title = mysql_data[key].TITLE;
        //         form.body.isbn = mysql_data[key].ISBN;
        //         form.body.fileurl = mysql_data[key].IMAGE_URL;

        //         postrequest.post(form, (err, httpResponse, response) => {
        //             if (err) {
        //                 console.log(err);
        //             }
        //         })
        //     });
        // }
    })();

})

module.exports = router;
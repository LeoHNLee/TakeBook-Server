const moment = require('moment-timezone');

const redis_client = require('./redis_client');

function current_datetime() {
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

const key = "log:account"

class LogRegister {

    constructor() { }

    //log 기록
    regist_log() {
        redis_client.rpush(key, "hello world!", (err, req) => {
            if (err) {
                console.log("log regist error!");
            }
        })
    }

    regist_request_log(req, res, next) {
        //request log 기록
        //@parms method    요청 method    
        //@parms path      요청 path
        //@parms request_data     요청 받은 body or parms json

        let method = req.method;
        let path = req.route.path;
        let request = null;

        if (req.method === "GET") {
            request = req.query;
        } else {
            request = req.body;
        }

        let data = "";
        if (request&&request!=={}) {
            data = JSON.stringify(request);
        } else {
            data = "none";
        }

        // (요청 시간) (method) (path) request with (request body or parms)
        let log_text = `${current_datetime()} ${method} ${path} request with ${data}`

        redis_client.rpush(key, log_text, (err, req) => {
            if (err) {
                console.log("log regist error!");
            }
            next();
        })
    }

    regist_response_log(method, path, response) {
        //request log 기록
        //@parms method    요청 method    
        //@parms path      요청 path
        //@parms request_data     요청 받은 body or parms json

        let data = "";
        if (response) {
            data = JSON.stringify(response);
        } else {
            data = "none";
        }

        // (요청 시간) (method) (path) response with (response body)
        let log_text = `${current_datetime()} ${method} ${path} response with ${data}`

        redis_client.rpush(key, log_text, (err, req) => {
            if (err) {
                console.log("log regist error!");
            }
        })
    }


    regist_database_log(query, result) {
        //database log 기록
        //@parms method       요청 method    
        //@parms path         요청 path
        //@parms result       저장 성공 여부.
        //@parms insert_data  저장할 body or parms json

        let result_text = "";

        if (result) {
            result_text = "succeed";
        } else {
            result_text = "failed";
        }

        let log_text = null;

        if (query) {
            // (요청 시간) Sending a query to the database is succeded.  Query: (query) 
            log_text = `${current_datetime()} sending a query to the database is ${result_text}. query: ${query}`
        }
        else{
            // (요청 시간) Database connect error.
            log_text = `${current_datetime()} s Database connect error.`
        }


        redis_client.rpush(key, log_text, (err, req) => {
            if (err) {
                console.log("log regist error!");
            }
        })

    }

    regist_s3_log(method, path, result, insert_data) {
        //database log 기록
        //@parms method       요청 method    
        //@parms path         요청 path
        //@parms result       저장 성공 여부.
        //@parms insert_data  저장할 body or parms json

        let data = "";
        if (insert_data) {
            data = JSON.stringify(insert_data);
        } else {
            data = "none";
        }

        let result_text = "";

        if (result) {
            result_text = "success";
        } else {
            result_text = "fail";
        }

        // (요청 시간) (method) (path) request s3 (result). file: (bucketname + method + filename)
        let log_text = `${current_datetime()} ${method} ${path} request s3 ${result_text}. data: ${data}`

        redis_client.rpush(key, log_text, (err, req) => {
            if (err) {
                console.log("log regist error!");
            }
        })

    }

    //log 기록
    get_log_list() {
        redis_client.lrange("log", 0, -1, (err, req) => {
            if (err) {
                console.log("get log list error!");
            }
            else {
                console.log(req)
            }
        })
    }
}

module.exports = LogRegister;
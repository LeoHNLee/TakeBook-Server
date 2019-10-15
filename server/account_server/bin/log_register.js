const moment = require('moment-timezone');

const redis_client = require('./redis_client');

function current_datetime(){
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

const key = "log:account"

class LogRegister{

    constructor(){}

    //log 기록
    regist_log(){
        redis_client.rpush(key,"hello world!" , (err, req)=>{
            if(err){
                console.log("log regist error!");
            }
        })
    }

    regist_request_log(method, path, request_data){
        //request log 기록
        //@parms method    요청 method    
        //@parms path      요청 path
        //@parms request_data     요청 받은 body or parms json
        
        let data ="";
        if(request_data){
            data = JSON.stringify(request_data);
        }else{
            data = "none";
        }

        // (요청 시간) (method) (path) request with (request body or parms)
        let log_text = `${current_datetime()} ${method} ${path} request with ${data}`

        redis_client.rpush(key, log_text , (err, req)=>{
            if(err){
                console.log("log regist error!");
            }
        })
    }

    regist_response_log(method, path, response){
        //request log 기록
        //@parms method    요청 method    
        //@parms path      요청 path
        //@parms request_data     요청 받은 body or parms json
        
        let data ="";
        if(response){
            data = JSON.stringify(response);
        }else{
            data = "none";
        }

        // (요청 시간) (method) (path) response with (request body or parms)
        let log_text = `${current_datetime()} ${method} ${path} request with ${data}`

        redis_client.rpush(key, log_text , (err, req)=>{
            if(err){
                console.log("log regist error!");
            }
        })
    }

    regist_database_log(method, path, result, insert_data){
        //database log 기록
        //@parms method       요청 method    
        //@parms path         요청 path
        //@parms result       저장 성공 여부.
        //@parms insert_data  저장할 body or parms json

        let data ="";
        if(insert_data){
            data = JSON.stringify(insert_data);
        }else{
            data = "none";
        }

        let result_text ="";
        
        if(result){
            result_text = "success";
        }else{
            result_text = "fail";
        }

        // (요청 시간) (method) (path) save data in database (result). data: (table name + query type + data)
        let log_text = `${current_datetime()} ${method} ${path} save data in database ${result_text}. data: ${data}`

        redis_client.rpush(key, log_text , (err, req)=>{
            if(err){
                console.log("log regist error!");
            }
        })

    }

    regist_s3_log(method, path, result, insert_data){
        //database log 기록
        //@parms method       요청 method    
        //@parms path         요청 path
        //@parms result       저장 성공 여부.
        //@parms insert_data  저장할 body or parms json

        let data ="";
        if(insert_data){
            data = JSON.stringify(insert_data);
        }else{
            data = "none";
        }

        let result_text ="";
        
        if(result){
            result_text = "success";
        }else{
            result_text = "fail";
        }

        // (요청 시간) (method) (path) request s3 (result). file: (bucketname + method + filename)
        let log_text = `${current_datetime()} ${method} ${path} requset s3 ${result_text}. data: ${data}`

        redis_client.rpush(key, log_text , (err, req)=>{
            if(err){
                console.log("log regist error!");
            }
        })

    }

    //log 기록
    get_log_list(){
        redis_client.lrange("log", 0, -1, (err, req)=>{
            if(err){
                console.log("get log list error!");
            }
            else{
                console.log(req)
            }
        })
    }
}

module.exports = LogRegister;
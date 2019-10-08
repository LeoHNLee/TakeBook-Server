const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');


let log_config = "";
try{
    log_config = require("../config/log_config.json");
}
catch(e){
    let log_path = path.normalize(__dirname+'/../config/')
    
    switch(e){
        case 'MODULE_NOT_FOUND':
        default:{
            let obj = {
                log_count: 0,
                save_cycle: 15
            }
            let json = JSON.stringify(obj);
            fs.writeFileSync(`${log_path}log_config.json`, json, 'utf-8');
            log_config = obj;
        }
    }
}

function current_datetime(){
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

let log_code = "AS";
let log_path = __dirname+'/../log';

class LogRegister{
    static log_count= log_config.log_count
    static save_cycle= log_config.save_cycle

    constructor(){}

    //log file 생성
    create_log_file(){

    }
    
    //requset 요청 기록
    regist_request_log(method, path, request_data){
        // @ param method: 요청받은 method
        // @ param path: 요청 받은 경로
        // @ param request_data: 요청에 함께온 data

    }
}

let log_register = {
    //로그 번호
    log_count: log_config.log_count,
    save_cycle: log_config.save_cycle,
    //requset 요청 기록
    regist_request_log: function(method, path, request_data) {
        // @ param method: 요청받은 method
        // @ param path: 요청 받은 경로
        // @ param request_data: 요청에 함께온 data
        console.log(this.log_count)

    },
    //토큰값 확인
    // token_check: function(token) {
    //     // @ param token: 복호화 할 토큰 값
    //     // @ return 복호화된 json 정보.
    //     // @ return 유효하지 않은 토큰 -> null.

    //     try {
    //         let decoded = jwt.verify(token, secretObj.secret);
    //         if (decoded) {
    //             return decoded;
    //         } else {
    //             return null;
    //         }
    //     }
    //     catch (JsonWebTokenError) {
    //         return null;
    //     }
    // }
}

module.exports = log_register;
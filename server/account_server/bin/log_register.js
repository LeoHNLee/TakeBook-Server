const moment = require('moment-timezone');

const redis_client = require('./redis_client');

function current_datetime(){
    return moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
}

class LogRegister{

    constructor(){}

    //log 기록
    regist_log(){
        redis_client.rpush("log","hello world!" , (err, req)=>{
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
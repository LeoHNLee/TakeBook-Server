const schedule = require('node-schedule');
const fs = require('fs');
const aws = require('aws-sdk');
const moment = require('moment-timezone');

const redis_client = require('./bin/redis_client');

//aws region 설정, s3설정
aws.config.region = 'ap-northeast-2';

let s3 = new aws.S3();
const log_bucket = 'takebook-log';
const bucket_dir = 'account';

function current_time(){
    //현재시간 표시
    return moment().tz("Asia/Seoul").format('YYYYMMDDHHmmss');
}

function current_YMD(){
    //현재시간 표시
    return moment().tz("Asia/Seoul").format('YYYYMMDD');
}

//(second) (minute) (hour) (date) (month) (year) (
let scheduleJob = "0 */3 * * * *"

let working = false;
let workload = 50;

schedule.scheduleJob(scheduleJob, ()=>{
    if (!working) {
        working = true;
        redis_client.lrange("log:account", 0, workload, (err, req) => {
            if(err){
                console.log(err)
                working = false;
                return;
            }
    
            if(req.length==0){
                working = false;
                return;
            }
    
            let log_text = req.join('\n');
            //파일 생성.
            fs.writeFileSync('./log.txt', log_text);
    
            let log_file = fs.readFileSync('./log.txt');
    
            //s3 파라미터
            let s3_params = {
                Body: log_file,
                Bucket: log_bucket,
                Key: `${bucket_dir}/${current_YMD()}/${current_time()}.txt`,
            };
    
            s3.putObject(s3_params, (err, data)=>{
                if(err){
                    console.log(err)
                }
                else{
                    //로컬 로그 파일 삭제.
                    fs.unlinkSync('./log.txt');
                    redis_client.ltrim("log:account", workload, -1)
                    console.log("save log success!")
                }
                working = false;
            });
        });
    }
});
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const aws = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const moment = require('moment-timezone');

const message = require('../bin/message');

//aws region 설정, dynamodb 연결
aws.config.region = 'ap-northeast-2';
const logdb = new aws.DynamoDB.DocumentClient();
const log_table_name = "internal_log"

// python 모듈 불러오기
//
// @parms   img_path: 분석이미지 위치
// @parms   path_type: 이미지 유형(url, local)
// @parms   response: 요청온 클라이언트의 respone
// @parms   response_body: respone 의 body form
function pytojs(img_path, path_type, response, response_body) {
    let { PythonShell } = require('python-shell')

    let options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // local python 설치 경로
        pythonPath: path.normalize(__dirname + '/../venv/bin/python3'), // venv python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: path.normalize(__dirname + '/../python_module'), // 실행할 python 파일 경로
        args: ['-p', img_path, '-t', path_type]
    };

    PythonShell.run('node_book_predict.py', options, function (err, results) {
        if (err) {
            console.log(`에러발생: ${err}`)
        }

        var data = ``;
        for (var i in results) {
            data += results[i] + ' ';
        }

        String.prototype.replaceAll = function (org, dest) {
            return this.split(org).join(dest);
        }

        data = JSON.parse(data)
        response.json(data);
        // response.json(data);

        // response_body.is_error = false;
        // response_body.result = data;
        // response.json(response_body);
        fs.unlinkSync(img_path);
    });

};

function get_feature(img_path, path_type) {
    return new Promise((resolve, reject) => {
        let { PythonShell } = require('python-shell')

        //파이선 경로 설정
        var options = {
            mode: 'text',
            // pythonPath: '/usr/local/bin/python3', // local python 설치 경로
            pythonPath: path.normalize(__dirname + '/../venv/bin/python3'), // venv python 설치 경로
            pythonOptions: ['-u'],
            scriptPath: path.normalize(__dirname + '/../python_module'), // 실행할 python 파일 경로
            args: ['-p', img_path, '-t', path_type, '-mp', path.normalize(__dirname + '/../modle/kmeans/')]
        };

        PythonShell.run('node_book_predict.py', options, function (err, results) {

            if (err) {
                reject(err);
                return;
            }

            var data = ``;
            for (var i in results) {
                data += results[i] + ' ';
            }

            data = JSON.parse(data);
            resolve(data);
            return;
        });

    });
}

router.get('/result', (req, res) => {
    res.send('왜일로 들왔누?')
});

router.post('/result', (req, res) => {
    let s3 = new aws.S3();
    let filename = req.body.filename;

    let response_body = {}

    if (filename) {

        //빈 파일 생성
        let file = fs.createWriteStream(`./uploads/${filename}`);

        const myBucket = 'red-bucket';

        let params = {
            Bucket: myBucket,
            Key: filename
        };

        s3.getObject(params).createReadStream()
            .on('error', (e) => {
                response_body.is_error = true;
                // error_code: 2     S3에 해당 파일이 존재하지 않음.
                response_body.error_code = 2;
                res.json(response_body);

                fs.unlinkSync(`./uploads/${filename}`);
            })
            .pipe(file)
            .on('finish', () => {
                pytojs(`uploads/${filename}`, 'local', res, response_body);
            });

    }
    else {
        response_body.is_error = true;
        //error_code: 1     Request 필수값 미설정.
        response_body.error_code = 1;
        res.json(response_body);
    }

});

router.get('/UrlAnalyze', (req, res) => {
    let respone_body = {}
    let image_url = req.query.image_url;

    if (!image_url) {
        //필수 파라미터 누락
        message.set_result_message(respone_body, "EC001");
        res.json(respone_body)
        return;
    }

    get_feature(image_url, 'url')
        .then(results => {
            switch(results.code){
                case 999:{
                    message.set_result_message(respone_body, "RS000");
                    respone_body.Response = results;
                    break;
                }
                case 0:{
                    message.set_result_message(respone_body, "EP001");
                    break;
                }
                default:{
                    message.set_result_message(respone_body, "EP001");
                    break;
                }
            }

            res.json(respone_body);
        })
        .catch(err=>{
            console.log(err);
            message.set_result_message(respone_body, "EP000");
            res.json(respone_body);
        });

});

module.exports = router;
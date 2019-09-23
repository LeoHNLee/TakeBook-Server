const express = require('express');
const router = express.Router();
const domain = require('domain').create();
const fs = require('fs')

const message = require('../bin/message');

const AWS = require('aws-sdk');
AWS.config.region = 'ap-northeast-2'


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
        pythonPath: '/Users/bsh/Documents/git_directory/p1039_red/server/analysis_server/venv/bin/python3', // venv python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: '/Users/bsh/Documents/git_directory/p1039_red/server/analysis_server/python_module', // 실행할 python 파일 경로
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

        console.log(data.replaceAll('\'', '\"'));
        data = JSON.parse(data)
        response.json(data);
        // response.json(data);

        // response_body.is_error = false;
        // response_body.result = data;
        // response.json(response_body);
        fs.unlinkSync(img_path);
    });

};

async function getresult(img_path, path_type) {
    let { PythonShell } = require('python-shell')

    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // local python 설치 경로
        pythonPath: '/Users/bsh/Documents/git_directory/p1039_red/server/analysis_server/venv/bin/python3', // venv python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: '/Users/bsh/Documents/git_directory/p1039_red/server/analysis_server/python_module', // 실행할 python 파일 경로
        args: ['-p', img_path, '-t', path_type]
    };

    let analyze_result = '';
    await new Promise((resolve, reject) => {
        PythonShell.run('node_book_predict.py', options, function (err, results) {

            if (err) {
                console.log(`에러발생: ${err}`)
                reject("python error");
            }

            var data = ``;
            for (var i in results) {
                data += results[i] + ' ';
            }

            resolve("success");
            analyze_result = data;
            return;
        });
    })

    analyze_result = JSON.parse(analyze_result);

    return analyze_result;
};

router.get('/result', (req, res) => {
    res.send('왜일로 들왔누?')
});

router.post('/result', (req, res) => {
    let s3 = new AWS.S3();
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

    if(!image_url){
        //필수 파라미터 누락
        message.set_result_message(respone_body, "EC001");
        res.json(respone_body)
        return;
    }

    getresult(image_url, 'url').then(analyze_result => {
        if(!analyze_result.code){
            message.set_result_message(respone_body, "RS001");
            respone_body.Response = analyze_result;
            res.json(respone_body)
        }
    });

});

module.exports = router;
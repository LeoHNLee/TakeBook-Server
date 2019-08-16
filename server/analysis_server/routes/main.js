const express = require('express');
const router = express.Router();
const domain = require('domain').create();
const fs = require('fs')

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

    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // local python 설치 경로
        pythonPath: './venv/bin/python3', // venv python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: './python_module', // 실행할 python 파일 경로
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

        response_body.is_error = false;
        response_body.result = data;
        response.json(response_body);

        fs.unlinkSync(img_path);
    });

};

function getresult(img_path, path_type, response, response_body) {
    let { PythonShell } = require('python-shell')

    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // local python 설치 경로
        pythonPath: './venv/bin/python3', // venv python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: './python_module', // 실행할 python 파일 경로
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

        response_body.result = data;
        response.json(response_body);
    });
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
        .on('finish',()=>{
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

router.post('/es', (req, res) => {
    let fileurl = req.body.fileurl;
    let response_body = {}

    getresult(fileurl, 'url', res, response_body);

});

module.exports = router;
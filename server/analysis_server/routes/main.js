const multer = require('multer');
const express = require('express');
const router = express.Router();
const domain = require('domain').create();
const fs = require('fs')

const address = `http://127.0.0.1:5901`;

const AWS = require('aws-sdk');
AWS.config.region = 'ap-northeast-2'


// 업로드 설정
var upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename(req, file, cb) {
            cb(null, file.originalname);
        }
    }),
});

// python 모듈 불러오기
function pytojs(img_path,path_type,response,response_body) {
    let { PythonShell } = require('python-shell')
    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // python 설치 경로
        pythonPath: './venv/bin/python3', // python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: './python_module', // 실행할 python 파일 경로
        args: ['-p', img_path, '-t', path_type]
    };
    PythonShell.run('node_book_predict.py', options, function (err, results) {

        if (err) {
            console.log(`에러발생: ${err}`)
        }
        // results is an array consisting of messages collected during execution
        var data = ``;
        for (var i in results) {
            data += results[i] + ' ';
        }
        response_body.is_error = false;
        response_body.error_code = 0;
        response_body.result = data;
        response.json(response_body);
    });
};


router.get('/result', (req, res) => {
    res.send('왜일로 들왔누?')
});

router.post('/result', (req, res) => {
    let s3 = new AWS.S3();
    let file_name = req.body.file_name;

    let response_body = {}

    //s3로부터 파일 가져오기
    let get_file_from_s3 = ()=>{
        const myBucket = 'red-bucket';    

        let params = {
            Bucket: myBucket,
            Key: file_name
        };

        domain.run(() => {
            //s3로 부터 가져온 파일을 file에 집어넣음
            var stream = s3.getObject(params).createReadStream().pipe(file);

            //가져온 파일을 분석
            stream.on('finish', () => {
                pytojs(`uploads/${file_name}`,'local',res, response_body);
            })
        })
    
        //s3에 해당파일이 존재하지 않을때
        domain.on('error', (err) => {
            console.log(err);
            response_body.is_error = true;
            response_body.error_code = 1;

        })    
    }

    //빈 파일 생성
    let file = fs.createWriteStream(`./uploads/${file_name}`);
    get_file_from_s3();

    //디렉토리가 없을시
    file.on('error', (err) => {
        console("실행!!")
        fs.mkdir('./uploads', { recursive: true }, (err) => {
            if (err) {res.send(err);}
            else {
                file = require('fs').createWriteStream(`uploads/${file_name}`);
                get_file_from_s3()
            }
        });
    });

});

module.exports = router;
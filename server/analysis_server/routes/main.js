const multer = require('multer');
const express = require('express');
const router = express.Router();

const address = `http://127.0.0.1:5901`;

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
function pytojs(url, res) {
    let { PythonShell } = require('python-shell')
    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // python 설치 경로
        pythonPath: './venv/bin/python3', // python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: './python_module', // 실행할 python 파일 경로
        args: ['-p', url, '-t', 'url']
    };
    PythonShell.run('node_book_predict.py', options, function (err, results) {

        if (err) {
            console.log(`에러발생: ${err}`)
        }
        // results is an array consisting of messages collected during execution
        var data = ``;
        for (var i in results) {
            data += "<p>" + results[i] + "</p>";
        }
        res.send(data);
    });
};


router.get('/result', (req, res) => {
    res.send('왜일로 들왔누?')
});

router.post('/result', upload.single('book_image'), (req, res) => {
    var fileurl = `${address}/${req.file.path}`
    pytojs(fileurl, res)
});

module.exports = router;
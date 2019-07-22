var multer = require('multer');
const address = `http://127.0.0.1:5901`;
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

function pytojs(url, res){
    // http://image.kyobobook.co.kr/images/book/xlarge/972/x9788954655972.jpg
    let { PythonShell } = require('python-shell')
    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // python 설치 경로
        pythonPath: './venv/bin/python3', // python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: './python_module', // 실행할 python 파일 경로
        args: ['-p', url, '-t','url']
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

module.exports = function (app) {
    app.get('/result', (req, res) => {
        res.send('왜일로 들왔누?')
    });
    app.post('/result', upload.single('my_file'), (req, res) => {
        var fileurl = `${address}/${req.file.path}`
        pytojs(fileurl,res)
    });
}


var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');


function templateform() {
    var template = `
    <!doctype html>
    <html>
    <body>
    <form action="http://localhost:3000/ocr" method="post"> 
    <p><input type="text" name="fileurl"></p>
    <p><input type="submit"></p>
    </form>
    </body>
    </html>
    `
    return template;
}
function templateform2(result) {
    var template = `
    <!doctype html>
    <html>
    <body>
    <p>${result}</p>
    </body>
    </html>
    `
    return template;
}


function pytojs(url,response) {

    // http://image.kyobobook.co.kr/images/book/xlarge/972/x9788954655972.jpg
    let { PythonShell } = require('python-shell')

    var options = {
        mode: 'text',
        // pythonPath: '/usr/local/bin/python3', // python 설치 경로
        pythonPath: './venv/bin/python3', // python 설치 경로
        pythonOptions: ['-u'],
        scriptPath: '', // 실행할 python 파일 경로
        args: [url,"url"]
    };

    PythonShell.run('node_book_predict.py', options, function (err, results) {
        if (err) throw err;
        // results is an array consisting of messages collected during execution
        var data =``;
        for(var i in results){
            data+="<p>"+results[i]+ "</p>";
        }
        response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        response.end(data);
    });

}


var app = http.createServer(function (request, response) {
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;

    if (pathname === '/') {
        var template = templateform();
        response.writeHead(200);
        response.end(template);
    } else if (pathname === '/result') {
        var body = '';
        request.on('data', function (data) {
            body += data
        });
        request.on('end', function (end) {
            var post = qs.parse(body);
            var template = templateform2(post.fileurl);
            response.writeHead(200);
            response.end(template);
        });
    } else if (pathname === '/ocr') {
        var body = '';
        request.on('data', function (data) {
            body += data
        });
        request.on('end', function (end) {
            var post = qs.parse(body);
            results = pytojs(post.fileurl,response);
        });
    }
});
app.listen(3000);
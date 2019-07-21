var multer = require('multer');
const address = `http://127.0.0.1:5900`;
const ouheraddress = `http://127.0.0.1:5901`;
var fs = require('fs');
var postrequest = require('request')
var upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename(req, file, cb) {
            cb(null, file.originalname);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = function (app) {
    app.get('/', (req, res) => {
        res.render('fileinput.html');
    });
    app.get('/result', (req, res) => {
        res.send('success!')
    });
    app.post('/result', upload.single('book_image'), (req, res) => {
        var imagepath = `./${req.file.path}`

        const form = {
            // Pass a simple key-value pair
            my_field: 'book_image',
            // Pass data via Streams
            my_file: fs.createReadStream(imagepath),
          };
        postrequest.post({ url: `${ouheraddress}/result`, formData: form },
         function optionalCallback(err, httpResponse, body) {
            if (err) {
                return console.error('upload failed:', err);
            }
            console.log('Upload successful!  Server responded with:', body);
            res.send(body)
        });

    });
    app.post('/respone', upload.single('my_file'), (req, res) => {
        console.log(req.file)
        var result = {};
        result['content'] = '성재형 화이팅!'
        result['success'] = 1;
        res.json(result);
        return;
    })
}
import 'package:flutter/material.dart';
import 'package:booktail/BookinfoScreen.dart';
import 'package:booktail/Books.dart';
import 'package:http/http.dart' as http;
import 'package:async/async.dart';
import 'dart:convert';
import 'dart:io';

class PreviewScreen extends StatefulWidget {

  String imagePath;

  PreviewScreen(this.imagePath);

  @override
  State<StatefulWidget> createState() {
    return _PreviewPageState();
  }
}

class _PreviewPageState extends State<PreviewScreen> {

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Preview Page')),
      body: Column(
        children: <Widget>[
          Center(
            child: Image.file(File(widget.imagePath), height: 400.0),
          ),
          Expanded(
              child: Container(
            child: Align(
                alignment: FractionalOffset.bottomCenter,
                child: RaisedButton(
                  onPressed: () => {upload(File(widget.imagePath))},
                  child: Text('올리기'),
                  padding: EdgeInsets.all(0.0),
                )),
            margin: EdgeInsets.all(30.0),
          ))
        ],
      ),
    );
  }

  upload(File imageFile) async {
    // open a bytestream
    var stream = new http.ByteStream(DelegatingStream.typed(imageFile.openRead()));
    // get file length
    var length = await imageFile.length();

    // string to uri
    var uri = Uri.parse("http://13.209.218.193:5900/test");

    // create multipart request
    var request = new http.MultipartRequest("POST", uri);

    // multipart that takes file
    var multipartFile = new http.MultipartFile('image_file', stream, length,
        filename: imageFile.path.split('/').last);

    // add file to multipart
    request.files.add(multipartFile);
    request.fields['user_id'] = 'testfox';

    print(imageFile.path.split('/').last);

    // send
    var response = await request.send();
    print(response.statusCode);

    // listen for response
    response.stream.transform(utf8.decoder).listen((value) {
      print(value);
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => BookinfoScreen(Books.fromJson(json.decode(value)))));
    });


  }
}

class Result {
  String isbn;
  String fileName;

  Result({this.isbn, this.fileName});

  Result.fromJson(Map<String, dynamic> json) {
    isbn = json['isbn'];
    fileName = json['file_name'];
  }
}

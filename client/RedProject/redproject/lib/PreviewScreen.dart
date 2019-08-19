import 'package:flutter/material.dart';
import 'package:redproject/BookinfoScreen.dart';
import 'package:redproject/Books.dart';
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

  bool boolVisibility = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('미리 보기')),
      body:
      Stack(
        children: <Widget>[
          Column(
            children: <Widget>[
              Center(
                child: Image.file(File(widget.imagePath), width: MediaQuery.of(context).size.width),
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
          Visibility(
            child: Container(
              color: Color.fromRGBO(0, 0, 0, 0.8),
              width: MediaQuery.of(context).size.width,
              height: MediaQuery.of(context).size.height,
              child: Center(
                child: Text('등록중...', style: TextStyle(color: Colors.white)),
              ),
            ),
            visible: boolVisibility,
          ),
        ],
      ),
    );
  }

  upload(File imageFile) async {
    // open a bytestream
    var stream = new http.ByteStream(DelegatingStream.typed(imageFile.openRead()));
    // get file length

    setState(() {
      boolVisibility = true;
    });
    var length = await imageFile.length();

    // string to uri
    var uri = Uri.parse("http://54.180.49.131:5900/result");

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
      Map<String, dynamic> map = json.decode(value);

      bool errorCode = map['is_error'];

      if(errorCode != null && !errorCode) {
        Navigator.pushReplacement(context, MaterialPageRoute(
            builder: (context) =>
                BookinfoScreen(Books.fromJson(map))));
      } else {
        showDialog(
            context: context,
            builder: (BuildContext context) {
              // return object of type Dialog
              return AlertDialog(
                title: new Text("오류"),
                content: new Text("인식에 실패했습니다. 다시 촬영해주세요."),
                actions: <Widget>[
                  // usually buttons at the bottom of the dialog
                  new FlatButton(
                    child: new Text("확인"),
                    onPressed: () {
                      Navigator.of(context).pop();
                    },
                  ),
                ],
              );
            }
        );
      }
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

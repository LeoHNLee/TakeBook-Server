import 'package:flutter/material.dart';
import 'package:booktail/Constant.dart';
import 'package:booktail/PreviewScreen.dart';
import 'package:booktail/PushingScreen.dart';
import 'package:simple_permissions/simple_permissions.dart';

class HomeScreen extends StatelessWidget {
  HomeScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Stack(
      children: <Widget>[new MyHomePage()],
    ));
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key key, this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  bool _allowWriteFile = false;

  @override
  Widget build(BuildContext context) {
    List<String> list = [
      'assets/book1.jpg',
      'assets/book2.jpg',
      'assets/book3.jpg',
      'assets/book4.jpg',
      'assets/book5.jpg',
      'assets/book1.jpg',
      'assets/book2.jpg',
      'assets/book3.jpg',
      'assets/book4.jpg',
      'assets/book5.jpg',
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text("REaD"),
        elevation: 0.0,
      ),
      body: Stack(
        children: <Widget>[
          Column(
              children: <Widget>[
                Container(
                  color: Colors.black12,
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: list.length,
                    itemBuilder: (BuildContext context, int index) => Container(
                      padding: EdgeInsets.all(4),
                      child: Image.asset(list[index], height: 100),
                  )),
                ),
                RaisedButton(
                  child: Text('등록 중인 책'),
                  onPressed: () => {
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (context) => PushingScreen()))
                  },
                )
              ]),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.pushNamed(context, CAMERA_SCREEN);
          //Navigator.push(context,  MaterialPageRoute(builder: (context) => PreviewScreen()));
        },
        tooltip: 'Camera',
        child: Icon(Icons.camera),
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    requestWritePermission();
  }

  requestWritePermission() async {
    PermissionStatus permissionStatus =
        await SimplePermissions.requestPermission(
            Permission.WriteExternalStorage);

    if (permissionStatus == PermissionStatus.authorized) {
      setState(() {
        _allowWriteFile = true;
      });
    }
  }
}

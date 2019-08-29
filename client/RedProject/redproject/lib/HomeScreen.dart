import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:redproject/Constant.dart';
import 'package:redproject/PreviewScreen.dart';
import 'package:redproject/PushingScreen.dart';
import 'package:redproject/lab/ExpandedListView.dart';
import 'package:simple_permissions/simple_permissions.dart';

class HomeScreen extends StatelessWidget {
  HomeScreen();

  @override
  Widget build(BuildContext context) {
    return MyHomePage();
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

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text('title'),
          bottom: TabBar(
            tabs: <Widget>[
              Tab(text: 'tab1'),
              Tab(text: 'tan2')
            ],
          ),
        ),
        body: TabBarView(
          children: <Widget>[
            CustomScrollView(
              slivers: <Widget>[
                FirstPage(),
              ],
            ),
            Column(
              children: <Widget>[
                RaisedButton(
                  child: Text('Start Camera'),
                  onPressed: () => {
                    _startCamera()
                  },
                ),
                Container(
                  decoration: BoxDecoration(
                    image: DecorationImage(
                      image: AssetImage('assets/ui_sample.png'),
                      fit: BoxFit.fill,
                      centerSlice: Rect.fromLTWH(25, 25, 50, 50)
                    )
                  ),
                  child: Container(
                    width: 110,
                    height: 320,
                  )
                ),
              ],
            )
          ],
        ),
      ),
    );

    /*
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
                ),
                Visibility(child:
                  RaisedButton(
                    child: Text('실험실'),
                    onPressed: () => {
                      _startCamera()
                    },
                  ),
                  visible: true,
                )
              ]),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          //_startCamera();
          Navigator.pushNamed(context, CAMERA_SCREEN);
          //Navigator.push(context,  MaterialPageRoute(builder: (context) => PreviewScreen()));
        },
        tooltip: 'Camera',
        child: Icon(Icons.camera),
      ),
    );
    */
  }

  // 카메라 여는 부분
  void _startCamera() async {
    const String _channel = 'CameraActivity';
    const platform = const MethodChannel(_channel);

    try {
      var st = await platform.invokeMethod('startCameraActivity');
      print(st);
    } on PlatformException catch (e) {
      print(e.message);
    }
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

class FirstPage extends StatelessWidget{

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

  @override
  Widget build(BuildContext context) {

    return SliverGrid(
      gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 150,
        childAspectRatio: 3 / 5,
      ),
      delegate: SliverChildBuilderDelegate(
            (BuildContext context, int index) {
          return Container(
            alignment: Alignment.center,
            child: Column(
              children: <Widget>[
                Image.asset(list[index % 5], fit: BoxFit.fitHeight, height: 150,),
                Text(list[index % 5])
              ],
            ),
          );
        },
        childCount: 20,
      ),
    );
  }
}
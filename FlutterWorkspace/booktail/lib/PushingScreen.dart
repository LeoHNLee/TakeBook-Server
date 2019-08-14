import 'package:flutter/material.dart';
import 'package:booktail/Books.dart';

class PushingScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return PushingPage();
  }
}

class PushingPage extends StatefulWidget {
  @override
  _PushingPageState createState() => _PushingPageState();
}

class _PushingPageState extends State<PushingPage> {
  @override
  Widget build(BuildContext context) {
    List<Books> list = List();

    return Scaffold(
      appBar: AppBar(title: Text('push push')),
      body: ListView.builder(
          itemCount: list.length,
          itemBuilder: (BuildContext context, int index) => Container(
              width: MediaQuery.of(context).size.width,
              padding: EdgeInsets.all(8.0),
              child: Container(
                height: 80,
                child: Row(
                  children: <Widget>[
                    Container(
                      margin: EdgeInsets.all(8),
                      child: Image.asset(list[index].image_url),
                    ),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Text(list[index].title),
                      ],
                    ),
                  ],
                ),
              ))),
      drawer: Drawer(
        // Add a ListView to the drawer. This ensures the user can scroll
        // through the options in the drawer if there isn't enough vertical
        // space to fit everything.
        child: ListView(
          // Important: Remove any padding from the ListView.
          padding: EdgeInsets.zero,
          children: <Widget>[
            DrawerHeader(
              child: Text('Drawer Header'),
              decoration: BoxDecoration(
                color: Colors.blue,
              ),
            ),
            ListTile(
              title: Text('Item 1'),
              onTap: () {
                // Update the state of the app.
                // ...
              },
            ),
            ListTile(
              title: Text('Item 2'),
              onTap: () {
                // Update the state of the app.
                // ...
              },
            ),
          ],
        ),
      ),
    );
  }
}

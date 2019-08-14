import 'package:flutter/material.dart';

class GalleryScreen extends StatefulWidget {
  @override
  _State createState() => _State();
}

class _State extends State<GalleryScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Gallery'),
      )
    );
  }
}

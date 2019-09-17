import 'package:camera/camera.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:redproject/Constant.dart';
import 'package:redproject/CameraHomeScreen.dart';
import 'package:redproject/HomeScreen.dart';
import 'package:redproject/SplashScreen.dart';
import 'package:redproject/LoginScreen.dart';

List<CameraDescription> cameras;

Future<Null> main() async {
  try {
    cameras = await availableCameras();
  } on CameraException catch (e) {
    //logError(e.code, e.description);
  }

  runApp(
    MaterialApp(
      title: "책을찍다",
      debugShowCheckedModeBanner: false,
      theme: new ThemeData(
        primarySwatch: Colors.purple,
        primaryColor: Color(PRIMARY_COLOR),
        accentColor: Color(ACCENT_COLOR),
        canvasColor: Color(CANVAS_COLOR),
      ),
      home: SplashScreen(),
      routes: <String, WidgetBuilder>{
        HOME_SCREEN: (BuildContext context) => LoginScreen(),
        CAMERA_SCREEN: (BuildContext context) => CameraHomeScreen(cameras),
      },
    ),
  );
}

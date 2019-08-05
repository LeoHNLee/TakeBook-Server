import 'package:camera/camera.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:booktail/Constant.dart';
import 'package:booktail/CameraHomeScreen.dart';
import 'package:booktail/HomeScreen.dart';
import 'package:booktail/SplashScreen.dart';
import 'package:booktail/PreviewScreen.dart';

List<CameraDescription> cameras;

Future<Null> main() async {
  try {
    cameras = await availableCameras();
  } on CameraException catch (e) {
    //logError(e.code, e.description);
  }

  runApp(
    MaterialApp(
      title: "Camera App",
      debugShowCheckedModeBanner: false,
      theme: new ThemeData(
        primarySwatch: Colors.purple,
        primaryColor: const Color(0xFF7F0506),
        accentColor: const Color(0xFF2D3433),
        canvasColor: const Color(0xFFffefd6),
      ),
      home: SplashScreen(),
      routes: <String, WidgetBuilder>{
        HOME_SCREEN: (BuildContext context) => HomeScreen(),
        CAMERA_SCREEN: (BuildContext context) => CameraHomeScreen(cameras),
      },
    ),
  );
}

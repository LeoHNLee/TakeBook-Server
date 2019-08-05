import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/material.dart';
import 'package:booktail/PreviewScreen.dart';

class CameraHomeScreen extends StatefulWidget {
  List<CameraDescription> cameras;

  CameraHomeScreen(this.cameras);

  @override
  State<StatefulWidget> createState() {
    return _CameraHomeScreenState();
  }
}

class _CameraHomeScreenState extends State<CameraHomeScreen> {
  String imagePath;
  bool _toggleCamera = false;
  CameraController controller;

  @override
  void initState() {
    try {
      onCameraSelected(widget.cameras[0]);
    } catch (e) {
      print(e.toString());
    }
    super.initState();
  }

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.cameras.isEmpty) {
      return Container(
        alignment: Alignment.center,
        padding: EdgeInsets.all(16.0),
        child: Text(
          'No Camera Found',
          style: TextStyle(
            fontSize: 16.0,
            color: Colors.white,
          ),
        ),
      );
    }

    if (!controller.value.isInitialized) {

      return Container();
    }

    return AspectRatio(
      aspectRatio: controller.value.aspectRatio,
      child: Container(
        child: Stack(
          children: <Widget>[
            Container(
              child: CameraPreview(controller),
              padding: EdgeInsets.fromLTRB(0, 0, 0, 120.0),
            ),
            Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                width: double.infinity,
                height: 120.0,
                padding: EdgeInsets.all(20.0),
                color: Color.fromRGBO(00, 00, 00, 0.7),
                child: Stack(
                  children: <Widget>[
                    Align(
                      alignment: Alignment.center,
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.all(Radius.circular(50.0)),
                          onTap: () {
                            _captureImage();
                          },
                          child: Container(
                            padding: EdgeInsets.all(4.0),
                            child: Image.asset(
                              'assets/ic_shutter_1.png',
                              width: 72.0,
                              height: 72.0,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.all(Radius.circular(50.0)),
                          onTap: () {
                            if (!_toggleCamera) {
                              onCameraSelected(widget.cameras[1]);
                              setState(() {
                                _toggleCamera = true;
                              });
                            } else {
                              onCameraSelected(widget.cameras[0]);
                              setState(() {
                                _toggleCamera = false;
                              });
                            }
                          },
                          child: Container(
                            padding: EdgeInsets.all(4.0),
                            child: Image.asset(
                              'assets/ic_switch_camera_3.png',
                              color: Colors.grey[200],
                              width: 42.0,
                              height: 42.0,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.all(Radius.circular(50.0)),
                          onTap: getImage,
                          child: Container(
                            padding: EdgeInsets.all(4.0),
                            child: Image.asset(
                              'assets/ic_switch_camera_3.png',
                              color: Colors.grey[200],
                              width: 42.0,
                              height: 42.0,
                            ),
                          ),
                        ),
                      ),
                    )
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void onCameraSelected(CameraDescription cameraDescription) async {
    if (controller != null) await controller.dispose();
    controller = CameraController(cameraDescription, ResolutionPreset.medium);

    controller.addListener(() {
      if (mounted) setState(() {});
      if (controller.value.hasError) {
        showMessage('Camera Error: ${controller.value.errorDescription}');
      }
    });

    try {
      await controller.initialize();
    } on CameraException catch (e) {
      print('CameraException');
      showException(e);
    }

    if (mounted) setState(() {});
  }

  String timestamp() => new DateTime.now().millisecondsSinceEpoch.toString();

  void _captureImage() {
    takePicture().then((String filePath) {
      if (mounted) {
        setState(() {
          imagePath = filePath;
        });
        if (filePath != null) {
          showMessage('Picture saved to $filePath');
          setCameraResult();
        }
      }
    });
  }

  void setCameraResult() {
    Navigator.pushReplacement(context,
        MaterialPageRoute(builder: (context) => PreviewScreen(imagePath)));
  }

  Future<String> takePicture() async {
    if (!controller.value.isInitialized) {
      showMessage('Error: select a camera first.');
      return null;
    }
    final Directory extDir = await getApplicationDocumentsDirectory();
    final String dirPath = '${extDir.path}/FlutterDevs/Camera/Images';
    await new Directory(dirPath).create(recursive: true);
    final String filePath = '$dirPath/${timestamp()}.jpg';

    if (controller.value.isTakingPicture) {
      // A capture is already pending, do nothing.
      return null;
    }

    try {
      await controller.takePicture(filePath);
    } on CameraException catch (e) {
      showException(e);
      return null;
    }
    return filePath;
  }

  Future getImage() async {
    var image = await ImagePicker.pickImage(source: ImageSource.gallery);

    imagePath = image.path;
    setCameraResult();
  }

  void showException(CameraException e) {
    logError(e.code, e.description);
    showMessage('Error: ${e.code} ${e.description}');
  }

  void showMessage(String message) {
    print(message);
  }

  void logError(String code, String message) =>
      print('Error: $code Message: $message');
}

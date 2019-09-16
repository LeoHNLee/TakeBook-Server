import 'package:flutter/material.dart';
import 'package:redproject/HomeScreen.dart';
import 'package:redproject/Components/GradientButton.dart';
import 'package:redproject/Constant.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
          alignment: Alignment.center,
          child: Container(
            width: 300,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: <Widget>[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Flexible(
                      child: TextField(
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                            borderSide: BorderSide(color: Colors.grey, width: 0.0)
                          )
                        ),
                      ),
                    )
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: <Widget>[
                    Flexible(
                      child: TextField(
                        decoration: InputDecoration(
                            border: OutlineInputBorder(
                                borderSide: BorderSide(color: Colors.grey, width: 0.0)
                            )
                        ),
                      ),
                    )
                  ],
                ),
                GradientButton(
                  child: Text('로그인'),
                  gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [Color(COLOR_PINK), Color(COLOR_YELLOW)]
                  ),
                  onPressed: () => {
                    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (BuildContext context) => HomeScreen()))
                  },
                )
              ],
            ),
          )),
    );
  }
}

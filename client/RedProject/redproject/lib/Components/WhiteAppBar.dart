import 'package:flutter/material.dart';

class WhiteAppBar extends StatelessWidget {

  final Widget leading;
  final Widget title;

  WhiteAppBar({
    this.leading,
    this.title
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 50,
      color: Colors.white,
    );
  }
}


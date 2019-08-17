import 'package:flutter/material.dart';
import 'package:redproject/Books.dart';
import 'package:redproject/Constant.dart';
import 'dart:ui';

class BookinfoScreen extends StatefulWidget {
  Books books;

  BookinfoScreen(this.books);

  @override
  _BookinfoScreenState createState() => _BookinfoScreenState();
}

class _BookinfoScreenState extends State<BookinfoScreen> {
  @override
  Widget build(BuildContext context) {
    Image img = Image.network(widget.books.image_url, fit: BoxFit.cover);

    TextStyle styleWhite = TextStyle(
      color: Colors.black,
      fontSize: 14,
    );

    TextStyle styleTitle = TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.bold,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.books.title),
      ),
      body: Stack(
        children: <Widget>[
          Stack(children: <Widget>[
            Container(
              width: MediaQuery.of(context).size.width,
              height: MediaQuery.of(context).size.height,
              child: img,
            ),
            Positioned(
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                child: Container(
                  color: Colors.black.withOpacity(0.6),
                ),
              ),
            ),
          ]),
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              verticalDirection: VerticalDirection.down,
              children: <Widget>[
                Stack(
                  children: <Widget>[
                    Container(
                      color: Color(CANVAS_COLOR),
                      padding: EdgeInsets.fromLTRB(12, 80, 12, 12),
                      margin: EdgeInsets.fromLTRB(0, 220, 0, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        verticalDirection: VerticalDirection.down,
                        children: <Widget>[
                          Container(
                            width: MediaQuery.of(context).size.width,
                            child: Column(
                              children: <Widget>[
                                Text(
                                  widget.books.title,
                                  style: TextStyle(
                                    color: Colors.black,
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold
                                  ),
                                ),
                                Text(
                                  widget.books.author,
                                  style: styleWhite,
                                ),
                                Text(
                                  '${widget.books.publisher}(${widget.books.published_date})',
                                  style: styleWhite,
                                ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.all(10),
                          ),
                          Text('목차', style: styleTitle),
                          Divider(),
                          Text(widget.books.contents),
                          Padding(
                            padding: EdgeInsets.all(10),
                          ),
                          Text('요약', style: styleTitle),
                          Divider(),
                          Text(widget.books.discriptions)
                        ],
                      ),
                    ),
                    Container(
                      margin: EdgeInsets.all(24),
                      alignment: Alignment.topCenter,
                      child: Container(
                        height: 250,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8.0),
                          child: img,
                        ),
                      ),
                    )
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

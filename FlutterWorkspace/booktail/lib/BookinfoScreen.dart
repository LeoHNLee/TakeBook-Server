import 'package:flutter/material.dart';
import 'package:booktail/Books.dart';
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
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.books.title),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: <Widget>[
            Stack(
              children: <Widget>[
                Container(
                  margin: EdgeInsets.all(24),
                  alignment: Alignment.topCenter,
                  child: Image.network(
                    widget.books.image_url,
                    height: 300,
                  ),
                ),
              ],
            ),
            Text(widget.books.isbn),
            Text(widget.books.title),
            Text(widget.books.published_date),
            Text(widget.books.author),
            Text(widget.books.translator),
            Text(widget.books.url_alladin),
            Text(widget.books.contents),
            Text(widget.books.discriptions),
            Text(widget.books.result)
          ],
        ),
      ),
    );
  }
}

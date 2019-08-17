class Books {
  String isbn;
  String title;
  String published_date;
  String author;
  String translator;
  String publisher;
  String url_alladin;
  String image_url;
  String contents;
  String discriptions;
  String result;

  Books(String title, String image_url) {
    this.title = title;
    this.image_url = image_url;
  }

  Books.fromJson(Map<String, dynamic> json) {
    this.isbn = json['isbn'];
    this.title = json['title'];
    this.published_date = json['published_date'];
    this.author = json['author'];
    this.translator = json['translator'];
    this.publisher = json['publisher'];
    this.url_alladin = json['url_alladin'];
    this.image_url = json['image_url'];
    this.contents = json['contents'];
    this.discriptions = json['discriptions'];
  }
}
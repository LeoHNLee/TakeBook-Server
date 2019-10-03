import requests
import os

from bs4 import BeautifulSoup

def print_book_info(book):
    for i in book:
        print(f'{i}: {book[i]}')

def check_item_count(published_date, cert_key, page_size=10, is_ebook="N", result_type="xml", page_no=1):
    # 출판 날짜에 해당하는 국립중앙도서관 책 권수를 구해주는 함수

    url = f"http://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key={cert_key}&ebook_yn={is_ebook}&result_style={result_type}&page_no={page_no}&page_size={page_size}&start_publish_date={published_date}&end_publish_date={published_date}"
    html_source = requests.get(url = url)
    bs_obj = BeautifulSoup(html_source.content, "xml")
    item_count = bs_obj.select_one("TOTAL_COUNT").text
    return int(item_count)

def get_library_book_info(published_date, page_no, cert_key, page_size=10, is_ebook="N", result_type="xml"):
    # 도서정보 긁어오기
    # isbn, title, author, publisher, publisher_date
    books =[]
    url = f"http://seoji.nl.go.kr/landingPage/SearchApi.do?cert_key={cert_key}&ebook_yn={is_ebook}&result_style={result_type}&page_no={page_no}&page_size={page_size}&start_publish_date={published_date}&end_publish_date={published_date}"
    html_source = requests.get(url = url)
    bs_obj = BeautifulSoup(html_source.content, "xml")
    docs = bs_obj.find_all("e")

    book = {}
    for doc in docs:
        isbn = doc.select_one('EA_ISBN').text
        if isbn == '':
            isbn = doc.select_one('SET_ISBN').text

        book['isbn'] = isbn
        book['title'] = doc.select_one("TITLE").text
        book['author'] = doc.select_one("AUTHOR").text
        book['publisher'] = doc.select_one("PUBLISHER").text
        book['published_date'] = doc.select_one("PUBLISH_PREDATE").text

        books.append(book)
        book = {}

    return books

def get_aladin_book_info(isbn_no, ttbkey, output = "xml"):
    # isbn을 통하여 알라딘에 api를 검색하여 정보를 추출
    
    url = f"http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?ttbkey={ttbkey}&itemIdType=ISBN13&ItemId={isbn_no}&output={output}"
    html_source = requests.get(url = url)
    bs_obj = BeautifulSoup(html_source.content, "xml")

    errorcode = bs_obj.select_one("errorCode")
    if errorcode is not None:
        errorcode = errorcode.text
        if errorcode == '8':
            return None
        # elif errorcode == '10':
        #     return "daily_limt"

    
    # 해당 아이템 링크
    link = bs_obj.find_all("link")
    item_link = link[1].text

    author = bs_obj.select_one("author").text
    if author == '':
        author = None

    # # 옮긴이 가져오기
    # authors = bs_obj.select_one("authors")
    # if authors is None:
    #     translator = ""
    # else:
    #     authors = authors.find_all('author')

    #     translator = ""
    #     # authorType    author: 지은이, illustrator: 그림, storywriter: 글, authorphoto: 사진
    #     #               editor: 편집부, translator: 옮긴이
    #     for data in authors:
    #         if data['authorType'] == 'translator':
    #             translator = data.text

    # 카테고리
    category_name = bs_obj.select_one("categoryName").text

    price = bs_obj.select_one("priceStandard").text
    

    # 목차
    discriptions = bs_obj.select_one("fulldescription2")

    if discriptions is None:
        discriptions = ""
    else:
        discriptions = discriptions.text    
        discriptions = processing_text(str(discriptions))


    # 목차
    toc = bs_obj.select_one("toc")
    if toc is None:
        toc = ""
    else:
        toc = toc.text    
        toc = processing_text(str(toc))

    get_html_source = requests.get(url = item_link)
    # BeautifulSoup Object: html parsing
    bs_obj = BeautifulSoup(get_html_source.content, "html.parser")

    image_url = bs_obj.find("img",{"id":"CoverMainImage"})
    if image_url is None:
        return None
    else:
        image_url = image_url['src']
        

    book={}
    book["alladin_url"] = item_link                     
    book["author"] = author
    # book["translator"] = translator         
    # book["category_id"] = category_id
    book["category"] = category_name
    book["contents"] = toc
    book["discriptions"] = discriptions
    book["image_url"] = image_url
    book["price"] = price

    return book

def get_kyobo_book_info(isbn_no):

    book = {}
    # 교보문고에서 책 본문 가져오기
    url = f"http://www.kyobobook.co.kr/product/detailViewKor.laf?barcode={isbn_no}"

    result = requests.get(url=url)
    bs_obj = BeautifulSoup(result.content, "html.parser")
    empty_check = bs_obj.find("body")

    if not empty_check:
        book["kyobo_url"] = None
        book["contents"] = None
        return book
    else:
        book["kyobo_url"] = url

    # 도서 내용을 가지고 있는 container
    content_middle = bs_obj.findAll("div", {"class": "content_middle"})

    # 책 소개부분 주석을 통해 잘라내기

    try:
        book_content_intro = content_middle[3]
        book_intro = str(book_content_intro)
        book_intro_start = book_intro.find("<!-- *** s:책소개 *** -->")
        book_intro_end = book_intro.find("<!-- *** //e:책소개 *** -->")
        book_intro = book_intro[book_intro_start+len("<!-- *** s:책소개 *** -->") :book_intro_end]

        # 필요없는 부분 잘라내기
        bs_obj = BeautifulSoup(book_intro, "html.parser")
        book_content = bs_obj.find("div", {"class": "box_detail_article"})
        book_content = str(book_content.text).strip()

        book["contents"] = book_content
    except IndexError:
        book["contents"] = None
    except Exception:
        book["contents"] = None

    return book

def processing_text(text, trash_text=('<BR>','<B>', '</B>', '<p>', '</p>', '&lt;', '&gt;', '<br />', '<b>','</b>')):
    # 텍스트에 불필요한 부분을 삭제
    # 
    # @param text 가공이 필요한 텍스트
    # @return text 가공된 텍스트
    for trash in trash_text:
        if trash_text == '<BR>':
            text = text.replace(trash,'\n')    
        else:
            text = text.replace(trash,'')
    text = text.strip()
    return text

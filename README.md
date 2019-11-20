# 제 10기 SW마에스트로 새빨간팀

## 구성원

- 이형남(팀장), 김성재, 배상현
- 멘토: 최광선, 정경민, 최정현, 조항준

## 프로젝트 구성

### log collector

- log collector
  - redis에 저장된 로그기록을 파일로 저장하여 s3로 저장하는 서버

### server

- account server
  - 사용자 관련 정보를 관리하는 api서버

- analysis server
  - python mudule를 사용해 책이미지의 특성을 분석하고 검색해주는 api서버

  - python_module
    - /models: 학습된 딥러닝 모델들 저장소
    - im_book.py: 영상 처리, 다특성 추출 등에 관련한 분석 서비스, 트레이닝 서비스에 이용되는 모듈들 선언
    - node_book_predict.py: node.js로 구현되어 있는 서버에서 실행하는 예측 기능

- book server
  - 책정보를 관리하고 요청받는 api서버

- elasticsearch server
  - 책정보 검색을 관리하고 요청받는 api서버

- internal server
  - 각 서버를 열결시켜주는 server discovery api서버

### crawler

- crawler
  - 도서정보를 크롤링 해오는 프로그램
  - 국립중앙도서관, 알라딘, 교보문고를 통해서 데이터를 수집.

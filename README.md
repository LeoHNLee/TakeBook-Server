# 제 10기 SW마에스트로 새빨간팀

## 구성원

- 이형남(팀장), 김성재, 배상현
- 멘토: 최광선, 정경민, 최정현, 조항준

## 프로젝트 구성

### server

#### api_server

- 사용자로부터 직접 request를 받는 api서버
- es_server, analysis_server 와 요청을 주고받는다.

#### analysis_server

- python_module를 실행시키고 결과값을 보내주는 서버

##### python_module

- /models: 학습된 딥러닝 모델들 저장소
- im_book.py: 영상 처리, 다특성 추출 등에 관련한 분석 서비스, 트레이닝 서비스에 이용되는 모듈들 선언
- node_book_predict.py: node.js로 구현되어 있는 서버에서 실행하는 예측 기능

#### es_server

- elasticsearch에 데이터를 저장하고 쿼리를 보내는 서버

### crawler

- 클라이언트 프로젝트
- Flutter 프로젝트이기 때문에 Android Studio에 Flutter 설치 필요

### crawler

- 도서정보를 크롤링 해오는 프로그램
- 국립중앙도서관, 알라딘, 교보문고를 통해서 데이터를 수집.

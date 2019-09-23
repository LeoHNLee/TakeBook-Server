let message = {
    set_result_message = function (response_body, result_code, message) {
        response_body.Result_Code = result_code;
        if (message) {
            response_body.Message = message;
        }
        else {
            switch (result_code) {
                case "RS000": {
                    //account 서버 오류.
                    response_body.Message = "Response Success";
                    break;
                }
                case "RS001": {
                    //account 서버 오류.
                    response_body.Message = "Bad Request";
                    break;
                }
                case ("EC001"): {
                    //필수 파라미터 누락
                    response_body.Message = "invalid parameter error";
                    break;
                }
                case ("EC002"): {
                    //권한 없는 토큰
                    response_body.Message = "Unauthorized token";
                    break;
                }
                case ("EC003"): {
                    //친구 권한 없음
                    response_body.Message = "Not Allowed Value";
                    break;
                }
                case ("EC004"): {
                    //필수 파라미터 누락
                    response_body.Message = "This Parms does not exist";
                    break;
                }
                case ("EC005"): {
                    //존재하지 않는 파라미터 정보
                    response_body.Message = "Not Exist Parameter Info";
                    break;
                }
                case "ES000": {
                    //account 서버 오류.
                    response_body.Message = "Account Server Error";
                    break;
                }
                case "ES001": {
                    //analysis 서버 오류.
                    response_body.Message = "Analysis Server Error";
                    break;
                }
                case "ES002": {
                    //Book 서버 오류.
                    response_body.Message = "Book Server Error";
                    break;
                }
                case "ES003": {
                    //elasticsearch 서버 오류.
                    response_body.Message = "Elasticsearch Server Error";
                    break;
                }
                case "ES004": {
                    //internal 서버 오류.
                    response_body.Message = "Internal Server Error";
                    break;
                }
                case "ES010": {
                    response_body.Message = "User DataBase Server Error";
                    break;
                }
                case "ES011": {
                    response_body.Message = "Book DataBase Server Error";
                    break;
                }
                case "ES012": {
                    response_body.Message = "Elastic Databsae Server Error";
                    break;
                }
                case "ES013": {
                    response_body.Message = "S3 Server Error";
                    break;
                }
                default:{
                    response_body.Message = "Undefined Error";
                    break;
                }
            }
        }
    }

}


module.exports = message;
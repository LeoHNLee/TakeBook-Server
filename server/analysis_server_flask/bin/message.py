

def set_result_message(response_body, result_code, message=None):
    response_body["Result_Code"] = result_code
    if message:
        response_body["Message"] = message
    else:
        if result_code == "RS000":
            response_body["Message"] = "Response Success"
        elif result_code == "EC001":
            response_body["Message"] = "invalid parameter error"
        elif result_code == "EC002":
            response_body["Message"] = "Unauthorized token"
        elif result_code == "EC003":
            response_body["Message"] = "Not Allowed Value"
        elif result_code == "EC004":
            response_body["Message"] = "This Parms does not exist"
        elif result_code == "EC005":
            response_body["Message"] = "Not Exist Parameter Info"
            
        elif result_code == "ES001":
            response_body["Message"] = "Analysis Server Error"
        elif result_code == "ES002":
            response_body["Message"] = "Book Server Error"
        elif result_code == "ES003":
            response_body["Message"] = "Elasticsearch Server Error"
        elif result_code == "ES004":
            response_body["Message"] = "Internal Server Error"
        elif result_code == "ES010":
            response_body["Message"] = "User DataBase Server Error"    
        elif result_code == "ES011":
            response_body["Message"] = "Book DataBase Server Error"
        elif result_code == "ES012":
            response_body["Message"] = "Elastic Databsae Server Error"
        elif result_code == "ES013":
            response_body["Message"] = "S3 Server Error"
        
        elif result_code == "EP000":
            response_body["Message"] = "Python Moudel Error"
        elif result_code == "EP001":
            response_body["Message"] = "Python Analysis Fail"
        else:
            response_body["Message"] = "Undefined Error"

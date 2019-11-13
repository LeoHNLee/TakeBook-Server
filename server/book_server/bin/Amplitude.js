const request = require('request');

var config = require('../config/amplitude.json');

class Amplitude {

    constructor() { }

    regist_log(user_id, event_type, type, result) {
        //요청 form
        let request_form = {
            method: 'POST',
            uri: config.host,
            body: {
                api_key: config.api_key
            },
            json: true
        }

        switch (event_type) {
            case "Start_App": {
                request_form.body.events = [
                    {
                        user_id: user_id,
                        event_type: event_type,
                        user_properties: {
                            Cohort: "Test User"
                        }
                    }
                ]
                break;
            }
            case "Request_API": {
                request_form.body.events = [
                    {
                        user_id: user_id,
                        event_type: event_type,
                        event_properties: {
                            type: type
                        },
                        user_properties: {
                            Cohort: "Test User"
                        }
                    }
                ]
                break;
            }
            case "Function": {
                request_form.body.events = [
                    {
                        user_id: user_id,
                        event_type: event_type,
                        event_properties: {
                            type: type,
                            result: result
                        },
                        user_properties: {
                            Cohort: "Test User"
                        }
                    }
                ]
                break;
            }
        }

        //결과 정보 요청
        request.post(request_form, (err, httpResponse, response) => {
            if (err) {
                console.log(err)
            }
        });
    }

}

module.exports = Amplitude;
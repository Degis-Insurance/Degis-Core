import requests, json

def lark_notification(sendMsg, alert=False):
    LARK_WEBHOOK_URL = "https://open.larksuite.com/open-apis/bot/v2/hook/d3d4277b-d7ec-46d0-9a6f-f9bfdc0158bf"
    if not alert:
        program = {
            "msg_type": "post",
            "content": {
                "post": {
                    "en_us": {
                        "title": "New update on auto deployment",
                        "content": [
                            [
                                {
                                    "tag": "text",
                                    "text": "Congratulations, all passed. "
                                },
                                {
                                    "tag": "a",
                                    "text": "Go check email for more details",
                                    "href": "https://accounts.google.com/"
                                }
                            ]
                        ]
                    }
                }
            }
        }
    else:
        program = {
            "msg_type": "text",
            "content": {"text": sendMsg}
        }
    headers = {'Content-Type': 'application/json'}
    res = requests.post(LARK_WEBHOOK_URL, data=json.dumps(program), headers=headers)
    if res and res.status_code == 200:
        return True
    else:
        return False

if __name__ == '__main__':
    result = lark_notification('This is a test message', True)
    print(result)
import sys
import json
import base64
from gmusicapi import Mobileclient

Result = {
        'data': None,
        'status': 'good',
        'statusDetails': ''
        }

LoginOptionsJson = sys.argv[1]

if sys.argv[2] == 'base64':
    LoginOptionsJson = base64.b64decode(LoginOptionsJson)

LoginOptions = json.loads(LoginOptionsJson)

if not LoginOptions:
    LoginOptions = {}

api = Mobileclient()

try:
    if LoginOptions and hasattr(LoginOptions,'deviceId'):
        deviceId = LoginOptions.deviceId
        api.oauth_login(deviceId)
        Result['statusDetails'] = 'Login successful.'
    else:
        deviceId = api.FROM_MAC_ADDRESS # anonymous login
        api.oauth_login(deviceId)
        Result['statusDetails'] = 'Anonymous login successful.'
except Exception as e:
    Result['status'] = 'bad'
    Result['statusDetails'] = repr(e)

print(json.dumps(Result))

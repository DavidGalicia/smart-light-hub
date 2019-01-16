import sys
import json
import base64
from gmusicapi import Mobileclient

Result = {
        'resource': None,
        'status': 'good',
        'statusDetails': ''
        }

GetAllSongsOptionsJson = sys.argv[1]

if sys.argv[2] == 'base64':
    GetAllSongsOptionsJson = base64.b64decode(GetAllSongsOptionsJson)

GetAllSongsOptions = json.loads(GetAllSongsOptionsJson)

if not GetAllSongsOptions:
    GetAllSongsOptions= {}

GetOptions = GetAllSongsOptions

api = Mobileclient()

try:
    if GetOptions and ('deviceId' in GetOptions):
        deviceId = GetOptions['deviceId']
        api.oauth_login(deviceId)
    else:
        deviceId = api.FROM_MAC_ADDRESS # anonymous login
        api.oauth_login(deviceId)
except Exception as e:
    Result['status'] = 'bad'
    Result['statusDetails'] = repr(e)
    print(json.dumps(Result))
    exit()

try:
    if ('songId' in GetOptions):
        devices = api.get_stream_url(GetOptions['songId'])
        Result['resource'] = devices
    else:
        Result['status'] = 'bad'
        Result['statusDetails'] = "The parameter 'songId' must be specified."
except BaseException as e:
    Result['status'] = 'bad'
    Result['statusDetails'] = repr(e)

api.logout()

print(json.dumps(Result))

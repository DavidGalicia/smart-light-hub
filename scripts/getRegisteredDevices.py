import sys
import json
import base64
from gmusicapi import Mobileclient

Result = {
        'resource': None,
        'status': 'good',
        'statusDetails': ''
        }

GetRegisteredDevicesOptionsJson = sys.argv[1]

if sys.argv[2] == 'base64':
    GetRegisteredDevicesOptionsJson = base64.b64decode(GetRegisteredDevicesOptionsJson)

GetRegisteredDevicesOptions = json.loads(GetRegisteredDevicesOptionsJson)

if not GetRegisteredDevicesOptions:
    GetRegisteredDevicesOptions = {}

GetOptions = GetRegisteredDevicesOptions

api = Mobileclient()

try:
    deviceId = api.FROM_MAC_ADDRESS # anonymous login
    api.oauth_login(deviceId)
except Exception as e:
    Result['status'] = 'bad'
    Result['statusDetails'] = repr(e)
    print(json.dumps(Result))
    exit()

try:
    devices = api.get_registered_devices()
    Result['resource'] = devices
except BaseException as e:
    Result['status'] = 'bad'
    Result['statusDetails'] = repr(e)

api.logout()

print(json.dumps(Result))

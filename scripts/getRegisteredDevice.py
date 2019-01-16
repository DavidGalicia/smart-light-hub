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

if 'id' not in GetOptions:
    Result['status'] = 'bad'
    Result['statusDetails'] = 'The id must be specified.'
    print(json.dumps(Result))
    exit()

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
    id = GetOptions['id']

    if "0x" not in id:
        id = "0x" + id

    devices = api.get_registered_devices()

    match = None

    for device in devices:
        if device['id'] == id:
            match = device

    if match is None:
        Result['resource'] = None
        Result['status'] = 'bad'
        Result['statusDetails'] = 'Device not found.'
    else:
        Result['resource'] = match
except BaseException as e:
    Result['status'] = 'bad'
    Result['statusDetails'] = repr(e)

api.logout()

print(json.dumps(Result))

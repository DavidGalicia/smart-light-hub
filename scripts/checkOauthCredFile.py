from gmusicapi import Mobileclient
import os.path
import json 

Result = {
    'resource': None,
    'status': 'good',
    'statusDetails': ''
}

api = Mobileclient()

if os.path.isfile(api.OAUTH_FILEPATH):
    Result['resource'] = True
    Result['statusDetails'] = 'The file exists.'
else:
    Result['resource'] = False
    Result['statusDetails'] = 'The file does not exist.'

print(json.dumps(Result))

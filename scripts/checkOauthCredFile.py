from gmusicapi import Musicmanager
import os.path
import json 

Result = {
    'resource': None,
    'status': 'good',
    'statusDetails': ''
}

mm = Musicmanager()

if os.path.isfile(mm.OAUTH_FILEPATH):
    Result['resource'] = True
    Result['statusDetails'] = 'The file exists.'
else:
    Result['resource'] = False
    Result['statusDetails'] = 'The file does not exist.'

print(json.dumps(Result))

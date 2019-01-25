from gmusicapi import Mobileclient
from gmusicapi.utils import utils
from oauth2client.client import OAuth2WebServerFlow
import oauth2client.file

import json
import base64
import os 
import sys
import logging

Result = {
    'resource': None,
    'status': 'good',
    'statusDetails': ''
}

PerformOauthOptions = {}

try:
    PerformOauthOptionsJson = sys.argv[1]

    if ((len(sys.argv) >= 2) and (sys.argv[2] == 'base64')):
        PerformOauthOptionsJson = base64.b64decode(PerformOauthOptionsJson)
        
    PerformOauthOptions = json.loads(PerformOauthOptionsJson)
except Exception:
    pass

logging.basicConfig(filename='debug.log',level=logging.WARNING)

api = Mobileclient()
oauthInfo = api._session_class.oauth
flow = OAuth2WebServerFlow(oauthInfo.client_id,
                           oauthInfo.client_secret,
                           oauthInfo.scope,
                           oauthInfo.redirect_uri)

if 'code' in PerformOauthOptions:
    try:
        credentials = flow.step2_exchange(PerformOauthOptions['code'])
    except Exception as e:
        Result['status'] = 'bad'
        Result['statusDetails'] = repr(e)
        print(json.dumps(Result))
        exit()

    storage_filepath = api.OAUTH_FILEPATH
    utils.make_sure_path_exists(os.path.dirname(api.OAUTH_FILEPATH), 0o700)
    storage = oauth2client.file.Storage(storage_filepath)
    storage.put(credentials)

    Result['status'] = 'good' 
    Result['statusDetails'] = 'The code has been processed.' 
else:
    authUri = flow.step1_get_authorize_url()
    Result['resource'] = authUri
    Result['status'] = 'good' 
    Result['statusDetails'] = 'Tell the user to copy and paste the url into a browser.' 

print(json.dumps(Result))

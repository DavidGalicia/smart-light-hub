import json
from gmusicapi import Mobileclient

Result = {
        'data': None,
        'status': 'good',
        'statusDetails': ''
        }

api = Mobileclient()
api.logout()

Result['statusDetails'] = 'Logout successful.'

print(json.dumps(Result))

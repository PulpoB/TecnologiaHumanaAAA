import json, urllib.request

base = 'http://localhost:3001'

for url in [
    f'{base}/api/profile?userId=u1',
    f'{base}/api/tasks?userId=u1',
    f'{base}/api/grades?userId=u1',
    f'{base}/api/grades?userId=u2',
]:
    print(f'\nURL: {url}')
    try:
        with urllib.request.urlopen(url) as resp:
            data = json.load(resp)
        print(json.dumps(data, indent=2, default=str)[:6000])
    except Exception as e:
        print('ERROR:', e)

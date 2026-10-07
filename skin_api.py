"""YouCam API adapter. API secrets only live on the Flask server."""
import os
import time
import requests

BASE = os.getenv('YOUCAM_API_BASE', 'https://yce-api-01.makeupar.com').rstrip('/')
ACTIONS = ['acne','dark_circle_v2','droopy_lower_eyelid','droopy_upper_eyelid','eye_bag','firmness','moisture','oiliness','pore','radiance','redness','age_spot','texture','wrinkle','skin_type','tear_trough']

class SkinAPIError(Exception):
    pass


def _json(response):
    try:
        data = response.json()
    except ValueError as exc:
        raise SkinAPIError(f'Unexpected API response (HTTP {response.status_code}).') from exc
    if not response.ok or data.get('status') not in (None, 200) or (isinstance(data.get('data'), dict) and data['data'].get('error')):
        msg = data.get('data', {}).get('error') or data.get('message') or f'HTTP {response.status_code}'
        raise SkinAPIError(f'YouCam API error: {msg}')
    return data.get('data', {})


def analyze(image, content_type):
    key = os.getenv('YOUCAM_API_KEY', '').strip()
    if not key or key == "PASTE_YOUR_NEW_KEY_HERE":
        raise SkinAPIError(
            "Add a new YouCam API key to .env, or try Demo mode."
        )
    auth = {'Authorization': f'Bearer {key}'}
    filename = 'face.jpg' if content_type == 'image/jpeg' else 'face.png'
    reg = requests.post(f'{BASE}/s2s/v2.0/file', headers=auth,
        json={'files':[{'file_name': filename, 'file_size':len(image),'content_type':content_type}]}, timeout=30)
    file_obj = _json(reg)['files'][0]
    upload = file_obj['requests'][0]
    method = upload.get('method','PUT').upper()
    if method != 'PUT':
        raise SkinAPIError('Unexpected upload method returned by YouCam.')
    url = upload['url']
    if not url.startswith('https://'):
        raise SkinAPIError('Unexpected insecure upload URL.')
    headers = upload.get('headers', {})
    uploaded = requests.put(url, data=image, headers=headers, timeout=60)
    uploaded.raise_for_status()
    payload = {'src_file_id':file_obj['file_id'],'dst_actions':ACTIONS,
               'miniserver_args':{'enable_mask_overlay':True},'format':'json','pf_camera_kit':False}
    task = _json(requests.post(f'{BASE}/s2s/v2.0/task/skin-analysis',headers=auth,json=payload,timeout=30))
    task_id = task['task_id']
    for _ in range(24):
        time.sleep(5)
        result = _json(requests.get(f'{BASE}/s2s/v2.0/task/skin-analysis/{task_id}',headers=auth,timeout=30))
        status = result.get('task_status')
        if status == 'success':
            return result
        if status in ('error','failed'):
            raise SkinAPIError(f'Analysis failed: {result.get("error", "unknown error")}')
    raise SkinAPIError('Analysis took too long. Try again later; API usage may have been charged.')


def normalize(result):
    output = result.get('results',{}).get('output',[])
    scores = []
    skin_type = 'Unknown'
    total = None
    age = None
    masks = []
    for item in output:
        kind = item.get('type')
        if kind == 'skin_type' and item.get('region') == 'whole':
            skin_type = item.get('skin_type','Unknown')
        elif kind == 'all':
            total = item.get('score')
        elif kind == 'skin_age':
            age = item.get('score')
        elif 'ui_score' in item:
            scores.append({'type':kind,'score':item['ui_score']})
            # URLs expire; return for immediate display only, never persist.
            if item.get('mask_urls'):
                masks.append({'type':kind,'url':item['mask_urls'][0]})
    return {'overall':total,'skin_age':age,'skin_type':skin_type,'scores':scores,'masks':masks}

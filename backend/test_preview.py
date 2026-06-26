import urllib.request
import urllib.error
import json

data = {
    "subject": "Test",
    "body_html": "<p>Test</p>",
    "employee_ids": [1]
}

req = urllib.request.Request(
    "http://localhost:8000/api/letters/history/preview/",
    data=json.dumps(data).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_TOKEN" # We don't have token...
    },
    method="POST"
)

try:
    with urllib.request.urlopen(req) as response:
        print(response.read())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())

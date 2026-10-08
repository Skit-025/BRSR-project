import base64
def append_b64(fname, b64_str):
    with open(fname, 'ab') as f:
        f.write(base64.b64decode(b64_str))

import sys, json, base64, cv2, numpy as np


def is_marked(roi):
    g = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, b = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return np.count_nonzero(b) / b.size >= 0.6


data = json.loads(sys.stdin.read())
img = cv2.imdecode(
    np.frombuffer(base64.b64decode(data["img"].split(",", 1)[1]), np.uint8),
    cv2.IMREAD_COLOR,
)
roi = img[data["y1"] : data["y2"] + 1, data["x1"] : data["x2"] + 1]
sys.stdout.write("true" if is_marked(roi) else "false")

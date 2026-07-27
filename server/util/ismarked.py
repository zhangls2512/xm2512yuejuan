import sys, json, base64, cv2, numpy as np

data = json.loads(sys.stdin.read())
img = cv2.imdecode(
    np.frombuffer(base64.b64decode(data["img"].split(",", 1)[1]), np.uint8),
    cv2.IMREAD_COLOR,
)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, bin_img = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
out = []
for q in data["questions"]:
    ans = []
    for i, (x1, y1, x2, y2) in enumerate(q["coords"]):
        roi = bin_img[y1:y2, x1:x2]
        if roi.size and cv2.countNonZero(roi) / roi.size >= 0.6:
            ans.append(i)
    out.append({"questionName": q["questionName"], "answer": ans})
sys.stdout.write(json.dumps(out))

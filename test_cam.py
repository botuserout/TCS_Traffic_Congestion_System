import cv2
import platform

print("System:", platform.system())

for i in range(3):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        print(f"Camera {i}: isOpened={cap.isOpened()}, read={ret}")
        cap.release()
    else:
        print(f"Camera {i}: isOpened=False")

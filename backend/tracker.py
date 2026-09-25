from ultralytics import YOLO

class VehicleTracker:
    def __init__(self, model_path='yolov8n.pt'):
        self.model = YOLO(model_path)

    def track(self, frame, tracker="bytetrack.yaml", persist=True, verbose=False, conf=0.15):
        """
        Wraps the YOLOv8 track method.
        Primary focus: COCO classes [2: car, 3: motorcycle, 5: bus, 7: truck].
        Fallback: All objects if no vehicles found (to facilitate indoor webcam testing).
        """
        # First attempt: detect vehicles
        results = self.model.track(
            frame, 
            tracker=tracker, 
            persist=persist, 
            verbose=verbose, 
            conf=conf, 
            classes=[2, 3, 5, 7]
        )
        
        # If no vehicles detected, fall back to general detection so webcam test shows results
        if results and len(results[0].boxes) == 0:
            results = self.model.track(
                frame, 
                tracker=tracker, 
                persist=persist, 
                verbose=verbose, 
                conf=conf
            )
            
        return results[0]

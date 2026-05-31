import { loadTensorflowModel } from 'react-native-fast-tflite';

// Input: raw camera frame (112x112 RGB)
// Output: bounding box [x, y, width, height] or null if no face found

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

class FaceDetectorService {
  private model: any = null;
  private isLoaded: boolean = false;

  // Load the model into memory once at app start
  async load(): Promise<void> {
    try {
      this.model = await loadTensorflowModel(
        require('../../android/app/src/main/assets/face_detection.tflite')
      );
      this.isLoaded = true;
      console.log('✅ Face detection model loaded');
    } catch (error) {
      console.error('❌ Failed to load face detection model:', error);
      throw error;
    }
  }

  // Detect face in a frame
  // Returns bounding box of the largest face found, or null
  async detect(imageData: Float32Array): Promise<FaceBoundingBox | null> {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model not loaded. Call load() first.');
    }

    try {
      const output = await this.model.run([imageData]);
      
      // MediaPipe face detector output:
      // output[0] = bounding boxes [num_faces, 4] (x, y, w, h normalized 0-1)
      // output[1] = confidence scores [num_faces]
      const boxes = output[0];
      const scores = output[1];

      if (!scores || scores.length === 0 || scores[0] < 0.7) {
        return null; // No face detected or low confidence
      }

      // Return the first (highest confidence) face
      return {
        x: boxes[0],
        y: boxes[1],
        width: boxes[2],
        height: boxes[3],
        confidence: scores[0],
      };
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  }

  isReady(): boolean {
    return this.isLoaded;
  }
}

export const FaceDetector = new FaceDetectorService();
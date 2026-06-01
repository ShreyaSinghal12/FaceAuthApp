// Face detection handled by camera framing for now
// Full ML detection added in next iteration

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

class FaceDetectorService {
  private isLoaded: boolean = false;

  async load(): Promise<void> {
    // Native face detection via Android CameraX in next step
    this.isLoaded = true;
    console.log('✅ Face detector ready');
  }

  isReady(): boolean { return this.isLoaded; }
}

export const FaceDetector = new FaceDetectorService();
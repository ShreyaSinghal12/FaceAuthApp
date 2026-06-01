import { FaceDetector } from './FaceDetector';
import { FaceRecognizer } from './FaceRecognizer';

export async function loadAllModels(): Promise<void> {
  console.log('Loading ML models...');
  await FaceDetector.load();
  await FaceRecognizer.load();
  console.log('✅ All models loaded');
}
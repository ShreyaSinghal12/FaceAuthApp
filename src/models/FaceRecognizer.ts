import { NativeModules } from 'react-native';

const { FaceRecognition } = NativeModules;

const SIMILARITY_THRESHOLD = 0.5;

export interface FaceEmbedding {
  userId: string;
  embedding: number[];
}

class FaceRecognizerService {
  private isLoaded: boolean = false;

  async load(): Promise<void> {
    try {
      await FaceRecognition.loadModel();
      this.isLoaded = true;
      console.log('✅ Face recognition model loaded via native bridge');
    } catch (error) {
      console.error('❌ Face recognition load failed:', error);
      throw error;
    }
  }

  async getEmbedding(base64Image: string): Promise<number[] | null> {
    if (!this.isLoaded) return null;
    try {
      const embedding = await FaceRecognition.getEmbedding(base64Image);
      return embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      return null;
    }
  }

  async findMatch(
    liveEmbedding: number[],
    stored: FaceEmbedding[]
  ): Promise<string | null> {
    let best: string | null = null;
    let bestScore = 0;

    for (const s of stored) {
      const score: number = await FaceRecognition.cosineSimilarity(
        liveEmbedding,
        s.embedding
      );
      if (score > bestScore) {
        bestScore = score;
        best = s.userId;
      }
    }
    return bestScore >= SIMILARITY_THRESHOLD ? best : null;
  }

  isReady(): boolean { return this.isLoaded; }
}

export const FaceRecognizer = new FaceRecognizerService();
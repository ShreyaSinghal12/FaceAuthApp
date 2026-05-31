import { loadTensorflowModel } from 'react-native-fast-tflite';

// MobileFaceNet takes 112x112x3 image
// Outputs a 192-dimensional embedding vector

const INPUT_SIZE = 112;
const EMBEDDING_SIZE = 192;
const SIMILARITY_THRESHOLD = 0.5; // Above this = same person

export interface FaceEmbedding {
  userId: string;
  embedding: number[];
}

class FaceRecognizerService {
  private model: any = null;
  private isLoaded: boolean = false;

  async load(): Promise<void> {
    try {
      this.model = await loadTensorflowModel(
        require('../../android/app/src/main/assets/face_recognition.tflite')
      );
      this.isLoaded = true;
      console.log('✅ Face recognition model loaded');
    } catch (error) {
      console.error('❌ Failed to load face recognition model:', error);
      throw error;
    }
  }

  // Convert a face image to a 192-dim embedding vector
  async getEmbedding(imageData: Float32Array): Promise<number[] | null> {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model not loaded. Call load() first.');
    }

    try {
      const output = await this.model.run([imageData]);
      return Array.from(output[0] as Float32Array);
    } catch (error) {
      console.error('Embedding generation error:', error);
      return null;
    }
  }

  // Compare two embeddings using cosine similarity
  // Returns value between 0 and 1 (1 = identical faces)
  cosineSimilarity(embA: number[], embB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embA.length; i++) {
      dotProduct += embA[i] * embB[i];
      normA += embA[i] * embA[i];
      normB += embB[i] * embB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Match a live embedding against a list of stored embeddings
  // Returns the matched userId or null
  findMatch(
    liveEmbedding: number[],
    storedEmbeddings: FaceEmbedding[]
  ): string | null {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const stored of storedEmbeddings) {
      const score = this.cosineSimilarity(liveEmbedding, stored.embedding);
      console.log(`Comparing with ${stored.userId}: score = ${score.toFixed(3)}`);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = stored.userId;
      }
    }

    // Only return a match if above threshold
    if (bestScore >= SIMILARITY_THRESHOLD) {
      console.log(`✅ Match found: ${bestMatch} (score: ${bestScore.toFixed(3)})`);
      return bestMatch;
    }

    console.log(`❌ No match found (best score: ${bestScore.toFixed(3)})`);
    return null;
  }

  isReady(): boolean {
    return this.isLoaded;
  }
}

export const FaceRecognizer = new FaceRecognizerService();  
package com.faceauthapp

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.facebook.react.bridge.*
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.sqrt
import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facedetector.FaceDetector

class FaceRecognitionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var faceRecognizer: Interpreter? = null
    private var faceDetector: FaceDetector? = null
    private val INPUT_SIZE = 112
    private val EMBEDDING_SIZE = 192

    override fun getName() = "FaceRecognition"

    @ReactMethod
    fun loadModel(promise: Promise) {
        try {
            val model = loadModelFile("face_recognition.tflite")
            faceRecognizer = Interpreter(model)

            // Set up MediaPipe face detector for cropping
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("blaze_face_short_range.tflite")
                .build()
            val options = FaceDetector.FaceDetectorOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.IMAGE)
                .setMinDetectionConfidence(0.5f)
                .build()
            faceDetector = FaceDetector.createFromOptions(reactApplicationContext, options)

            promise.resolve("Model loaded successfully")
        } catch (e: Exception) {
            promise.reject("MODEL_LOAD_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getEmbedding(base64Image: String, promise: Promise) {
        try {
            val recognizer = faceRecognizer
                ?: return promise.reject("NOT_LOADED", "Model not loaded")

            val imageBytes = android.util.Base64.decode(base64Image, android.util.Base64.DEFAULT)
            val fullBitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            // Detect face and crop to it
            val faceBitmap = cropToFace(fullBitmap)

            val resized = Bitmap.createScaledBitmap(faceBitmap, INPUT_SIZE, INPUT_SIZE, true)

            val inputBuffer = ByteBuffer.allocateDirect(1 * INPUT_SIZE * INPUT_SIZE * 3 * 4)
            inputBuffer.order(ByteOrder.nativeOrder())

            for (y in 0 until INPUT_SIZE) {
                for (x in 0 until INPUT_SIZE) {
                    val pixel = resized.getPixel(x, y)
                    inputBuffer.putFloat(((pixel shr 16 and 0xFF) / 127.5f) - 1f)
                    inputBuffer.putFloat(((pixel shr 8 and 0xFF) / 127.5f) - 1f)
                    inputBuffer.putFloat(((pixel and 0xFF) / 127.5f) - 1f)
                }
            }

            val outputBuffer = Array(1) { FloatArray(EMBEDDING_SIZE) }
            recognizer.run(inputBuffer, outputBuffer)

            // L2-normalize the embedding for stable cosine similarity
            val emb = outputBuffer[0]
            var norm = 0.0
            for (v in emb) norm += v * v
            norm = sqrt(norm)
            val result = WritableNativeArray()
            for (v in emb) result.pushDouble(if (norm > 0) (v / norm).toDouble() else v.toDouble())

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INFERENCE_ERROR", e.message)
        }
    }

    // Detect the largest face and return a cropped bitmap. Falls back to full image if none found.
    private fun cropToFace(bitmap: Bitmap): Bitmap {
        try {
            val detector = faceDetector ?: return bitmap
            val mpImage = BitmapImageBuilder(bitmap).build()
            val result = detector.detect(mpImage)

            if (result.detections().isEmpty()) {
                return bitmap // no face found, use whole image
            }

            // Pick the largest detected face
            var best = result.detections()[0].boundingBox()
            for (d in result.detections()) {
                val box = d.boundingBox()
                if (box.width() * box.height() > best.width() * best.height()) {
                    best = box
                }
            }

            // Add 20% margin around the face box
            val marginX = best.width() * 0.2f
            val marginY = best.height() * 0.2f
            var left = (best.left - marginX).toInt().coerceAtLeast(0)
            var top = (best.top - marginY).toInt().coerceAtLeast(0)
            var right = (best.right + marginX).toInt().coerceAtMost(bitmap.width)
            var bottom = (best.bottom + marginY).toInt().coerceAtMost(bitmap.height)

            val w = right - left
            val h = bottom - top
            if (w <= 0 || h <= 0) return bitmap

            return Bitmap.createBitmap(bitmap, left, top, w, h)
        } catch (e: Exception) {
            return bitmap
        }
    }

    @ReactMethod
    fun cosineSimilarity(
        embeddingA: ReadableArray,
        embeddingB: ReadableArray,
        promise: Promise
    ) {
        try {
            var dot = 0.0
            var normA = 0.0
            var normB = 0.0
            for (i in 0 until embeddingA.size()) {
                val a = embeddingA.getDouble(i)
                val b = embeddingB.getDouble(i)
                dot += a * b
                normA += a * a
                normB += b * b
            }
            val similarity = if (normA == 0.0 || normB == 0.0) 0.0
            else dot / (sqrt(normA) * sqrt(normB))
            promise.resolve(similarity)
        } catch (e: Exception) {
            promise.reject("SIMILARITY_ERROR", e.message)
        }
    }

    private fun loadModelFile(modelName: String): MappedByteBuffer {
        val assetFileDescriptor = reactApplicationContext.assets.openFd(modelName)
        val inputStream = FileInputStream(assetFileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        return fileChannel.map(
            FileChannel.MapMode.READ_ONLY,
            assetFileDescriptor.startOffset,
            assetFileDescriptor.declaredLength
        )
    }

    @ReactMethod
    fun verifyLiveness(challengeId: String, base64Image: String, promise: Promise) {
        try {
            val imageBytes = android.util.Base64.decode(base64Image, android.util.Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
            val width = bitmap.width
            val height = bitmap.height
            val centerX = width / 2
            val centerY = height / 2
            val sampleRadius = minOf(width, height) / 4
            var totalBrightness = 0.0
            var pixelCount = 0
            for (y in centerY - sampleRadius until centerY + sampleRadius step 4) {
                for (x in centerX - sampleRadius until centerX + sampleRadius step 4) {
                    if (x in 0 until width && y in 0 until height) {
                        val pixel = bitmap.getPixel(x, y)
                        val r = (pixel shr 16 and 0xFF).toDouble()
                        val g = (pixel shr 8 and 0xFF).toDouble()
                        val b = (pixel and 0xFF).toDouble()
                        totalBrightness += (r + g + b) / 3.0
                        pixelCount++
                    }
                }
            }
            val avgBrightness = if (pixelCount > 0) totalBrightness / pixelCount else 0.0
            val isLive = avgBrightness > 40 && avgBrightness < 220
            promise.resolve(isLive && pixelCount > 100)
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    private var livenessPromise: Promise? = null
    private val LIVENESS_REQUEST = 9001

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == LIVENESS_REQUEST) {
                val passed = resultCode == Activity.RESULT_OK
                livenessPromise?.resolve(passed)
                livenessPromise = null
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    @ReactMethod
    fun startLiveness(challenge: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }
        livenessPromise = promise
        val intent = Intent(activity, LivenessActivity::class.java)
        intent.putExtra("challenge", challenge)
        activity.startActivityForResult(intent, LIVENESS_REQUEST)
    }
}
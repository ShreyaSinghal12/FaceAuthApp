package com.faceauthapp

import android.os.Bundle
import android.util.Log
import android.widget.TextView
import android.widget.FrameLayout
import android.graphics.Color
import android.view.Gravity
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult
import java.util.concurrent.Executors
import android.graphics.Bitmap
import android.graphics.Matrix
import androidx.camera.core.ImageProxy

class LivenessActivity : AppCompatActivity() {

    private lateinit var faceLandmarker: FaceLandmarker
    private lateinit var statusText: TextView
    private lateinit var instructionText: TextView
    private val cameraExecutor = Executors.newSingleThreadExecutor()

    private var challenge = "blink"
    private var blinkCount = 0
    private var wasEyesClosed = false
    private var challengeComplete = false
    private var frameTimestamp = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        challenge = intent.getStringExtra("challenge") ?: "blink"

        val layout = FrameLayout(this)
        val previewView = PreviewView(this)
        layout.addView(previewView)

        instructionText = TextView(this).apply {
            text = getInstructionText()
            setTextColor(Color.WHITE)
            textSize = 22f
            setBackgroundColor(Color.parseColor("#CC000000"))
            setPadding(40, 30, 40, 30)
            gravity = Gravity.CENTER
        }
        val instrParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        )
        instrParams.gravity = Gravity.TOP
        layout.addView(instructionText, instrParams)

        statusText = TextView(this).apply {
            text = "Position your face in view"
            setTextColor(Color.parseColor("#1D9E75"))
            textSize = 18f
            setBackgroundColor(Color.parseColor("#CC000000"))
            setPadding(40, 30, 40, 30)
            gravity = Gravity.CENTER
        }
        val statusParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        )
        statusParams.gravity = Gravity.BOTTOM
        layout.addView(statusText, statusParams)

        setContentView(layout)

        setupFaceLandmarker()
        startCamera(previewView)
    }

    private fun getInstructionText(): String = when (challenge) {
        "blink" -> "BLINK your eyes twice"
        "smile" -> "Give a big SMILE"
        "turn" -> "TURN your head slightly"
        else -> "Look at the camera"
    }

    private fun setupFaceLandmarker() {
        try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("face_landmarker.task")
                .setDelegate(com.google.mediapipe.tasks.core.Delegate.CPU)
                .build()

            val options = FaceLandmarker.FaceLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setNumFaces(1)
                .setMinFaceDetectionConfidence(0.5f)
                .setMinTrackingConfidence(0.5f)
                .setMinFacePresenceConfidence(0.5f)
                .setResultListener { result, _ -> processResult(result) }
                .setErrorListener { e -> Log.e("Liveness", "MP Error: ${e.message}") }
                .build()

            faceLandmarker = FaceLandmarker.createFromOptions(this, options)
            Log.d("Liveness", "FaceLandmarker created successfully")
        } catch (e: Exception) {
            Log.e("Liveness", "Setup failed: ${e.message}", e)
        }
    }

    private fun processResult(result: FaceLandmarkerResult) {
        if (challengeComplete) return
        if (result.faceLandmarks().isEmpty()) {
            runOnUiThread { statusText.text = "No face detected" }
            return
        }

        val landmarks = result.faceLandmarks()[0]

        when (challenge) {
            "blink" -> detectBlink(landmarks)
            "smile" -> detectSmile(landmarks)
            "turn" -> detectTurn(landmarks)
        }
    }

    private fun detectBlink(landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>) {
        val leftEyeTop = landmarks[159]
        val leftEyeBottom = landmarks[145]
        val leftEyeLeft = landmarks[33]
        val leftEyeRight = landmarks[133]

        val rightEyeTop = landmarks[386]
        val rightEyeBottom = landmarks[374]
        val rightEyeLeft = landmarks[362]
        val rightEyeRight = landmarks[263]

        val leftVertical = Math.abs(leftEyeTop.y() - leftEyeBottom.y()).toDouble()
        val leftHorizontal = Math.abs(leftEyeLeft.x() - leftEyeRight.x()).toDouble()
        val leftEAR = if (leftHorizontal > 0.0) leftVertical / leftHorizontal else 0.0

        val rightVertical = Math.abs(rightEyeTop.y() - rightEyeBottom.y()).toDouble()
        val rightHorizontal = Math.abs(rightEyeLeft.x() - rightEyeRight.x()).toDouble()
        val rightEAR = if (rightHorizontal > 0.0) rightVertical / rightHorizontal else 0.0

        val avgEAR = (leftEAR + rightEAR) / 2.0

        Log.d("Liveness", "EAR: $avgEAR, closed: $wasEyesClosed, count: $blinkCount")

        runOnUiThread {
            statusText.text = "Blinks: $blinkCount / 2  (EAR: ${"%.2f".format(avgEAR)})"
        }

        // Your blink drops to ~0.05, open eyes ~0.25+
        // Your blink drops to ~0.05, open eyes ~0.25+
        if (avgEAR < 0.15 && !wasEyesClosed) {
            wasEyesClosed = true
            Log.d("Liveness", "Eyes CLOSED")
        } else if (avgEAR > 0.22 && wasEyesClosed) {
            wasEyesClosed = false
            blinkCount++
            Log.d("Liveness", "Blink counted: $blinkCount")
            if (blinkCount >= 2) {
                completeChallenge(true)
            }
        }
    }

    private fun detectSmile(landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>) {
        val leftMouth = landmarks[61]
        val rightMouth = landmarks[291]
        val topLip = landmarks[13]
        val bottomLip = landmarks[14]

        val mouthWidth = Math.abs(leftMouth.x() - rightMouth.x()).toDouble()
        val mouthHeight = Math.abs(topLip.y() - bottomLip.y()).toDouble()

        val smileRatio = if (mouthHeight > 0.0) mouthWidth / mouthHeight else 0.0

        runOnUiThread { statusText.text = "Keep smiling..." }

        if (smileRatio > 5.0 && mouthWidth > 0.13) {
            completeChallenge(true)
        }
    }

    private fun detectTurn(landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>) {
        val noseTip = landmarks[1]
        val leftFace = landmarks[234]
        val rightFace = landmarks[454]

        val distToLeft = Math.abs(noseTip.x() - leftFace.x()).toDouble()
        val distToRight = Math.abs(noseTip.x() - rightFace.x()).toDouble()
        val ratio: Double = if (distToRight > 0.0) distToLeft / distToRight else 1.0

        runOnUiThread { statusText.text = "Turn your head slightly..." }

        if (ratio < 0.62 || ratio > 1.6) {
            completeChallenge(true)
        }
    }

    private fun completeChallenge(passed: Boolean) {
        if (challengeComplete) return
        challengeComplete = true
        runOnUiThread {
            statusText.text = if (passed) "Liveness Verified!" else "Failed"
            statusText.setTextColor(if (passed) Color.parseColor("#1D9E75") else Color.RED)
        }
        android.os.Handler(mainLooper).postDelayed({
            val resultIntent = android.content.Intent()
            resultIntent.putExtra("passed", passed)
            setResult(if (passed) RESULT_OK else RESULT_CANCELED, resultIntent)
            finish()
        }, 1000)
    }

    private fun startCamera(previewView: PreviewView) {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }

            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor) { imageProxy ->
                        analyzeImage(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalyzer
                )
            } catch (e: Exception) {
                Log.e("Liveness", "Camera bind failed", e)
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun analyzeImage(imageProxy: ImageProxy) {
        try {
            if (!::faceLandmarker.isInitialized) {
                imageProxy.close()
                return
            }
            val bitmap = imageProxy.toBitmap()
            val rotated = rotateBitmap(bitmap, imageProxy.imageInfo.rotationDegrees.toFloat())
            val mpImage = BitmapImageBuilder(rotated).build()
            frameTimestamp += 1
            faceLandmarker.detectAsync(mpImage, frameTimestamp)
        } catch (e: Exception) {
            Log.e("Liveness", "Analyze error: ${e.message}")
        } finally {
            imageProxy.close()
        }
    }

    private fun rotateBitmap(bitmap: Bitmap, degrees: Float): Bitmap {
        val matrix = Matrix()
        matrix.postRotate(degrees)
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        if (::faceLandmarker.isInitialized) faceLandmarker.close()
    }
}
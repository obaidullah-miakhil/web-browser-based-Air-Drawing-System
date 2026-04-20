import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const video = document.getElementById('webcam');
const drawingCanvas = document.getElementById('drawing-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
const drawCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });
const overlayCtx = overlayCanvas.getContext('2d');

const loader = document.getElementById('loader');
const activeGestureEl = document.getElementById('active-gesture');
const colorPicker = document.getElementById('color-picker');
const lineWidthRange = document.getElementById('line-width');
const brushSizeVal = document.getElementById('brush-size-val');
const clearBtn = document.getElementById('clear-btn');

let handLandmarker;
let lastVideoTime = -1;
let isDrawingPath = false;
let isPanningState = false;
let panLastX = 0;
let panLastY = 0;

lineWidthRange.addEventListener('input', (e) => {
    brushSizeVal.innerText = e.target.value;
});

clearBtn.addEventListener('click', () => {
    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
});

function setupCanvases() {
    drawingCanvas.width = video.videoWidth;
    drawingCanvas.height = video.videoHeight;
    overlayCanvas.width = video.videoWidth;
    overlayCanvas.height = video.videoHeight;
    
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    overlayCtx.lineCap = 'round';
    overlayCtx.lineJoin = 'round';
}

video.onloadeddata = setupCanvases;

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 } 
            } 
        });
        video.srcObject = stream;
        
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        
        video.addEventListener('loadeddata', () => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
            predictWebcam();
        });

    } catch(err) {
        console.error("Camera error:", err);
        document.getElementById('loader-text').innerText = "Webcam access error. Please allow camera permissions.";
        const spinner = document.querySelector('.spinner');
        if (spinner) spinner.style.display = 'none';
    }
}

function getGesture(landmarks) {
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const indexPIP = landmarks[6];
    const middlePIP = landmarks[10];
    const ringPIP = landmarks[14];
    const pinkyPIP = landmarks[18];

    const thumbDistance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const pinchThreshold = 0.05; 

    // `y` goes from 0 (top) to 1 (bottom). "Extended" means tip is physically higher (smaller Y value) than the PIP joint.
    const isIndexExtended = indexTip.y < indexPIP.y;
    const isMiddleExtended = middleTip.y < middlePIP.y;
    const isRingExtended = ringTip.y < ringPIP.y;
    const isPinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    // 1. Pinch Move
    if (thumbDistance < pinchThreshold) {
        return "Move (Pinch)";
    }
    // 2. Erase (Open Palm)
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
        return "Erase (Open Palm)";
    }
    // 3. Draw (One Finger)
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return "Draw (One Finger)";
    }
    // 4. Pause (Fist)
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return "Pause (Fist)";
    }
    
    return "Unknown/Transitioning";
}

function panCanvas(dx, dy) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = drawingCanvas.width;
    tempCanvas.height = drawingCanvas.height;
    tempCanvas.getContext('2d').drawImage(drawingCanvas, 0, 0);
    
    drawCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawCtx.globalCompositeOperation = 'source-over';
    drawCtx.drawImage(tempCanvas, dx, dy);
}

function predictWebcam() {
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        let startTimeMs = performance.now();
        const results = handLandmarker.detectForVideo(video, startTimeMs);
        
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const gesture = getGesture(landmarks);
            
            activeGestureEl.innerText = gesture;

            // MediaPipe un-flipped coordinates -> mapped to visually mirrored canvas
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];
            
            const currentX = (1 - indexTip.x) * drawingCanvas.width;
            const currentY = indexTip.y * drawingCanvas.height;
            const thumbX = (1 - thumbTip.x) * drawingCanvas.width;
            const thumbY = thumbTip.y * drawingCanvas.height;

            if (gesture === "Move (Pinch)") {
                const centerX = (currentX + thumbX) / 2;
                const centerY = (currentY + thumbY) / 2;
                
                // Overlay UI for Pinch Grab
                overlayCtx.beginPath();
                overlayCtx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
                overlayCtx.fillStyle = 'rgba(255, 235, 59, 0.6)';
                overlayCtx.fill();
                overlayCtx.strokeStyle = '#facc15';
                overlayCtx.lineWidth = 2;
                overlayCtx.stroke();
                
                if (!isPanningState) {
                    isPanningState = true;
                    panLastX = centerX;
                    panLastY = centerY;
                } else {
                    const dx = centerX - panLastX;
                    const dy = centerY - panLastY;
                    panCanvas(dx, dy);
                    panLastX = centerX;
                    panLastY = centerY;
                }
                isDrawingPath = false;
            } else {
                isPanningState = false;

                // Overlay UI for Brush/Eraser Dot
                overlayCtx.beginPath();
                overlayCtx.arc(currentX, currentY, parseInt(lineWidthRange.value) / 2 + 3, 0, 2 * Math.PI);
                overlayCtx.fillStyle = gesture === 'Erase (Open Palm)' ? 'rgba(255,255,255,0.8)' : colorPicker.value;
                overlayCtx.fill();
                overlayCtx.strokeStyle = '#fff';
                overlayCtx.lineWidth = 2;
                overlayCtx.stroke();
                
                if (gesture === "Draw (One Finger)") {
                    drawCtx.globalCompositeOperation = "source-over";
                    drawCtx.lineWidth = lineWidthRange.value;
                    drawCtx.strokeStyle = colorPicker.value;
                    
                    if (!isDrawingPath) {
                        isDrawingPath = true;
                        drawCtx.beginPath();
                        drawCtx.moveTo(currentX, currentY);
                    } else {
                        drawCtx.lineTo(currentX, currentY);
                        drawCtx.stroke();
                    }
                } else if (gesture === "Erase (Open Palm)") {
                    drawCtx.globalCompositeOperation = "destination-out";
                    drawCtx.lineWidth = 60; // Thicker standard erasing
                    
                    if (!isDrawingPath) {
                        isDrawingPath = true;
                        drawCtx.beginPath();
                        drawCtx.moveTo(currentX, currentY);
                    } else {
                        drawCtx.lineTo(currentX, currentY);
                        drawCtx.stroke();
                    }
                } else {
                    // Stop drawing on Pause (Fist) or Unknown
                    isDrawingPath = false;
                    drawCtx.beginPath();
                }
            }
        } else {
            isDrawingPath = false;
            isPanningState = false;
            activeGestureEl.innerText = "No Hand Detected";
            drawCtx.beginPath();
        }
    }
    requestAnimationFrame(predictWebcam);
}

// Start sequence
init();

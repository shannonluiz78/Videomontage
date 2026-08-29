/**
 * Real Estate Video Maker - Client-side video generation using FFmpeg.wasm
 * All processing happens in the browser - no server uploads
 */

// Initialize FFmpeg
const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;

// State
let uploadedImages = [];
let audioFile = null;
let isProcessing = false;

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const imageCount = document.getElementById('count');
const imagePreview = document.getElementById('imagePreview');
const durationSlider = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const transitionSlider = document.getElementById('transition');
const transitionValue = document.getElementById('transitionValue');
const outputWidth = document.getElementById('outputWidth');
const outputHeight = document.getElementById('outputHeight');
const enableText = document.getElementById('enableText');
const textOptions = document.getElementById('textOptions');
const overlayText = document.getElementById('overlayText');
const textPreview = document.getElementById('textPreview');
const enableAudio = document.getElementById('enableAudio');
const audioOptions = document.getElementById('audioOptions');
const audioInput = document.getElementById('audioInput');
const generateBtn = document.getElementById('generateBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressPercent = document.getElementById('progressPercent');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const fileSize = document.getElementById('fileSize');
const fileDuration = document.getElementById('fileDuration');

// Initialize
async function init() {
    try {
        progressLabel.textContent = 'Loading FFmpeg (this may take a moment)...';
        progressContainer.style.display = 'block';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';
        
        await ffmpeg.load({
            coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
            wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm'
        });
        
        ffmpegLoaded = true;
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressLabel.textContent = 'FFmpeg loaded!';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        progressLabel.textContent = '❌ Failed to load FFmpeg. Please refresh and try again.';
        showToast('Failed to initialize video processor. Please try again.', 'error');
        progressContainer.style.display = 'none';
    }
}

// Event Listeners
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
});

enableText.addEventListener('change', (e) => {
    textOptions.style.display = e.target.checked ? 'block' : 'none';
    updateTextPreview();
});

enableAudio.addEventListener('change', (e) => {
    audioOptions.style.display = e.target.checked ? 'block' : 'none';
});

overlayText.addEventListener('input', updateTextPreview);

audioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        audioFile = e.target.files[0];
    }
});

durationSlider.addEventListener('input', (e) => {
    durationValue.textContent = `${e.target.value} seconds`;
});

transitionSlider.addEventListener('input', (e) => {
    transitionValue.textContent = `${e.target.value} seconds`;
});

generateBtn.addEventListener('click', generateVideo);

downloadBtn.addEventListener('click', () => {
    const videoUrl = downloadSection.querySelector('a')?.href;
    if (videoUrl) {
        window.open(videoUrl, '_blank');
    }
});

resetBtn.addEventListener('click', resetAll);

// Functions
function handleFiles(files) {
    if (files.length === 0) return;
    
    files.forEach(file => {
        if (uploadedImages.length < 50) { // Limit to 50 images
            uploadedImages.push(file);
        }
    });
    
    updatePreview();
    updateGenerateButton();
    showToast(`Added ${files.length} image(s). Total: ${uploadedImages.length} images`, 'success');
}

function updatePreview() {
    imagePreview.innerHTML = '';
    imagePreview.classList.remove('hidden');
    
    uploadedImages.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = `Image ${index + 1}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove image';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(index);
        });
        
        const indexBadge = document.createElement('span');
        indexBadge.className = 'index';
        indexBadge.textContent = index + 1;
        
        item.appendChild(img);
        item.appendChild(removeBtn);
        item.appendChild(indexBadge);
        imagePreview.appendChild(item);
    });
    
    imageCount.textContent = uploadedImages.length;
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    updatePreview();
    updateGenerateButton();
    
    if (uploadedImages.length === 0) {
        imagePreview.classList.add('hidden');
        imageCount.textContent = '0';
    }
}

function updateGenerateButton() {
    if (uploadedImages.length >= 1 && ffmpegLoaded) {
        generateBtn.disabled = false;
    } else {
        generateBtn.disabled = true;
    }
}

function updateTextPreview() {
    if (enableText.checked && overlayText.value) {
        textPreview.textContent = overlayText.value;
    } else {
        textPreview.textContent = 'Your text will appear here';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateProgress(percent, label) {
    progressContainer.style.display = 'block';
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
    progressLabel.textContent = label || 'Processing...';
}

async function generateVideo() {
    if (isProcessing || uploadedImages.length === 0 || !ffmpegLoaded) return;
    
    isProcessing = true;
    generateBtn.disabled = true;
    downloadSection.style.display = 'none';
    
    try {
        // Reset FFmpeg
        await ffmpeg.terminate();
        await ffmpeg.load({
            coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
            wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm'
        });
        
        updateProgress(5, 'Preparing files...');
        
        const width = parseInt(outputWidth.value);
        const height = parseInt(outputHeight.value);
        const duration = parseFloat(durationSlider.value);
        const transitionDuration = parseFloat(transitionSlider.value);
        const fps = 25;
        const totalFrames = Math.ceil(duration * fps);
        const totalClips = uploadedImages.length;
        const totalDuration = totalClips * duration;
        
        // Create input directory
        await ffmpeg.exec('mkdir -i /inputs');
        
        // Write images to virtual filesystem
        for (let i = 0; i < uploadedImages.length; i++) {
            updateProgress(10 + (i * 15 / totalClips), `Loading image ${i + 1}/${totalClips}...`);
            const imageData = await uploadedImages[i].arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
            const inputPath = `/inputs/image_${i.toString().padStart(3, '0')}.jpg`;
            await ffmpeg.writeFile(inputPath, Uint8Array.from(atob(base64), c => c.charCodeAt(0)));
        }
        
        // Handle audio if provided
        let audioFileName = null;
        if (enableAudio.checked && audioFile) {
            updateProgress(90, 'Loading audio...');
            const audioData = await audioFile.arrayBuffer();
            const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioData)));
            const audioPath = '/inputs/audio.mp3';
            await ffmpeg.writeFile(audioPath, Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0)));
            audioFileName = 'audio.mp3';
        }
        
        updateProgress(95, 'Rendering video...');
        
        // Generate clips with Ken Burns effect
        for (let i = 0; i < uploadedImages.length; i++) {
            const inputPath = `/inputs/image_${i.toString().padStart(3, '0')}.jpg`;
            const clipPath = `/inputs/clip_${i.toString().padStart(3, '0')}.mp4`;
            
            const zoomPanFilter = `zoompan=z='if(lte(zoom,1.3),zoom+0.002,1.3)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
            const fadeFilter = `fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5`;
            
            let textFilter = '';
            if (enableText.checked && overlayText.value) {
                const escapedText = overlayText.value.replace(/'/g, "\\'").replace(/:/g, '\\:');
                textFilter = `,drawtext=text='${escapedText}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-80`;
            }
            
            const filter = `${zoomPanFilter},${fadeFilter}${textFilter}`;
            const cmd = `-loop 1 -i ${inputPath} -vf "${filter}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -r ${fps} -y ${clipPath}`;
            
            updateProgress(95 + (i * 4 / totalClips), `Creating clip ${i + 1}/${totalClips}...`);
            await ffmpeg.exec(cmd);
        }
        
        // Create transition for each pair and concatenate
        if (totalClips > 1) {
            let concatList = '';
            
            // First clip
            concatList += `file '/inputs/clip_000.mp4'\n`;
            
            for (let i = 1; i < totalClips; i++) {
                const clip1 = `/inputs/clip_${(i-1).toString().padStart(3, '0')}.mp4`;
                const clip2 = `/inputs/clip_${i.toString().padStart(3, '0')}.mp4`;
                const transitionClip = `/inputs/transition_${i.toString().padStart(3, '0')}.mp4`;
                
                const xfadeFilter = `[0:v][1:v]xfade=transition=fade:duration=${transitionDuration}:offset=0[outv]`;
                const cmd = `-i ${clip1} -i ${clip2} -filter_complex "${xfadeFilter}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -y ${transitionClip}`;
                
                await ffmpeg.exec(cmd);
                concatList += `file '/inputs/transition_${i.toString().padStart(3, '0')}.mp4'\n`;
            }
            
            // Write concat file
            await ffmpeg.writeFile('/inputs/concat_list.txt', concatList);
            
            // Concatenate all clips
            const concatCmd = `-f concat -safe 0 -i /inputs/concat_list.txt -c copy -y /outputs/final.mp4`;
            await ffmpeg.exec(concatCmd);
        } else {
            // Single clip - just rename/copy
            await ffmpeg.exec(`-i /inputs/clip_000.mp4 -c copy -y /outputs/final.mp4`);
        }
        
        // Add audio if provided
        if (audioFileName) {
            updateProgress(99, 'Adding audio...');
            await ffmpeg.exec(`-i /outputs/final.mp4 -i /inputs/audio.mp3 -c:v copy -c:a aac -shortest -y /outputs/final_with_audio.mp4`);
            await ffmpeg.exec(`mv /outputs/final_with_audio.mp4 /outputs/final.mp4`);
        }
        
        // Read output file
        updateProgress(100, 'Finalizing...');
        const outputData = await ffmpeg.readFile('/outputs/final.mp4');
        
        // Create download
        const blob = new Blob([outputData], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'property_tour.mp4';
        a.click();
        
        // Display info
        fileSize.textContent = `Size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`;
        fileDuration.textContent = `Duration: ${totalDuration.toFixed(1)} seconds`;
        
        // Show download section
        downloadSection.innerHTML = `
            <h2>✅ Video Ready!</h2>
            <p class="download-info">
                <span id="fileSize">${fileSize.textContent}</span> · 
                <span id="fileDuration">${fileDuration.textContent}</span>
            </p>
            <button id="downloadBtn" class="btn-secondary">
                ⬇️ Download Video
            </button>
            <button id="resetBtn" class="btn-ghost">
                🔄 Create Another Video
            </button>
        `;
        downloadSection.querySelector('#downloadBtn').addEventListener('click', () => {
            window.open(url, '_blank');
        });
        downloadSection.querySelector('#resetBtn').addEventListener('click', resetAll);
        downloadSection.style.display = 'block';
        
        showToast('🎉 Video created successfully!', 'success');
        
    } catch (error) {
        console.error('Video generation failed:', error);
        showToast(`❌ Error creating video: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        generateBtn.disabled = uploadedImages.length === 0;
    }
}

function resetAll() {
    uploadedImages = [];
    audioFile = null;
    imagePreview.innerHTML = '';
    imagePreview.classList.add('hidden');
    imageCount.textContent = '0';
    updateGenerateButton();
    downloadSection.style.display = 'none';
    progressContainer.style.display = 'none';
    fileInput.value = '';
    audioInput.value = '';
    overlayText.value = '';
    textPreview.textContent = 'Your text will appear here';
    enableText.checked = false;
    textOptions.style.display = 'none';
    enableAudio.checked = false;
    audioOptions.style.display = 'none';
    
    // Reset to defaults
    durationSlider.value = '5';
    durationValue.textContent = '5 seconds';
    transitionSlider.value = '0.5';
    transitionValue.textContent = '0.5 seconds';
    outputWidth.value = '1920';
    outputHeight.value = '1080';
}

// Start initialization
init();
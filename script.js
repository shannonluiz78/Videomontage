/***
 * Real Estate Video Maker - Client-side video generation using FFmpeg.wasm
 * Fixed version with better error handling and per-image captions
 * All processing happens in the browser - no server uploads
 */

// Initialize FFmpeg
const ffmpeg = new FFmpeg();
let ffmpegReady = false;
let ffmpegLoadError = null;

// State
let uploadedImages = [];
let audioFile = null;
let isProcessing = false;
let captions = []; // Per-image captions

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const imageCount = document.getElementById('count');
const imagePreview = document.getElementById('imagePreview');
const durationSlider = document.getElementById('duration');
const durationValue = document.getElementById('durationValue');
const transitionSlider = document.getElementById('transition');
const transitionValue = document.getElementById('transitionValue');
const resolutionSelect = document.getElementById('resolution');
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
const fileSize = document.getElementById('fileSize');
const fileDuration = document.getElementById('fileDuration');
const statusBadge = document.getElementById('ffmpegStatus');
const retryBtn = document.getElementById('retryFfmpeg');

// Initialize FFmpeg with better error handling
async function initFFmpeg() {
    try {
        showStatus('Loading FFmpeg core (~30MB)...', 'loading');
        progressContainer.style.display = 'block';
        progressFill.style.width = '30%';
        progressPercent.textContent = '30%';
        progressLabel.textContent = '📥 Downloading FFmpeg core...';
        generateBtn.disabled = true;
        
        await ffmpeg.load({
            coreURL: './js/ffmpeg-core.js',
            wasmURL: './js/ffmpeg-core.wasm'
        });
        
        ffmpegReady = true;
        ffmpegLoadError = null;
        showStatus('FFmpeg ready ✓', 'success');
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressLabel.textContent = '✅ FFmpeg loaded successfully!';
        
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1500);
        
        checkGenerateEnabled();
    } catch (error) {
        console.error('FFmpeg load error:', error);
        ffmpegReady = false;
        ffmpegLoadError = error.message || 'Unknown error loading FFmpeg';
        
        showStatus('FFmpeg failed to load ❌', 'error');
        progressLabel.textContent = `❌ FFmpeg load failed: ${ffmpegLoadError}`;
        showToast(`Failed to load video processor: ${ffmpegLoadError}`, 'error');
        
        progressContainer.style.display = 'none';
        generateBtn.disabled = true;
        
        // Show retry option
        setTimeout(() => {
            showToast('💡 Tip: Try a different browser (Chrome recommended) or refresh the page', 'info');
        }, 2000);
    }
}

// Status badge updates
function showStatus(message, type) {
    if (!statusBadge) return;
    statusBadge.textContent = message;
    statusBadge.className = `status-badge status-${type}`;
}

// Toast notification
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// File handling
function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('No image files found. Please upload JPG, PNG, or WEBP images.', 'error');
        return;
    }
    
    // Add new captions for new images
    const newCaptions = imageFiles.map(() => '');
    captions = [...captions, ...newCaptions];
    
    uploadedImages = [...uploadedImages, ...imageFiles];
    updatePreview();
    checkGenerateEnabled();
    
    if (imageFiles.length === 1) {
        showToast(`Added 1 image. Total: ${uploadedImages.length}`, 'success');
    } else {
        showToast(`Added ${imageFiles.length} images. Total: ${uploadedImages.length}`, 'success');
    }
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    captions.splice(index, 1);
    updatePreview();
    checkGenerateEnabled();
    
    if (uploadedImages.length === 0) {
        imageCount.textContent = '0';
        imagePreview.style.display = 'none';
        enableText.checked = false;
        textOptions.classList.remove('show');
    }
}

function updatePreview() {
    imagePreview.innerHTML = '';
    imageCount.textContent = uploadedImages.length;
    
    if (uploadedImages.length === 0) {
        imagePreview.style.display = 'none';
        return;
    }
    
    imagePreview.style.display = 'grid';
    
    uploadedImages.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = `Image ${index + 1}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove';
        removeBtn.onclick = () => removeImage(index);
        
        // Caption badge
        const captionBadge = document.createElement('div');
        captionBadge.className = 'caption-badge';
        captionBadge.textContent = captions[index] || 'No caption';
        captionBadge.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: white;
            font-size: 11px;
            padding: 4px 6px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        
        // Click on preview to edit caption
        item.onclick = (e) => {
            if (e.target === removeBtn) return;
            editCaption(index);
        };
        item.style.cursor = 'pointer';
        
        const indexBadge = document.createElement('div');
        indexBadge.style.cssText = 'position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:white;font-size:10px;padding:2px 6px;border-radius:4px;';
        indexBadge.textContent = index + 1;
        
        item.appendChild(img);
        item.appendChild(removeBtn);
        item.appendChild(captionBadge);
        item.appendChild(indexBadge);
        imagePreview.appendChild(item);
    });
}

function editCaption(index) {
    const currentCaption = captions[index] || '';
    const newCaption = prompt(`Enter caption for image ${index + 1}:`, currentCaption);
    if (newCaption !== null) {
        captions[index] = newCaption.trim();
        updatePreview();
    }
}

function checkGenerateEnabled() {
    // Button enabled when: images loaded + FFmpeg ready
    const canGenerate = uploadedImages.length >= 1 && ffmpegReady;
    generateBtn.disabled = !canGenerate;
    
    if (!canGenerate && uploadedImages.length >= 1 && !ffmpegReady) {
        generateBtn.title = `FFmpeg not loaded (${ffmpegLoadError || 'unknown error'})`;
    } else {
        generateBtn.title = '';
    }
}

// Slider updates
durationSlider.addEventListener('input', () => {
    durationValue.textContent = `${durationSlider.value} seconds`;
});

transitionSlider.addEventListener('input', () => {
    transitionValue.textContent = `${transitionSlider.value} seconds`;
});

// Checkbox toggles
enableText.addEventListener('change', () => {
    textOptions.classList.toggle('show', enableText.checked);
    updateTextPreview();
});

enableAudio.addEventListener('change', () => {
    audioOptions.classList.toggle('show', enableAudio.checked);
});

overlayText.addEventListener('input', updateTextPreview);

function updateTextPreview() {
    if (enableText.checked && overlayText.value) {
        textPreview.textContent = overlayText.value;
    } else {
        textPreview.textContent = 'Same caption will be used for all images (or edit per image)';
    }
}

// Audio file
audioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        audioFile = e.target.files[0];
        showToast(`Audio loaded: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`, 'success');
    }
});

// Dropzone events
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
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
});

// Retry FFmpeg button
if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
        showToast('Retrying FFmpeg load...', 'info');
        await initFFmpeg();
    });
}

// Main video generation
async function generateVideo() {
    if (isProcessing || uploadedImages.length === 0 || !ffmpegReady) {
        showToast('Cannot generate: ' + (uploadedImages.length === 0 ? 'No images' : 'FFmpeg not ready'), 'error');
        return;
    }
    
    isProcessing = true;
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Processing...';
    downloadSection.classList.remove('show');
    
    const ff = window.ffmpeg;
    
    try {
        // Parse settings
        const [width, height] = resolutionSelect.value.split('x').map(Number);
        const duration = parseFloat(durationSlider.value);
        const transitionDuration = parseFloat(transitionSlider.value);
        const fps = 30;
        const totalFrames = Math.ceil(duration * fps);
        const totalDuration = uploadedImages.length * duration;
        
        // Reset FFmpeg
        await ff.terminate();
        await ff.load({
            coreURL: './js/ffmpeg-core.js',
            wasmURL: './js/ffmpeg-core.wasm'
        });
        
        showStatus('Preparing files...', 'loading');
        progressFill.style.width = '5%';
        progressPercent.textContent = '5%';
        progressLabel.textContent = '📁 Preparing...';
        
        // Write images to virtual filesystem
        for (let i = 0; i < uploadedImages.length; i++) {
            const percent = 5 + (i * 15 / uploadedImages.length);
            progressFill.style.width = `${percent}%`;
            progressPercent.textContent = `${Math.round(percent)}%`;
            progressLabel.textContent = `📷 Loading image ${i + 1}/${uploadedImages.length}...`;
            showStatus(`Loading image ${i + 1}/${uploadedImages.length}...`, 'loading');
            
            const imageData = await uploadedImages[i].arrayBuffer();
            const data = new Uint8Array(imageData);
            const filename = `input_${i.toString().padStart(3, '0')}.jpg`;
            await ff.writeFile(filename, data);
        }
        
        // Write audio if provided
        if (enableAudio.checked && audioFile) {
            progressFill.style.width = '80%';
            progressPercent.textContent = '80%';
            progressLabel.textContent = '🎵 Loading audio...';
            showStatus('Loading audio...', 'loading');
            
            const audioData = await audioFile.arrayBuffer();
            const audioDataArr = new Uint8Array(audioData);
            await ff.writeFile('audio.mp3', audioDataArr);
        }
        
        // Generate clips with Ken Burns effect
        for (let i = 0; i < uploadedImages.length; i++) {
            const percent = 85 + (i * 10 / uploadedImages.length);
            progressFill.style.width = `${percent}%`;
            progressPercent.textContent = `${Math.round(percent)}%`;
            progressLabel.textContent = `🎬 Creating clip ${i + 1}/${uploadedImages.length}...`;
            showStatus(`Creating clip ${i + 1}/${uploadedImages.length}...`, 'loading');
            
            const inputFile = `input_${i.toString().padStart(3, '0')}.jpg`;
            const clipFile = `clip_${i.toString().padStart(3, '0')}.mp4`;
            
            // Get caption for this specific image
            const caption = captions[i] || (enableText.checked ? overlayText.value : '');
            
            // Ken Burns zoom effect
            const zoomFilter = `zoompan=z='if(lte(zoom,1.35),zoom+0.0025,1.35)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
            const fadeFilter = `fade=t=in:st=0:d=0.5,fade=t=out:st=${duration - 0.5}:d=0.5`;
            
            let textFilter = '';
            if (caption) {
                // Escape special characters for FFmpeg drawtext
                const escaped = caption
                    .replace(/\\/g, '\\\\')
                    .replace(/:/g, '\\:')
                    .replace(/'/g, "\\'")
                    .replace(/=/g, '\\=')
                    .replace(/,/g, '\\,')
                    .replace(/%/g, '\\%');
                textFilter = `,drawtext=text='${escaped}':fontcolor=white:fontsize=26:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-80`;
            }
            
            const vf = `${zoomFilter},${fadeFilter}${textFilter}`;
            const cmd = `-loop 1 -i ${inputFile} -vf "${vf}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -r ${fps} -y ${clipFile}`;
            
            await ff.exec(cmd);
        }
        
        progressFill.style.width = '95%';
        progressPercent.textContent = '95%';
        progressLabel.textContent = '🔗 Combining clips with transitions...';
        showStatus('Combining clips...', 'loading');
        
        // Create transitions and concatenate
        if (uploadedImages.length > 1) {
            // Create concat file with transitions
            let concatContent = '';
            
            for (let i = 0; i < uploadedImages.length - 1; i++) {
                const clip1 = `clip_${i.toString().padStart(3, '0')}.mp4`;
                const clip2 = `clip_${(i+1).toString().padStart(3, '0')}.mp4`;
                const transFile = `trans_${i.toString().padStart(3, '0')}.mp4`;
                
                const xfadeCmd = `-i ${clip1} -i ${clip2} -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${transitionDuration}:offset=0[outv]" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -y ${transFile}`;
                await ff.exec(xfadeCmd);
                
                if (i === 0) {
                    concatContent += `file '${transFile}'\n`;
                } else {
                    concatContent += `file '${transFile}'\n`;
                }
            }
            
            // Add last clip
            const lastClip = `clip_${(uploadedImages.length - 1).toString().padStart(3, '0')}.mp4`;
            concatContent += `file '${lastClip}'\n`;
            
            await ff.writeFile('concat.txt', concatContent);
            
            const concatCmd = `-f concat -safe 0 -i concat.txt -c copy -y output.mp4`;
            await ff.exec(concatCmd);
        } else {
            // Single clip
            const clipFile = `clip_000.mp4`;
            await ff.exec(`-i ${clipFile} -c copy -y output.mp4`);
        }
        
        progressFill.style.width = '98%';
        progressPercent.textContent = '98%';
        progressLabel.textContent = '🎵 Adding audio...';
        showStatus('Adding audio...', 'loading');
        
        // Add audio if provided
        if (enableAudio.checked && audioFile) {
            await ff.exec('-i output.mp4 -i audio.mp3 -c:v copy -c:a aac -shortest -y output_audio.mp4');
            await ff.exec('mv output_audio.mp4 output.mp4');
        }
        
        progressFill.style.width = '100%';
        progressPercent.textContent = '100%';
        progressLabel.textContent = '✅ Finalizing...';
        showStatus('Finalizing...', 'loading');
        
        // Read output
        const outputData = await ff.readFile('output.mp4');
        const blob = new Blob([outputData], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        // Update download section
        fileSize.textContent = `📦 File size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`;
        fileDuration.textContent = `⏱️ Duration: ${totalDuration.toFixed(1)} seconds (${uploadedImages.length} clips × ${duration}s)`;
        
        downloadSection.innerHTML = `
            <h2>✅ Video Ready!</h2>
            <p class="download-info">
                ${fileSize.textContent} · ${fileDuration.textContent}
            </p>
            <a href="${url}" download="property_tour.mp4" style="
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 0.85rem 2rem;
                font-size: 1rem;
                font-weight: 600;
                border-radius: 10px;
                text-decoration: none;
                margin: 0.5rem;
            ">⬇️ Download Video</a>
            <button class="btn-ghost" onclick="resetAll()" style="
                background: transparent;
                color: #64748b;
                border: 1px solid #e2e8f0;
                padding: 0.85rem 2rem;
                font-size: 1rem;
                border-radius: 10px;
                cursor: pointer;
                margin: 0.5rem;
            ">🔄 Create Another Video</button>
        `;
        downloadSection.classList.add('show');
        
        showStatus('✅ Done!', 'success');
        showToast('🎉 Video created successfully!', 'success');
        
    } catch (error) {
        console.error('Video generation error:', error);
        showStatus('❌ Error', 'error');
        showToast(`❌ Error creating video: ${error.message || error}`, 'error');
    } finally {
        isProcessing = false;
        if (!downloadSection.classList.contains('show')) {
            generateBtn.disabled = !(uploadedImages.length >= 1 && ffmpegReady);
            generateBtn.textContent = '🎬 Generate Video';
        }
    }
}

generateBtn.addEventListener('click', generateVideo);

// Reset
function resetAll() {
    uploadedImages = [];
    captions = [];
    audioFile = null;
    audioInput.value = '';
    overlayText.value = '';
    textPreview.textContent = 'Same caption will be used for all images (or edit per image)';
    enableText.checked = false;
    textOptions.classList.remove('show');
    enableAudio.checked = false;
    audioOptions.classList.remove('show');
    imagePreview.innerHTML = '';
    imagePreview.style.display = 'none';
    imageCount.textContent = '0';
    downloadSection.classList.remove('show');
    progressContainer.style.display = 'none';
    generateBtn.disabled = true;
    generateBtn.textContent = '🎬 Generate Video';
    
    durationSlider.value = '2.5';
    durationValue.textContent = '2.5 seconds';
    transitionSlider.value = '0.5';
    transitionValue.textContent = '0.5 seconds';
    resolutionSelect.value = '1920x1080';
    
    showStatus('Ready', 'idle');
}

// Initialize on page load
window.addEventListener('load', () => {
    showStatus('Initializing...', 'loading');
    initFFmpeg();
});

// Handle page visibility change - reload FFmpeg if needed
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !ffmpegReady) {
        // Try to reinitialize if page was backgrounded during load
        initFFmpeg();
    }
});
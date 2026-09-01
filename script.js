/**
 * Real Estate Video Maker - Client-side video generation using FFmpeg.wasm
 * All processing happens in the browser - no server uploads
 * 
 * Core FFmpeg files are served locally from /js/ directory with COOP/COEP headers
 */

// Wait for DOM and FFmpeg library to be ready
document.addEventListener('DOMContentLoaded', async () => {
    // Check if FFmpeg library loaded
    if (typeof FFmpeg === 'undefined') {
        showStatusBadges && showStatus('FFmpeg library not loaded ❌', 'error');
        console.error('FFmpeg library failed to load from CDN');
        return;
    }

    // Initialize state
    let uploadedImages = [];
    let audioFile = null;
    let isProcessing = false;
    let ffmpegReady = false;
    let ffmpegLoadError = null;
    let captions = [];

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const countEl = document.getElementById('count');
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
    const statusBadge = document.getElementById('statusBadge');
    const toast = document.getElementById('toast');

    // Status badge
    function showStatus(message, type) {
        if (!statusBadge) return;
        statusBadge.textContent = message;
        statusBadge.className = `status-badge status-${type}`;
    }

    // Toast
    let toastTimer;
    function showToast(message, type = 'info') {
        if (toastTimer) clearTimeout(toastTimer);
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // File handling
    function handleFiles(files) {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            showToast('No image files found.', 'error');
            return;
        }
        
        captions = [...captions, ...imageFiles.map(() => '')];
        uploadedImages = [...uploadedImages, ...imageFiles];
        updatePreview();
        checkGenerateEnabled();
        showToast(`Added ${imageFiles.length} image(s). Total: ${uploadedImages.length}`, 'success');
    }

    function removeImage(index) {
        if (index < 0 || index >= uploadedImages.length) return;
        uploadedImages.splice(index, 1);
        captions.splice(index, 1);
        updatePreview();
        checkGenerateEnabled();
        if (uploadedImages.length === 0) {
            countEl.textContent = '0';
            imagePreview.style.display = 'none';
        }
    }

    function updatePreview() {
        if (!imagePreview) return;
        imagePreview.innerHTML = '';
        countEl.textContent = uploadedImages.length;
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
            removeBtn.onclick = (e) => { e.stopPropagation(); removeImage(index); };
            
            const captionBadge = document.createElement('div');
            captionBadge.className = 'caption-badge';
            captionBadge.textContent = captions[index] || 'Add caption...';
            
            item.onclick = () => editCaption(index);
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
        const current = captions[index] || '';
        const newCaption = prompt(`Caption for image ${index + 1}:`, current);
        if (newCaption !== null) {
            captions[index] = newCaption.trim();
            updatePreview();
        }
    }

    function checkGenerateEnabled() {
        if (!generateBtn) return;
        generateBtn.disabled = !(uploadedImages.length >= 1 && ffmpegReady);
    }

    // Slider events
    if (durationSlider) durationSlider.addEventListener('input', () => durationValue.textContent = `${durationSlider.value} seconds`);
    if (transitionSlider) transitionSlider.addEventListener('input', () => transitionValue.textContent = `${transitionSlider.value} seconds`);

    // Checkbox toggles
    if (enableText) enableText.addEventListener('change', () => textOptions.classList.toggle('show', enableText.checked));
    if (enableAudio) enableAudio.addEventListener('change', () => audioOptions.classList.toggle('show', enableAudio.checked));
    if (overlayText) overlayText.addEventListener('input', () => {
        if (enableText && enableText.checked) textPreview.textContent = overlayText.value;
    });

    // Audio
    if (audioInput) audioInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            audioFile = e.target.files[0];
            showToast(`Audio loaded: ${audioFile.name}`, 'success');
        }
    });

    // Dropzone
    if (dropzone) {
        dropzone.addEventListener('click', () => fileInput && fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => { 
            e.preventDefault(); 
            dropzone.classList.remove('dragover'); 
            handleFiles(e.dataTransfer.files); 
        });
    }
    if (fileInput) fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); fileInput.value = ''; });

    // Initialize FFmpeg
    async function initFFmpeg() {
        try {
            showStatus('Loading FFmpeg core (~30MB)...', 'loading');
            if (progressContainer) progressContainer.style.display = 'block';
            if (progressFill) progressFill.style.width = '30%';
            if (progressPercent) progressPercent.textContent = '30%';
            if (progressLabel) progressLabel.textContent = '📥 Downloading FFmpeg core...';
            if (generateBtn) generateBtn.disabled = true;
            
            // Create FFmpeg instance
            const ff = new FFmpeg();
            window.ffmpeg = ff;
            
            // Load from local files (served with COOP/COEP headers on Vercel)
            await ff.load({
                coreURL: './js/ffmpeg-core.js',
                wasmURL: './js/ffmpeg-core.wasm'
            });
            
            ffmpegReady = true;
            ffmpegLoadError = null;
            showStatus('FFmpeg ready ✓', 'success');
            if (progressFill) progressFill.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';
            if (progressLabel) progressLabel.textContent = '✅ FFmpeg loaded!';
            
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
                showStatus('Ready to create videos', 'idle');
            }, 1500);
            
            checkGenerateEnabled();
        } catch (error) {
            console.error('FFmpeg load error:', error);
            ffmpegReady = false;
            ffmpegLoadError = error.message || 'Unknown error';
            
            let errorMessage = ffmpegLoadError;
            if (errorMessage.includes('SharedArrayBuffer') || errorMessage.includes('cross-origin')) {
                errorMessage = 'Missing COOP/COEP headers. The server must send Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers.';
            } else if (errorMessage.includes('abort') || errorMessage.includes('network') || errorMessage.includes('failed to fetch')) {
                errorMessage = 'Network error loading FFmpeg files. Check your internet connection and try again.';
            } else if (errorMessage.includes('not supported')) {
                errorMessage = 'Your browser does not support WebAssembly features required by FFmpeg.wasm. Please use Chrome or Edge.';
            }
            
            showStatus('FFmpeg failed ❌', 'error');
            if (progressLabel) progressLabel.textContent = `❌ FFmpeg load failed: ${errorMessage}`;
            showToast(`Failed to load video processor: ${errorMessage}`, 'error');
            if (progressContainer) progressContainer.style.display = 'none';
            if (generateBtn) generateBtn.disabled = true;
            
            console.error('Full error:', error);
        }
    }

    // Generate video function
    async function generateVideo() {
        if (isProcessing || uploadedImages.length === 0 || !ffmpegReady) {
            if (!ffmpegReady) {
                showToast('❌ FFmpeg not loaded. Cannot generate video.', 'error');
            } else {
                showToast('Cannot generate: No images or processing in progress.', 'error');
            }
            return;
        }
        
        isProcessing = true;
        if (generateBtn) { generateBtn.disabled = true; generateBtn.textContent = '⏳ Processing...'; }
        if (downloadSection) downloadSection.classList.remove('show');
        if (downloadLink) downloadLink.style.display = 'none';
        
        const ff = window.ffmpeg;
        if (!ff) {
            showToast('❌ FFmpeg not initialized', 'error');
            isProcessing = false;
            return;
        }
        
        try {
            const [width, height] = (resolutionSelect.value || '1920x1080').split('x').map(Number);
            const duration = parseFloat(durationSlider.value || '3');
            const transitionDuration = parseFloat(transitionSlider.value || '0.5');
            const fps = 30;
            const totalFrames = Math.ceil(duration * fps);
            const totalDuration = uploadedImages.length * duration;
            
            await ff.terminate();
            await ff.load({
                coreURL: './js/ffmpeg-core.js',
                wasmURL: './js/ffmpeg-core.wasm'
            });
            
            if (progressFill) progressFill.style.width = '5%';
            if (progressPercent) progressPercent.textContent = '5%';
            if (progressLabel) progressLabel.textContent = '📁 Preparing...';
            
            // Write images
            for (let i = 0; i < uploadedImages.length; i++) {
                const p = 5 + (i * 15 / uploadedImages.length);
                if (progressFill) progressFill.style.width = `${p}%`;
                if (progressPercent) progressPercent.textContent = `${Math.round(p)}%`;
                if (progressLabel) progressLabel.textContent = `📷 Image ${i + 1}/${uploadedImages.length}...`;
                
                const data = new Uint8Array(await uploadedImages[i].arrayBuffer());
                await ff.writeFile(`input_${i.toString().padStart(3,'0')}.jpg`, data);
            }
            
            // Write audio
            if (enableAudio && enableAudio.checked && audioFile) {
                if (progressFill) progressFill.style.width = '80%';
                if (progressPercent) progressPercent.textContent = '80%';
                if (progressLabel) progressLabel.textContent = '🎵 Loading audio...';
                await ff.writeFile('audio.mp3', new Uint8Array(await audioFile.arrayBuffer()));
            }
            
            // Generate clips
            for (let i = 0; i < uploadedImages.length; i++) {
                const p = 85 + (i * 10 / uploadedImages.length);
                if (progressFill) progressFill.style.width = `${p}%`;
                if (progressPercent) progressPercent.textContent = `${Math.round(p)}%`;
                if (progressLabel) progressLabel.textContent = `🎬 Clip ${i + 1}/${uploadedImages.length}...`;
                
                const inputFile = `input_${i.toString().padStart(3,'0')}.jpg`;
                const clipFile = `clip_${i.toString().padStart(3,'0')}.mp4`;
                
                const caption = captions[i] || (enableText && enableText.checked ? overlayText.value : '');
                
                const zoomFilter = `zoompan=z='if(lte(zoom,1.35),zoom+0.0025,1.35)':d=${totalFrames}:s=${width}x${height}:fps=${fps}`;
                const fadeFilter = `fade=t=in:st=0:d=0.5,fade=t=out:st=${duration-0.5}:d=0.5`;
                
                let textFilter = '';
                if (caption) {
                    const escaped = caption.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/=/g,'\\=').replace(/,/g,'\\,').replace(/%/g,'\\%');
                    textFilter = `,drawtext=text='${escaped}':fontcolor=white:fontsize=26:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-80`;
                }
                
                const vf = `${zoomFilter},${fadeFilter}${textFilter}`;
                const cmd = `-loop 1 -i ${inputFile} -vf "${vf}" -t ${duration} -c:v libx264 -pix_fmt yuv420p -r ${fps} -y ${clipFile}`;
                await ff.exec(cmd);
            }
            
            // Combine with transitions
            if (progressFill) progressFill.style.width = '95%';
            if (progressPercent) progressPercent.textContent = '95%';
            if (progressLabel) progressLabel.textContent = '🔗 Combining...';
            
            if (uploadedImages.length > 1) {
                let concat = '';
                for (let i = 0; i < uploadedImages.length - 1; i++) {
                    const c1 = `clip_${i.toString().padStart(3,'0')}.mp4`;
                    const c2 = `clip_${(i+1).toString().padStart(3,'0')}.mp4`;
                    const t = `trans_${i.toString().padStart(3,'0')}.mp4`;
                    await ff.exec(`-i ${c1} -i ${c2} -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${transitionDuration}:offset=0[outv]" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -y ${t}`);
                    concat += (i === 0 ? `file '${t}'\n` : `file '${t}'\n`);
                }
                const last = `clip_${(uploadedImages.length-1).toString().padStart(3,'0')}.mp4`;
                concat += `file '${last}'\n`;
                await ff.writeFile('concat.txt', concat);
                await ff.exec('-f concat -safe 0 -i concat.txt -c copy -y output.mp4');
            } else {
                await ff.exec(`-i clip_000.mp4 -c copy -y output.mp4`);
            }
            
            // Add audio
            if (enableAudio && enableAudio.checked && audioFile) {
                if (progressFill) progressFill.style.width = '98%';
                if (progressPercent) progressPercent.textContent = '98%';
                if (progressLabel) progressLabel.textContent = '🎵 Adding audio...';
                await ff.exec('-i output.mp4 -i audio.mp3 -c:v copy -c:a aac -shortest -y output_audio.mp4');
                await ff.exec('mv output_audio.mp4 output.mp4');
            }
            
            // Finalize
            if (progressFill) progressFill.style.width = '100%';
            if (progressPercent) progressPercent.textContent = '100%';
            if (progressLabel) progressLabel.textContent = '✅ Done!';
            
            const outputData = await ff.readFile('output.mp4');
            const blob = new Blob([outputData], { type: 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            if (fileSize) fileSize.textContent = `📦 Size: ${(blob.size / (1024*1024)).toFixed(2)} MB`;
            if (fileDuration) fileDuration.textContent = `⏱️ Duration: ${totalDuration.toFixed(1)} seconds`;
            
            if (downloadLink) {
                downloadLink.href = url;
                downloadLink.style.display = 'inline-block';
            }
            if (downloadSection) downloadSection.classList.add('show');
            
            showToast('🎉 Video created successfully!', 'success');
        } catch (error) {
            console.error('Video generation error:', error);
            showToast(`❌ Error: ${error.message || error}`, 'error');
        } finally {
            isProcessing = false;
            if (!downloadSection?.classList.contains('show')) {
                if (generateBtn) { generateBtn.disabled = !(uploadedImages.length >= 1 && ffmpegReady); generateBtn.textContent = '🎬 Generate Video'; }
            }
        }
    }

    // Reset
    function resetAll() {
        uploadedImages = [];
        captions = [];
        audioFile = null;
        if (audioInput) audioInput.value = '';
        if (overlayText) overlayText.value = '722 Yishun St 71 - ONLY $485,000';
        if (enableText) enableText.checked = true;
        if (textOptions) textOptions.classList.add('show');
        if (enableAudio) enableAudio.checked = false;
        if (audioOptions) audioOptions.classList.remove('show');
        if (imagePreview) { imagePreview.innerHTML = ''; imagePreview.style.display = 'none'; }
        if (countEl) countEl.textContent = '0';
        if (downloadSection) downloadSection.classList.remove('show');
        if (downloadLink) downloadLink.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        if (generateBtn) { generateBtn.disabled = true; generateBtn.textContent = '🎬 Generate Video'; }
        if (durationSlider) durationSlider.value = '3';
        if (durationValue) durationValue.textContent = '3 seconds';
        if (transitionSlider) transitionSlider.value = '0.5';
        if (transitionValue) transitionValue.textContent = '0.5 seconds';
        if (resolutionSelect) resolutionSelect.value = '1920x1080';
        showStatus('Ready', 'idle');
    }

    // Event listeners
    if (generateBtn) generateBtn.addEventListener('click', generateVideo);
    if (document.getElementById('resetBtn')) document.getElementById('resetBtn').addEventListener('click', resetAll);

    // Start
    showStatus('Initializing FFmpeg...', 'loading');
    await initFFmpeg();
});

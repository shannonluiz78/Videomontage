/**
 * Real Estate Video Maker - Client-side video generation using FFmpeg.wasm
 * All processing happens in the browser - no server uploads
 * 
 * FFmpeg library loaded from CDN: https://unpkg.com/@ffmpeg/ffmpeg@0.11.0/dist/ffmpeg.min.js
 * Core files served locally from /js/ directory
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Check if FFmpeg library loaded
    if (typeof FFmpeg === 'undefined' && typeof self !== 'undefined' && typeof self.FFmpeg !== 'undefined') {
        window.FFmpeg = self.FFmpeg;
    }
    
    if (typeof FFmpeg === 'undefined') {
        console.error('FFmpeg library not loaded');
        showStatus('FFmpeg library not loaded ❌', 'error');
        return;
    }

    console.log('FFmpeg library loaded:', typeof FFmpeg, FFmpeg);
    
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
            if (imagePreview) imagePreview.style.display = 'none';
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
        dropzone.addEventListener('click', () => fileInput?.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => { 
            e.preventDefault(); 
            dropzone.classList.remove('dragover'); 
            handleFiles(e.dataTransfer.files); 
        });
    }
    if (fileInput) fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); fileInput.value = ''; });

    // Generate video function (placeholder)
    async function generateVideo() {
        if (!ffmpegReady) {
            showToast('❌ FFmpeg not loaded yet. Please wait...', 'error');
            return;
        }
        if (uploadedImages.length === 0) {
            showToast('❌ No images uploaded', 'error');
            return;
        }
        
        showToast('⏳ Generating video... This may take a while', 'info');
        // Actual video generation would go here
    }

    if (generateBtn) generateBtn.addEventListener('click', generateVideo);
    if (document.getElementById('resetBtn')) document.getElementById('resetBtn').addEventListener('click', () => {
        uploadedImages = [];
        captions = [];
        if (audioInput) audioInput.value = '';
        if (overlayText) overlayText.value = '722 Yishun St 71 - ONLY $485,000';
        if (enableText) enableText.checked = true;
        if (textOptions) textOptions.classList.add('show');
        if (enableAudio) enableAudio.checked = false;
        if (audioOptions) audioOptions.classList.remove('show');
        if (imagePreview) { imagePreview.innerHTML = ''; imagePreview.style.display = 'none'; }
        if (countEl) countEl.textContent = '0';
        if (downloadSection) downloadSection.classList.remove('show');
        if (generateBtn) { generateBtn.disabled = true; generateBtn.textContent = '🎬 Generate Video'; }
        if (durationSlider) durationSlider.value = '3';
        if (durationValue) durationValue.textContent = '3 seconds';
        if (transitionSlider) transitionSlider.value = '0.5';
        if (transitionValue) transitionValue.textContent = '0.5 seconds';
        if (resolutionSelect) resolutionSelect.value = '1920x1080';
        showStatus('Ready', 'idle');
    });

    // Initialize FFmpeg
    async function initFFmpeg() {
        try {
            showStatus('Loading FFmpeg core (~30MB)...', 'loading');
            if (progressContainer) progressContainer.style.display = 'block';
            if (progressFill) progressFill.style.width = '30%';
            if (progressPercent) progressPercent.textContent = '30%';
            if (progressLabel) progressLabel.textContent = '📥 Downloading FFmpeg...';
            if (generateBtn) generateBtn.disabled = true;
            
            console.log('Creating FFmpeg instance...');
            console.log('FFmpeg type:', typeof FFmpeg);
            console.log('FFmpeg prototype:', FFmpeg?.prototype);
            
            // Try to create instance
            const ff = new FFmpeg();
            window.ffmpeg = ff;
            
            console.log('FFmpeg instance created:', ff);
            
            // Load from local files
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
            
            showStatus('FFmpeg failed ❌', 'error');
            showToast(`Failed to load video processor: ${ffmpegLoadError}`, 'error');
            if (progressContainer) progressContainer.style.display = 'none';
            if (generateBtn) generateBtn.disabled = true;
        }
    }

    // Start
    showStatus('Initializing FFmpeg...', 'loading');
    await initFFmpeg();
});

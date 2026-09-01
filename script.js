/**
 * Real Estate Video Maker
 * FFmpeg.wasm-based video generation in browser
 * 
 * Load order: FFmpeg library (UMD) → This script
 */

(function() {
    'use strict';
    
    function init() {
        console.log('[RealEstateVideoMaker] Initializing...');
        
        const FFmpegLib = window.FFmpeg;
        console.log('[RealEstateVideoMaker] FFmpeg library loaded:', typeof FFmpegLib);
        
        if (!FFmpegLib) {
            console.error('[RealEstateVideoMaker] FFmpeg library not found!');
            showError('FFmpeg library failed to load. Check browser console (F12).');
            return;
        }
        
        console.log('[RealEstateVideoMaker] Creating FFmpeg instance...');
        
        const ffmpeg = new FFmpegLib();
        window.ffmpeg = ffmpeg;
        console.log('[RealEstateVideoMaker] FFmpeg instance:', ffmpeg);
        
        // State
        let uploadedImages = [];
        let audioFile = null;
        let isProcessing = false;
        let ffmpegReady = false;
        let captions = [];
        
        // DOM refs
        const els = {
            dropzone: document.getElementById('dropzone'),
            fileInput: document.getElementById('fileInput'),
            countEl: document.getElementById('count'),
            imagePreview: document.getElementById('imagePreview'),
            durationSlider: document.getElementById('duration'),
            durationValue: document.getElementById('durationValue'),
            transitionSlider: document.getElementById('transition'),
            transitionValue: document.getElementById('transitionValue'),
            resolutionSelect: document.getElementById('resolution'),
            enableText: document.getElementById('enableText'),
            textOptions: document.getElementById('textOptions'),
            overlayText: document.getElementById('overlayText'),
            textPreview: document.getElementById('textPreview'),
            enableAudio: document.getElementById('enableAudio'),
            audioOptions: document.getElementById('audioOptions'),
            audioInput: document.getElementById('audioInput'),
            generateBtn: document.getElementById('generateBtn'),
            progressContainer: document.getElementById('progressContainer'),
            progressFill: document.getElementById('progressFill'),
            progressLabel: document.getElementById('progressLabel'),
            progressPercent: document.getElementById('progressPercent'),
            downloadSection: document.getElementById('downloadSection'),
            fileSize: document.getElementById('fileSize'),
            fileDuration: document.getElementById('fileDuration'),
            statusBadge: document.getElementById('statusBadge'),
            toast: document.getElementById('toast'),
            resetBtn: document.getElementById('resetBtn')
        };
        
        // UI helpers
        function setStatus(msg, type) {
            if (!els.statusBadge) return;
            els.statusBadge.textContent = msg;
            els.statusBadge.className = `status-badge status-${type}`;
        }
        
        let toastTimer;
        function showToast(msg, type = 'info') {
            if (!els.toast) return;
            if (toastTimer) clearTimeout(toastTimer);
            els.toast.textContent = msg;
            els.toast.className = `toast toast-${type} show`;
            toastTimer = setTimeout(() => els.toast.classList.remove('show'), 4000);
        }
        
        function showError(msg) {
            setStatus('FFmpeg failed ❌', 'error');
            showToast(msg, 'error');
            if (els.progressContainer) els.progressContainer.style.display = 'none';
            if (els.generateBtn) els.generateBtn.disabled = true;
        }
        
        // Update progress UI
        function updateProgress(percent, label) {
            if (els.progressFill) els.progressFill.style.width = `${percent}%`;
            if (els.progressPercent) els.progressPercent.textContent = `${Math.round(percent)}%`;
            if (els.progressLabel) els.progressLabel.textContent = label || 'Processing...';
        }
        
        // FFmpeg load with progress
        async function loadFFmpeg() {
            try {
                setStatus('Loading FFmpeg core...', 'loading');
                if (els.progressContainer) els.progressContainer.style.display = 'block';
                updateProgress(10, 'Starting download...');
                
                console.log('[RealEstateVideoMaker] Loading FFmpeg core...');
                
                await ffmpeg.load({
                    coreURL: './js/ffmpeg-core.js',
                    wasmURL: './js/ffmpeg-core.wasm',
                    progress: (res) => {
                        if (res.total !== undefined && res.total > 0) {
                            const percent = Math.round((res.loaded / res.total) * 100);
                            updateProgress(percent, `Downloading FFmpeg core... ${percent}%`);
                            console.log(`[RealEstateVideoMaker] Download progress: ${percent}%`);
                        } else {
                            updateProgress(50, 'Processing FFmpeg core...');
                        }
                    }
                });
                
                ffmpegReady = true;
                console.log('[RealEstateVideoMaker] FFmpeg loaded successfully!');
                setStatus('FFmpeg ready ✓', 'success');
                updateProgress(100, '✅ FFmpeg loaded!');
                
                setTimeout(() => {
                    if (els.progressContainer) els.progressContainer.style.display = 'none';
                    setStatus('Ready to create videos', 'idle');
                }, 1500);
                
                checkGenerateEnabled();
            } catch (err) {
                console.error('[RealEstateVideoMaker] FFmpeg load error:', err);
                ffmpegReady = false;
                showError(`FFmpeg load failed: ${err.message || err}`);
            }
        }
        
        function checkGenerateEnabled() {
            if (!els.generateBtn) return;
            els.generateBtn.disabled = !(uploadedImages.length >= 1 && ffmpegReady);
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
                els.countEl.textContent = '0';
                if (els.imagePreview) els.imagePreview.style.display = 'none';
            }
        }
        
        function updatePreview() {
            if (!els.imagePreview) return;
            els.imagePreview.innerHTML = '';
            els.countEl.textContent = uploadedImages.length;
            if (uploadedImages.length === 0) {
                els.imagePreview.style.display = 'none';
                return;
            }
            els.imagePreview.style.display = 'grid';
            
            uploadedImages.forEach((file, index) => {
                const item = document.createElement('div');
                item.className = 'preview-item';
                item.innerHTML = `
                    <img src="${URL.createObjectURL(file)}" alt="Image ${index + 1}" style="width:100%;height:100%;object-fit:cover;">
                    <button class="remove-btn" title="Remove">×</button>
                    <div class="caption-badge">${captions[index] || 'Add caption...'}</div>
                    <div style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;">${index + 1}</div>
                `;
                item.querySelector('.remove-btn').onclick = (e) => { e.stopPropagation(); removeImage(index); };
                item.onclick = () => editCaption(index);
                item.style.cursor = 'pointer';
                els.imagePreview.appendChild(item);
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
        
        // Event listeners
        if (els.durationSlider) els.durationSlider.addEventListener('input', () => {
            if (els.durationValue) els.durationValue.textContent = `${els.durationSlider.value} seconds`;
        });
        if (els.transitionSlider) els.transitionSlider.addEventListener('input', () => {
            if (els.transitionValue) els.transitionValue.textContent = `${els.transitionSlider.value} seconds`;
        });
        if (els.enableText) els.enableText.addEventListener('change', () => {
            if (els.textOptions) els.textOptions.classList.toggle('show', els.enableText.checked);
        });
        if (els.enableAudio) els.enableAudio.addEventListener('change', () => {
            if (els.audioOptions) els.audioOptions.classList.toggle('show', els.enableAudio.checked);
        });
        if (els.overlayText) els.overlayText.addEventListener('input', () => {
            if (els.enableText && els.enableText.checked && els.textPreview) {
                els.textPreview.textContent = els.overlayText.value;
            }
        });
        if (els.audioInput) els.audioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                audioFile = e.target.files[0];
                showToast(`Audio loaded: ${audioFile.name}`, 'success');
            }
        });
        if (els.dropzone) {
            els.dropzone.addEventListener('click', () => els.fileInput?.click());
            els.dropzone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropzone.classList.add('dragover'); });
            els.dropzone.addEventListener('dragleave', () => els.dropzone.classList.remove('dragover'));
            els.dropzone.addEventListener('drop', (e) => { 
                e.preventDefault(); 
                els.dropzone.classList.remove('dragover'); 
                handleFiles(e.dataTransfer.files); 
            });
        }
        if (els.fileInput) els.fileInput.addEventListener('change', (e) => { 
            handleFiles(e.target.files); 
            els.fileInput.value = ''; 
        });
        
        if (els.generateBtn) els.generateBtn.addEventListener('click', () => {
            if (!ffmpegReady) {
                showToast('❌ FFmpeg not loaded yet. Please wait...', 'error');
                return;
            }
            if (uploadedImages.length === 0) {
                showToast('❌ No images uploaded', 'error');
                return;
            }
            showToast('⏳ Generating video... This may take a while', 'info');
        });
        
        if (els.resetBtn) els.resetBtn.addEventListener('click', () => {
            uploadedImages = [];
            captions = [];
            audioFile = null;
            if (els.audioInput) els.audioInput.value = '';
            if (els.overlayText) els.overlayText.value = '722 Yishun St 71 - ONLY $485,000';
            if (els.enableText) els.enableText.checked = true;
            if (els.textOptions) els.textOptions.classList.add('show');
            if (els.enableAudio) els.enableAudio.checked = false;
            if (els.audioOptions) els.audioOptions.classList.remove('show');
            if (els.imagePreview) { els.imagePreview.innerHTML = ''; els.imagePreview.style.display = 'none'; }
            if (els.countEl) els.countEl.textContent = '0';
            if (els.downloadSection) els.downloadSection.classList.remove('show');
            if (els.generateBtn) { els.generateBtn.disabled = true; els.generateBtn.textContent = '🎬 Generate Video'; }
            if (els.durationSlider) els.durationSlider.value = '3';
            if (els.durationValue) els.durationValue.textContent = '3 seconds';
            if (els.transitionSlider) els.transitionSlider.value = '0.5';
            if (els.transitionValue) els.transitionValue.textContent = '0.5 seconds';
            if (els.resolutionSelect) els.resolutionSelect.value = '1920x1080';
            setStatus('Ready', 'idle');
        });
        
        // Start
        console.log('[RealEstateVideoMaker] Starting FFmpeg load...');
        setStatus('Initializing...', 'loading');
        updateProgress(5, 'Starting...');
        loadFFmpeg();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
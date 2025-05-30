class AudioCaptioner {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.captionBtn = document.getElementById('captionBtn');
        this.captionsDisplay = document.getElementById('captionsDisplay');
        this.captionsHistory = document.getElementById('captionsHistory');
        this.playerSection = document.getElementById('playerSection');
        this.audioFile = document.getElementById('audioFile');
        
        this.recognition = null;
        this.isRecognizing = false;
        this.captionHistory = [];
        
        this.initializeEventListeners();
        this.initializeSpeechRecognition();
    }
    
    initializeEventListeners() {
        this.audioFile.addEventListener('change', (e) => this.handleFileUpload(e));
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.captionBtn.addEventListener('click', () => this.toggleCaptions());
        
        this.audioPlayer.addEventListener('play', () => this.updatePlayButton(false));
        this.audioPlayer.addEventListener('pause', () => this.updatePlayButton(true));
        this.audioPlayer.addEventListener('ended', () => {
            this.updatePlayButton(true);
            this.stopCaptions();
        });
    }
    
    initializeSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showError('Speech recognition is not supported in this browser.');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onresult = (event) => this.handleSpeechResult(event);
        this.recognition.onerror = (event) => this.handleSpeechError(event);
        this.recognition.onend = () => this.handleSpeechEnd();
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        this.audioPlayer.src = url;
        this.playerSection.classList.add('active');
        
        // Clear previous captions
        this.captionHistory = [];
        this.updateCaptionsDisplay('');
        this.updateCaptionsHistory();
    }
    
    togglePlayPause() {
        if (this.audioPlayer.paused) {
            this.audioPlayer.play();
        } else {
            this.audioPlayer.pause();
        }
    }
    
    updatePlayButton(isPaused) {
        const icon = this.playPauseBtn.querySelector('svg');
        if (isPaused) {
            icon.innerHTML = '<polygon points="5,3 19,12 5,21"></polygon>';
        } else {
            icon.innerHTML = '<rect x="4" y="3" width="4" height="18"></rect><rect x="12" y="3" width="4" height="18"></rect>';
        }
    }
    
    toggleCaptions() {
        if (this.isRecognizing) {
            this.stopCaptions();
        } else {
            this.startCaptions();
        }
    }
    
    startCaptions() {
        if (!this.recognition) {
            this.showError('Speech recognition is not available.');
            return;
        }
        
        try {
            this.recognition.start();
            this.isRecognizing = true;
            this.captionBtn.classList.add('active');
            this.captionBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                Stop Captions
            `;
            this.updateCaptionsDisplay('Listening...');
        } catch (error) {
            this.showError('Failed to start speech recognition: ' + error.message);
        }
    }
    
    stopCaptions() {
        if (this.recognition && this.isRecognizing) {
            this.recognition.stop();
        }
        this.isRecognizing = false;
        this.captionBtn.classList.remove('active');
        this.captionBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
            </svg>
            Start Captions
        `;
    }
    
    handleSpeechResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            this.addToCaptionHistory(finalTranscript);
            this.updateCaptionsDisplay(interimTranscript);
        } else {
            this.updateCaptionsDisplay(interimTranscript);
        }
    }
    
    handleSpeechError(event) {
        console.error('Speech recognition error:', event.error);
        this.showError('Speech recognition error: ' + event.error);
        this.stopCaptions();
    }
    
    handleSpeechEnd() {
        if (this.isRecognizing) {
            // Restart recognition if it ended unexpectedly
            setTimeout(() => {
                if (this.isRecognizing) {
                    try {
                        this.recognition.start();
                    } catch (error) {
                        console.error('Failed to restart recognition:', error);
                        this.stopCaptions();
                    }
                }
            }, 100);
        }
    }
    
    addToCaptionHistory(text) {
        const timestamp = this.formatTime(this.audioPlayer.currentTime);
        this.captionHistory.push({ text, timestamp });
        this.updateCaptionsHistory();
    }
    
    updateCaptionsDisplay(text) {
        if (text.trim()) {
            this.captionsDisplay.innerHTML = `<p class="current-caption">${text}</p>`;
        } else if (this.captionHistory.length === 0) {
            this.captionsDisplay.innerHTML = '<p class="placeholder-text">Captions will appear here when you start the captioning...</p>';
        } else {
            this.captionsDisplay.innerHTML = '<p class="placeholder-text">Listening for speech...</p>';
        }
    }
    
    updateCaptionsHistory() {
        this.captionsHistory.innerHTML = this.captionHistory
            .slice(-10) // Show last 10 captions
            .map(caption => `
                <div class="caption-item">
                    <strong>${caption.timestamp}:</strong> ${caption.text}
                </div>
            `).join('');
        
        // Scroll to bottom
        this.captionsHistory.scrollTop = this.captionsHistory.scrollHeight;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    showError(message) {
        this.updateCaptionsDisplay(`Error: ${message}`);
        console.error(message);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioCaptioner();
});


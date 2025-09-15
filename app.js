// Global variables
let currentRoomId = null;
let currentUser = 'User1';
let partner = 'User2';
let youtubePlayer = null;
let isPlayerReady = false;
let currentVideoId = null;
let isVideoCallActive = false;
let isAudioEnabled = true;
let isVideoEnabled = true;

// Sample data
const sampleMessages = [
    {
        userId: "User1",
        message: "Ready to start the movie?",
        timestamp: "2025-09-15T15:05:00Z"
    },
    {
        userId: "User2", 
        message: "Yes! Let's watch together 🍿",
        timestamp: "2025-09-15T15:05:15Z"
    }
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    setupEventListeners();
    showToast('Welcome to WatchTogether!', 'info');
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Landing page events
    const createBtn = document.getElementById('create-room-btn');
    const joinBtn = document.getElementById('join-room-btn');
    const roomInput = document.getElementById('room-id-input');
    
    if (createBtn) {
        createBtn.addEventListener('click', function(e) {
            console.log('Create room clicked');
            e.preventDefault();
            createRoom();
        });
    }
    
    if (joinBtn) {
        joinBtn.addEventListener('click', function(e) {
            console.log('Join room clicked');
            e.preventDefault();
            joinRoom();
        });
    }
    
    if (roomInput) {
        roomInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('Enter pressed in room input');
                joinRoom();
            }
        });
    }

    // Other event listeners will be set up when watch interface is shown
    setupWatchInterfaceListeners();
}

function setupWatchInterfaceListeners() {
    // Video controls
    const loadVideoBtn = document.getElementById('load-video-btn');
    const videoUrlInput = document.getElementById('video-url-input');
    const resyncBtn = document.getElementById('resync-btn');
    const copyBtn = document.getElementById('copy-room-id');
    
    if (loadVideoBtn) {
        loadVideoBtn.addEventListener('click', loadVideo);
    }
    
    if (videoUrlInput) {
        videoUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loadVideo();
        });
    }
    
    if (resyncBtn) {
        resyncBtn.addEventListener('click', resyncVideo);
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', copyRoomId);
    }

    // Chat events
    const sendBtn = document.getElementById('send-message-btn');
    const chatInput = document.getElementById('chat-input');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Video call events
    const startCallBtn = document.getElementById('start-video-call-btn');
    const closeCallBtn = document.getElementById('close-call-btn');
    const minimizeBtn = document.getElementById('minimize-call-btn');
    const toggleAudioBtn = document.getElementById('toggle-audio-btn');
    const toggleVideoBtn = document.getElementById('toggle-video-btn');
    
    if (startCallBtn) startCallBtn.addEventListener('click', startVideoCall);
    if (closeCallBtn) closeCallBtn.addEventListener('click', endVideoCall);
    if (minimizeBtn) minimizeBtn.addEventListener('click', toggleMinimizeCall);
    if (toggleAudioBtn) toggleAudioBtn.addEventListener('click', toggleAudio);
    if (toggleVideoBtn) toggleVideoBtn.addEventListener('click', toggleVideo);

    // Make video call window draggable
    const videoCallWindow = document.getElementById('video-call-window');
    if (videoCallWindow) makeElementDraggable(videoCallWindow);
}

// Room Management Functions
function createRoom() {
    console.log('Creating room...');
    
    try {
        const roomId = generateRoomId();
        currentRoomId = roomId;
        
        console.log('Generated room ID:', roomId);
        showLoading('Creating room...');
        
        // Short delay to show loading, then switch to watch interface
        setTimeout(function() {
            console.log('Switching to watch interface...');
            hideLoading();
            
            if (showWatchInterface()) {
                console.log('Watch interface shown successfully');
                updateConnectionStatus('connected');
                showToast('Room ' + roomId + ' created successfully!', 'success');
                
                // Simulate partner joining
                setTimeout(function() {
                    updatePartnerStatus('Partner joined the room');
                    loadSampleMessages();
                }, 2000);
            } else {
                console.error('Failed to show watch interface');
                showToast('Error creating room', 'error');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error in createRoom:', error);
        hideLoading();
        showToast('Error creating room', 'error');
    }
}

function joinRoom() {
    console.log('Joining room...');
    
    try {
        const roomInput = document.getElementById('room-id-input');
        if (!roomInput) {
            console.error('Room input not found');
            showToast('Room input not found', 'error');
            return;
        }
        
        const roomId = roomInput.value.trim().toUpperCase();
        console.log('Room ID entered:', roomId);
        
        if (!roomId) {
            showToast('Please enter a room ID', 'error');
            return;
        }
        
        if (roomId.length < 6) {
            showToast('Room ID must be at least 6 characters', 'error');
            return;
        }
        
        currentRoomId = roomId;
        showLoading('Joining room...');
        
        setTimeout(function() {
            console.log('Joining room with ID:', roomId);
            hideLoading();
            
            if (showWatchInterface()) {
                console.log('Successfully joined room');
                updateConnectionStatus('connected');
                showToast('Joined room ' + roomId + ' successfully!', 'success');
                
                setTimeout(function() {
                    loadSampleMessages();
                    updatePartnerStatus('Partner is online');
                }, 1000);
            } else {
                console.error('Failed to show watch interface');
                showToast('Error joining room', 'error');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error in joinRoom:', error);
        hideLoading();
        showToast('Error joining room', 'error');
    }
}

function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ROOM-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Interface Management
function showWatchInterface() {
    console.log('Attempting to show watch interface...');
    
    const landingPage = document.getElementById('landing-page');
    const watchInterface = document.getElementById('watch-interface');
    const roomIdDisplay = document.getElementById('current-room-id');
    
    if (!landingPage) {
        console.error('Landing page element not found');
        return false;
    }
    
    if (!watchInterface) {
        console.error('Watch interface element not found');
        return false;
    }
    
    if (!roomIdDisplay) {
        console.error('Room ID display element not found');
        return false;
    }
    
    if (!currentRoomId) {
        console.error('No current room ID set');
        return false;
    }
    
    // Hide landing page and show watch interface
    landingPage.style.display = 'none';
    watchInterface.style.display = 'flex';
    watchInterface.classList.remove('hidden');
    
    // Set room ID
    roomIdDisplay.textContent = currentRoomId;
    
    console.log('Interface switched successfully');
    return true;
}

function updateConnectionStatus(status) {
    const indicator = document.getElementById('connection-indicator');
    if (!indicator) return;
    
    const statusMap = {
        'connecting': { text: 'Connecting...', class: 'status status--info' },
        'connected': { text: 'Connected', class: 'status status--success' },
        'disconnected': { text: 'Disconnected', class: 'status status--error' }
    };
    
    const statusInfo = statusMap[status];
    if (statusInfo) {
        indicator.textContent = statusInfo.text;
        indicator.className = statusInfo.class;
    }
}

function updatePartnerStatus(status) {
    const partnerStatusEl = document.getElementById('partner-status');
    if (partnerStatusEl) {
        partnerStatusEl.textContent = status;
    }
}

function copyRoomId() {
    if (!currentRoomId) {
        showToast('No room ID to copy', 'error');
        return;
    }
    
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(currentRoomId).then(function() {
                showToast('Room ID copied to clipboard!', 'success');
            });
        } else {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = currentRoomId;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Room ID copied to clipboard!', 'success');
        }
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy room ID', 'error');
    }
}

// Video Functions
function loadVideo() {
    const urlInput = document.getElementById('video-url-input');
    if (!urlInput) {
        showToast('Video input not found', 'error');
        return;
    }
    
    const url = urlInput.value.trim();
    if (!url) {
        showToast('Please enter a YouTube URL', 'error');
        return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
        showToast('Invalid YouTube URL', 'error');
        return;
    }
    
    currentVideoId = videoId;
    showLoading('Loading video...');
    
    // Hide placeholder and show player container
    const placeholder = document.getElementById('video-placeholder');
    const playerDiv = document.getElementById('youtube-player');
    
    if (placeholder) placeholder.style.display = 'none';
    if (playerDiv) playerDiv.style.display = 'block';
    
    // Simulate video loading
    setTimeout(function() {
        hideLoading();
        showToast('Video loaded successfully!', 'success');
        updateSyncStatus('synced');
        
        // Initialize YouTube player if API is available
        if (typeof YT !== 'undefined' && YT.Player) {
            initializeYouTubePlayer(videoId);
        }
        
        // Simulate partner loading video
        setTimeout(function() {
            addChatMessage(partner, 'Video loaded! Ready to watch 🎬');
        }, 1000);
    }, 1500);
}

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function initializeYouTubePlayer(videoId) {
    try {
        youtubePlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
                autoplay: 0,
                controls: 1,
                enablejsapi: 1,
                modestbranding: 1
            },
            events: {
                onReady: function(event) {
                    isPlayerReady = true;
                    console.log('YouTube player ready');
                },
                onStateChange: function(event) {
                    console.log('Player state changed:', event.data);
                }
            }
        });
    } catch (error) {
        console.error('YouTube player initialization failed:', error);
    }
}

function resyncVideo() {
    showLoading('Re-syncing...');
    updateSyncStatus('syncing');
    
    setTimeout(function() {
        hideLoading();
        updateSyncStatus('synced');
        showToast('Video re-synchronized!', 'success');
    }, 1000);
}

function updateSyncStatus(status) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    
    const statusMap = {
        'syncing': { text: 'Syncing...', class: 'status status--warning' },
        'synced': { text: 'In Sync', class: 'status status--success' },
        'out-of-sync': { text: 'Out of Sync', class: 'status status--error' }
    };
    
    const statusInfo = statusMap[status];
    if (statusInfo) {
        indicator.textContent = statusInfo.text;
        indicator.className = statusInfo.class;
    }
}

// Chat Functions
function sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    addChatMessage(currentUser, message);
    input.value = '';
    
    // Simulate partner response
    setTimeout(function() {
        const responses = [
            'Agree!',
            'Great point!',
            '😂',
            'This part is so good!',
            'What do you think happens next?',
            'Love this scene!'
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addChatMessage(partner, randomResponse);
    }, 1000 + Math.random() * 2000);
}

function addChatMessage(userId, message, timestamp = null) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    const isOwnMessage = userId === currentUser;
    const messageTime = timestamp ? new Date(timestamp) : new Date();
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-user">${escapeHtml(userId)}</span>
            <span class="message-time">${messageTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div class="message-content ${isOwnMessage ? 'own-message' : ''}">${escapeHtml(message)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function loadSampleMessages() {
    sampleMessages.forEach(function(msg) {
        addChatMessage(msg.userId, msg.message, msg.timestamp);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Video Call Functions
function startVideoCall() {
    if (isVideoCallActive) {
        showToast('Video call already active', 'info');
        return;
    }
    
    showLoading('Starting video call...');
    
    setTimeout(function() {
        hideLoading();
        isVideoCallActive = true;
        
        const videoCallWindow = document.getElementById('video-call-window');
        const startBtn = document.getElementById('start-video-call-btn');
        
        if (videoCallWindow) videoCallWindow.classList.remove('hidden');
        if (startBtn) {
            startBtn.textContent = 'Video Call Active';
            startBtn.disabled = true;
        }
        
        showToast('Video call started!', 'success');
        addChatMessage(partner, 'Joined the video call! 📹');
        
        simulateVideoStreams();
    }, 1500);
}

function simulateVideoStreams() {
    // Show local video placeholder
    const localVideo = document.getElementById('local-video');
    if (localVideo) {
        localVideo.style.background = 'linear-gradient(45deg, #1FB8CD, #5D878F)';
        localVideo.style.display = 'flex';
        localVideo.style.alignItems = 'center';
        localVideo.style.justifyContent = 'center';
        localVideo.innerHTML = '<div style="color: white; font-weight: bold;">You</div>';
    }
    
    // Show remote video after delay
    setTimeout(function() {
        const placeholder = document.querySelector('.video-placeholder-call');
        const remoteVideo = document.getElementById('remote-video');
        
        if (placeholder) placeholder.style.display = 'none';
        if (remoteVideo) {
            remoteVideo.style.background = 'linear-gradient(45deg, #B4413C, #DB4545)';
            remoteVideo.style.display = 'flex';
            remoteVideo.style.alignItems = 'center';
            remoteVideo.style.justifyContent = 'center';
            remoteVideo.innerHTML = '<div style="color: white; font-weight: bold;">Partner</div>';
        }
    }, 1000);
}

function endVideoCall() {
    isVideoCallActive = false;
    
    const videoCallWindow = document.getElementById('video-call-window');
    const startBtn = document.getElementById('start-video-call-btn');
    
    if (videoCallWindow) videoCallWindow.classList.add('hidden');
    if (startBtn) {
        startBtn.textContent = 'Start Video Call';
        startBtn.disabled = false;
    }
    
    showToast('Video call ended', 'info');
    addChatMessage(partner, 'Left the video call');
}

function toggleMinimizeCall() {
    const callWindow = document.getElementById('video-call-window');
    const btn = document.getElementById('minimize-call-btn');
    
    if (callWindow && btn) {
        callWindow.classList.toggle('minimized');
        btn.textContent = callWindow.classList.contains('minimized') ? '+' : '−';
    }
}

function toggleAudio() {
    isAudioEnabled = !isAudioEnabled;
    const btn = document.getElementById('toggle-audio-btn');
    
    if (btn) {
        btn.classList.toggle('active', isAudioEnabled);
        const icon = btn.querySelector('.control-icon');
        if (icon) {
            icon.textContent = isAudioEnabled ? '🎤' : '🔇';
        }
    }
    
    showToast(isAudioEnabled ? 'Audio enabled' : 'Audio muted', 'info');
}

function toggleVideo() {
    isVideoEnabled = !isVideoEnabled;
    const btn = document.getElementById('toggle-video-btn');
    
    if (btn) {
        btn.classList.toggle('active', isVideoEnabled);
        const icon = btn.querySelector('.control-icon');
        if (icon) {
            icon.textContent = isVideoEnabled ? '📹' : '📷';
        }
    }
    
    const localVideo = document.getElementById('local-video');
    if (localVideo) {
        localVideo.style.display = isVideoEnabled ? 'flex' : 'none';
    }
    
    showToast(isVideoEnabled ? 'Video enabled' : 'Video disabled', 'info');
}

// Utility Functions
function showLoading(message = 'Loading...') {
    const loadingMessage = document.getElementById('loading-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (loadingMessage) loadingMessage.textContent = message;
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(function() {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
}

function makeElementDraggable(element) {
    if (!element) return;
    
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = element.querySelector('.video-call-header');
    
    if (header) {
        header.style.cursor = 'move';
        header.onmousedown = function(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = function() {
                document.onmouseup = null;
                document.onmousemove = null;
            };
            document.onmousemove = function(e) {
                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;
                
                const newTop = element.offsetTop - pos2;
                const newLeft = element.offsetLeft - pos1;
                
                element.style.top = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight)) + "px";
                element.style.left = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth)) + "px";
            };
        };
    }
}
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

const firebaseConfig = {
  apiKey: "AIzaSyDXjTWrvSZWZvQ8eHlLSCDbF16LmN4-t9U",
  authDomain: "watching-together-65150.firebaseapp.com",
  projectId: "watching-together-65150",
  storageBucket: "watching-together-65150.firebasestorage.app",
  messagingSenderId: "735510866371",
  appId: "1:735510866371:web:a58ba3f66966420dc8f576"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing app...');
  setupEventListeners();
  hideLoading();
  showToast('Welcome to WatchTogether!', 'info');
});

function setupEventListeners() {
  const createBtn = document.getElementById('create-room-btn');
  const joinBtn = document.getElementById('join-room-btn');
  const roomInput = document.getElementById('room-id-input');

  if (createBtn) {
      createBtn.addEventListener('click', function(e) {
          e.preventDefault();
          createRoom();
      });
  }
  if (joinBtn) {
      joinBtn.addEventListener('click', function(e) {
          e.preventDefault();
          joinRoom();
      });
  }
  if (roomInput) {
      roomInput.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') joinRoom();
      });
  }
  setupWatchInterfaceListeners();
}

function setupWatchInterfaceListeners() {
  const loadVideoBtn = document.getElementById('load-video-btn');
  const videoUrlInput = document.getElementById('video-url-input');
  const resyncBtn = document.getElementById('resync-btn');
  const copyBtn = document.getElementById('copy-room-id');
  if (loadVideoBtn) loadVideoBtn.addEventListener('click', loadVideo);
  if (videoUrlInput) videoUrlInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadVideo(); });
  if (resyncBtn) resyncBtn.addEventListener('click', resyncVideo);
  if (copyBtn) copyBtn.addEventListener('click', copyRoomId);

  const sendBtn = document.getElementById('send-message-btn');
  const chatInput = document.getElementById('chat-input');
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

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

  const videoCallWindow = document.getElementById('video-call-window');
  if (videoCallWindow) makeElementDraggable(videoCallWindow);
}

function createRoom() {
  try {
    const roomId = generateRoomId();
    currentRoomId = roomId;
    showLoading('Creating room...');
    setTimeout(() => {
      hideLoading();
      if (showWatchInterface()) {
        updateConnectionStatus('connected');
        showToast('Room ' + roomId + ' created successfully!', 'success');
        setupFirebaseListeners();
      } else {
        showToast('Error creating room', 'error');
      }
    }, 300);
  } catch (error) {
    console.error('Error in createRoom:', error);
    hideLoading();
    showToast('Error creating room', 'error');
  }
}

function joinRoom() {
  try {
    const roomInput = document.getElementById('room-id-input');
    if (!roomInput) {
      showToast('Room input not found', 'error');
      return;
    }
    const roomId = roomInput.value.trim().toUpperCase();
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
    setTimeout(() => {
      hideLoading();
      if (showWatchInterface()) {
        updateConnectionStatus('connected');
        showToast('Joined room ' + roomId + ' successfully!', 'success');
        setupFirebaseListeners();
      } else {
        showToast('Error joining room', 'error');
      }
    }, 300);
  } catch (error) {
    console.error('Error in joinRoom:', error);
    hideLoading();
    showToast('Error joining room', 'error');
  }
}

function setupFirebaseListeners() {
  const roomRef = database.ref('rooms/' + currentRoomId);

  roomRef.child('videoState').on('value', snapshot => {
    const state = snapshot.val();
    if (!state || !youtubePlayer) return;

    if (state.videoId !== currentVideoId) {
      currentVideoId = state.videoId;
      youtubePlayer.loadVideoById(currentVideoId);
    }

    const playerState = youtubePlayer.getPlayerState();
    if (state.isPlaying && playerState !== YT.PlayerState.PLAYING) {
      youtubePlayer.seekTo(state.currentTime, true);
      youtubePlayer.playVideo();
    } else if (!state.isPlaying && playerState === YT.PlayerState.PLAYING) {
      youtubePlayer.pauseVideo();
      youtubePlayer.seekTo(state.currentTime, true);
    }
  });

  roomRef.child('messages').on('child_added', snapshot => {
    const msg = snapshot.val();
    if (msg) {
      addChatMessage(msg.userId, msg.message, msg.timestamp);
    }
  });
}

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ROOM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function showWatchInterface() {
  const landingPage = document.getElementById('landing-page');
  const watchInterface = document.getElementById('watch-interface');
  const roomIdDisplay = document.getElementById('current-room-id');

  if (!landingPage || !watchInterface || !roomIdDisplay || !currentRoomId) return false;

  landingPage.style.display = 'none';
  watchInterface.style.display = 'flex';
  watchInterface.classList.remove('hidden');
  roomIdDisplay.textContent = currentRoomId;

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

function copyRoomId() {
  if (!currentRoomId) {
    showToast('No room ID to copy', 'error');
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentRoomId).then(() => showToast('Room ID copied to clipboard!', 'success'));
  } else {
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
}

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

  const placeholder = document.getElementById('video-placeholder');
  const playerDiv = document.getElementById('youtube-player');
  if (placeholder) placeholder.style.display = 'none';
  if (playerDiv) playerDiv.style.display = 'block';

  setTimeout(() => {
    hideLoading();
    showToast('Video loaded successfully!', 'success');
    updateSyncStatus('synced');

    if (typeof YT !== 'undefined' && YT.Player) {
      initializeYouTubePlayer(videoId);
    }

    const roomRef = database.ref('rooms/' + currentRoomId + '/videoState');
    roomRef.set({
      videoId: currentVideoId,
      isPlaying: false,
      currentTime: 0
    });
  }, 1500);
}

function extractVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function initializeYouTubePlayer(videoId) {
  try {
    if (youtubePlayer) {
      youtubePlayer.loadVideoById(videoId);
      return;
    }
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
        onStateChange: onPlayerStateChange
      }
    });
  } catch (error) {
    console.error('YouTube player initialization failed:', error);
  }
}

function onPlayerStateChange(event) {
  if (!currentRoomId) return;

  const roomRef = database.ref('rooms/' + currentRoomId + '/videoState');
  const playerState = event.data;

  if (playerState === YT.PlayerState.PLAYING) {
    roomRef.set({
      videoId: currentVideoId,
      isPlaying: true,
      currentTime: youtubePlayer.getCurrentTime()
    });
  } else if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED) {
    roomRef.update({
      isPlaying: false,
      currentTime: youtubePlayer.getCurrentTime()
    });
  }
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;

  const message = input.value.trim();
  if (!message || !currentRoomId) return;

  const messagesRef = database.ref('rooms/' + currentRoomId + '/messages');
  const msgObj = {
    userId: currentUser,
    message: message,
    timestamp: Date.now()
  };

  messagesRef.push(msgObj);
  input.value = '';
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function resyncVideo() {
  showLoading('Re-syncing...');
  updateSyncStatus('syncing');

  setTimeout(() => {
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

// Video Call Functions

function startVideoCall() {
  if (isVideoCallActive) {
    showToast('Video call already active', 'info');
    return;
  }

  showLoading('Starting video call...');

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      hideLoading();
      isVideoCallActive = true;

      const videoCallWindow = document.getElementById('video-call-window');
      const localVideo = document.getElementById('local-video');
      const startBtn = document.getElementById('start-video-call-btn');

      if (videoCallWindow) videoCallWindow.classList.remove('hidden');

      if (localVideo) {
        localVideo.srcObject = stream;
        localVideo.play();
      }

      if (startBtn) {
        startBtn.textContent = 'Video Call Active';
        startBtn.disabled = true;
      }

      showToast('Video call started!', 'success');
      addChatMessage(partner, 'Joined the video call! 📹');

      window.localStream = stream;
    })
    .catch(error => {
      hideLoading();
      showToast('Failed to access camera/mic: ' + error.message, 'error');
    });
}

function endVideoCall() {
  isVideoCallActive = false;

  const videoCallWindow = document.getElementById('video-call-window');
  const localVideo = document.getElementById('local-video');
  const startBtn = document.getElementById('start-video-call-btn');

  if (videoCallWindow) videoCallWindow.classList.add('hidden');

  if (localVideo) {
    localVideo.pause();
    localVideo.srcObject = null;
  }

  if (startBtn) {
    startBtn.textContent = 'Start Video Call';
    startBtn.disabled = false;
  }

  if (window.localStream) {
    window.localStream.getTracks().forEach(track => track.stop());
    window.localStream = null;
  }

  showToast('Video call ended', 'info');
  addChatMessage(partner, 'Left the video call');
}

function toggleAudio() {
  if (!window.localStream) return;

  isAudioEnabled = !isAudioEnabled;
  window.localStream.getAudioTracks().forEach(track => track.enabled = isAudioEnabled);

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
  if (!window.localStream) return;

  isVideoEnabled = !isVideoEnabled;
  window.localStream.getVideoTracks().forEach(track => track.enabled = isVideoEnabled);

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
    localVideo.style.display = isVideoEnabled ? 'block' : 'none';
  }

  showToast(isVideoEnabled ? 'Video enabled' : 'Video disabled', 'info');
}

function toggleMinimizeCall() {
  const callWindow = document.getElementById('video-call-window');
  const btn = document.getElementById('minimize-call-btn');

  if (callWindow && btn) {
    callWindow.classList.toggle('minimized');
    btn.textContent = callWindow.classList.contains('minimized') ? '+' : '−';
  }
}

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

  setTimeout(() => {
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
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    const winHeight = window.innerHeight;
    const winWidth = window.innerWidth;
    element.style.top = Math.max(0, Math.min(element.offsetTop - pos2, winHeight - element.offsetHeight)) + "px";
    element.style.left = Math.max(0, Math.min(element.offsetLeft - pos1, winWidth - element.offsetWidth)) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

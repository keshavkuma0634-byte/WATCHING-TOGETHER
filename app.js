// WatchTogether App - Complete & Fixed Implementation
class WatchTogetherApp {
    constructor() {
        // Core state
        this.currentUser = null;
        this.currentRoom = null;
        this.isCreator = false;
        this.youtubePlayer = null;
        this.localStream = null;

        // Data structures
        this.roomMembers = new Map();
        this.pendingRequests = new Map();
        this.sessionHistory = [];

        // Ensure Firebase is loaded before initializing
        if (typeof firebase === 'undefined') {
            console.error('Firebase not loaded! Make sure Firebase scripts are included.');
            return;
        }

        // Initialize Firebase and setup
        this.initializeFirebase();
        this.setupEventListeners();
        this.checkAuthState();
    }

    initializeFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyDXjTWrvSZWZvQ8eHlLSCDbF16LmN4-t9U",
            authDomain: "watching-together-65150.firebaseapp.com",
            databaseURL: "https://watching-together-65150-default-rtdb.asia-southeast1.firebasedatabase.app/",
            projectId: "watching-together-65150",
            storageBucket: "watching-together-65150.firebasestorage.app",
            messagingSenderId: "735510866371",
            appId: "1:735510866371:web:a58ba3f66966420dc8f576"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        this.auth = firebase.auth();
        this.database = firebase.database();

        console.log('🔥 Firebase initialized successfully');
    }

    setupEventListeners() {
        // Wait for DOM to be ready
        const addEventListenerSafe = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element ${id} not found for event listener`);
            }
        };

        // Auth events
        addEventListenerSafe('send-magic-link-btn', 'click', () => this.sendMagicLink());
        addEventListenerSafe('anonymous-signin-btn', 'click', () => this.signInAnonymously());
        addEventListenerSafe('creator-code-btn', 'click', () => this.signInWithCreatorCode());
        addEventListenerSafe('sign-out-btn', 'click', () => this.signOut());

        // Room events
        addEventListenerSafe('create-room-btn', 'click', () => this.createRoom());
        addEventListenerSafe('join-room-btn', 'click', () => this.joinRoom());
        addEventListenerSafe('leave-room-btn', 'click', () => this.leaveRoom());

        // Room controls
        addEventListenerSafe('copy-room-id-btn', 'click', () => this.copyRoomId());
        addEventListenerSafe('share-room-btn', 'click', () => this.shareRoom());

        // Video events
        addEventListenerSafe('load-video-btn', 'click', () => this.loadVideo());
        addEventListenerSafe('sync-video-btn', 'click', () => this.syncVideo());

        // Chat events
        addEventListenerSafe('send-chat-btn', 'click', () => this.sendMessage());
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Video call events
        addEventListenerSafe('video-call-btn', 'click', () => this.startVideoCall());
        addEventListenerSafe('end-call-btn', 'click', () => this.endVideoCall());
        addEventListenerSafe('toggle-mic-btn', 'click', () => this.toggleMicrophone());
        addEventListenerSafe('toggle-cam-btn', 'click', () => this.toggleCamera());
        addEventListenerSafe('close-call-btn', 'click', () => this.endVideoCall());
        addEventListenerSafe('minimize-call-btn', 'click', () => this.minimizeVideoCall());

        // Join request modal events
        addEventListenerSafe('approve-request-btn', 'click', () => this.approveJoinRequest());
        addEventListenerSafe('reject-request-btn', 'click', () => this.rejectJoinRequest());

        // Make video call window draggable
        const callWindow = document.getElementById('video-call-window');
        if (callWindow) {
            this.makeElementDraggable(callWindow);
        }

        console.log('✅ Event listeners setup complete');
    }

    // Authentication Methods
    checkAuthState() {
        this.showLoading('Checking authentication...');

        // Check if this is a magic link
        if (this.auth.isSignInWithEmailLink(window.location.href)) {
            this.handleMagicLinkSignIn();
            return;
        }

        // Check current auth state
        this.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? user.uid : 'No user');
            this.hideLoading();

            if (user) {
                this.currentUser = user;
                this.showApp();
                this.showToast(`Welcome back, ${this.getDisplayName()}!`, 'success');
            } else {
                this.showAuth();
            }
        });
    }

    async sendMagicLink() {
        const email = document.getElementById('email-input').value.trim();
        if (!email) {
            this.showToast('Please enter your email', 'error');
            return;
        }

        const actionCodeSettings = {
            url: window.location.href,
            handleCodeInApp: true
        };

        try {
            this.showLoading('Sending magic link...');
            await this.auth.sendSignInLinkToEmail(email, actionCodeSettings);
            localStorage.setItem('emailForSignIn', email);
            this.hideLoading();
            this.showToast('Magic link sent! Check your email.', 'success');
        } catch (error) {
            this.hideLoading();
            console.error('Magic link error:', error);
            if (error.code === 'auth/quota-exceeded') {
                this.showToast('Email quota exceeded. Try anonymous sign-in or wait 24 hours.', 'warning');
            } else {
                this.showToast('Error: ' + error.message, 'error');
            }
        }
    }

    async handleMagicLinkSignIn() {
        let email = localStorage.getItem('emailForSignIn');
        if (!email) {
            email = prompt('Please provide your email for confirmation');
        }

        try {
            this.showLoading('Signing in...');
            await this.auth.signInWithEmailLink(email, window.location.href);
            localStorage.removeItem('emailForSignIn');
            window.history.replaceState({}, document.title, window.location.pathname);
            this.hideLoading();
            this.showToast('Successfully signed in!', 'success');
        } catch (error) {
            this.hideLoading();
            console.error('Magic link sign-in error:', error);
            this.showToast('Sign in error: ' + error.message, 'error');
        }
    }

    async signInAnonymously() {
        try {
            this.showLoading('Signing in as guest...');
            await this.auth.signInAnonymously();
            this.hideLoading();
            this.showToast('Signed in as guest!', 'success');
        } catch (error) {
            this.hideLoading();
            console.error('Anonymous sign-in error:', error);
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    async signInWithCreatorCode() {
        const code = document.getElementById('creator-code-input').value.trim();
        if (!code) {
            this.showToast('Please enter creator code', 'error');
            return;
        }

        // Valid creator codes
        const VALID_CREATOR_CODES = ['CREATOR2024', 'ADMIN123', 'MASTER001'];

        if (VALID_CREATOR_CODES.includes(code.toUpperCase())) {
            try {
                this.showLoading('Verifying creator code...');
                await this.auth.signInAnonymously();
                // Mark as creator - this is client-side only for UI
                this.currentUser.isCreatorByCode = true;
                this.currentUser.creatorCode = code.toUpperCase();
                this.hideLoading();
                this.showToast('Signed in as creator!', 'success');
            } catch (error) {
                this.hideLoading();
                console.error('Creator code sign-in error:', error);
                this.showToast('Error: ' + error.message, 'error');
            }
        } else {
            this.showToast('Invalid creator code', 'error');
        }
    }

    signOut() {
        // Clean up before signing out
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        this.auth.signOut();
        this.currentUser = null;
        this.currentRoom = null;
        this.isCreator = false;
        this.roomMembers.clear();
        this.pendingRequests.clear();

        this.showAuth();
        this.showToast('Signed out successfully', 'info');
    }

    // Room Management - FIXED VERSION
    async createRoom() {
        console.log('🎪 Creating room...');

        // Check if user is authorized to create rooms
        if (!this.isAuthorizedCreator()) {
            this.showToast('Only authorized creators can create rooms', 'error');
            return;
        }

        const maxUsers = parseInt(document.getElementById('max-users-input').value) || 4;
        const roomId = this.generateRoomId();

        // Get current user - CRITICAL: Use fresh Firebase Auth user
        const user = this.auth.currentUser;
        if (!user) {
            this.showToast('User not authenticated!', 'error');
            return;
        }

        console.log('👤 Current user UID:', user.uid);
        console.log('📧 Current user email:', user.email);

        try {
            this.showLoading('Creating room...');

            // Room data structure - EXACTLY what Firebase expects
            const roomData = {
                id: roomId,
                creator: user.uid,  // CRITICAL: Must match auth.uid in rules
                creatorEmail: user.email || 'Anonymous Creator',
                maxUsers: maxUsers,
                createdAt: Date.now(),
                users: {
                    [user.uid]: {
                        email: user.email || 'Anonymous',
                        displayName: this.getDisplayName(),
                        joinedAt: Date.now(),
                        approved: true,
                        isCreator: true
                    }
                },
                joinRequests: {},
                videoState: {
                    videoId: null,
                    isPlaying: false,
                    currentTime: 0,
                    lastUpdated: Date.now()
                },
                messages: {},
                history: {}
            };

            console.log('📝 Room data to write:', roomData);
            console.log('🔑 Creator UID in data:', roomData.creator);

            // Write to Firebase Database
            await this.database.ref(`rooms/${roomId}`).set(roomData);

            // Success! Setup local state
            this.currentRoom = roomId;
            this.isCreator = true;

            this.hideLoading();
            this.showWatchInterface();
            this.setupRoomListeners();

            this.showToast(`🎉 Room ${roomId} created successfully!`, 'success');
            this.addSystemMessage(`Room ${roomId} created by ${this.getDisplayName()}`);

            console.log('✅ Room created successfully:', roomId);

        } catch (error) {
            this.hideLoading();
            console.error('❌ Room creation error:', error);

            // Detailed error message
            if (error.code === 'PERMISSION_DENIED') {
                this.showToast('Permission denied. Check your authentication and try again.', 'error');
                console.error('PERMISSION_DENIED: Likely auth.uid !== creator field or rules misconfigured');
            } else {
                this.showToast('Error creating room: ' + error.message, 'error');
            }
        }
    }

    async joinRoom() {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        if (!roomId) {
            this.showToast('Please enter a room ID', 'error');
            return;
        }

        if (!this.currentUser) {
            this.showToast('Please sign in first', 'error');
            return;
        }

        try {
            this.showLoading('Checking room...');
            const roomSnapshot = await this.database.ref(`rooms/${roomId}`).once('value');
            const roomData = roomSnapshot.val();

            if (!roomData) {
                this.hideLoading();
                this.showToast('Room not found', 'error');
                return;
            }

            // Check if already in room and approved
            if (roomData.users && roomData.users[this.currentUser.uid]) {
                if (roomData.users[this.currentUser.uid].approved) {
                    this.currentRoom = roomId;
                    this.isCreator = (roomData.creator === this.currentUser.uid);
                    this.hideLoading();
                    this.showWatchInterface();
                    this.setupRoomListeners();
                    this.showToast('Rejoined room!', 'success');
                    return;
                }
            }

            // Check room capacity
            const approvedUserCount = Object.values(roomData.users || {}).filter(user => user.approved).length;
            if (approvedUserCount >= roomData.maxUsers) {
                this.hideLoading();
                this.showToast('Room is full', 'error');
                return;
            }

            // Send join request
            await this.database.ref(`rooms/${roomId}/joinRequests/${this.currentUser.uid}`).set({
                email: this.currentUser.email || 'Anonymous',
                displayName: this.getDisplayName(),
                requestedAt: Date.now(),
                status: 'pending'
            });

            this.hideLoading();
            this.showToast('Join request sent. Waiting for approval...', 'warning');
            this.currentRoom = roomId;
            this.setupJoinRequestListener();

        } catch (error) {
            this.hideLoading();
            console.error('Join room error:', error);
            this.showToast('Error joining room: ' + error.message, 'error');
        }
    }

    async leaveRoom() {
        if (!this.currentRoom || !this.currentUser) return;

        try {
            // Remove user from room
            await this.database.ref(`rooms/${this.currentRoom}/users/${this.currentUser.uid}`).remove();

            // Add to history if creator
            if (this.isCreator) {
                this.addSystemMessage(`${this.getDisplayName()} left the room`);
            }

            this.currentRoom = null;
            this.isCreator = false;
            this.showLandingPage();
            this.showToast('Left the room', 'info');
        } catch (error) {
            console.error('Leave room error:', error);
            this.showToast('Error leaving room: ' + error.message, 'error');
        }
    }

    // Video Management
    async loadVideo() {
        const url = document.getElementById('video-url-input').value.trim();
        if (!url) {
            this.showToast('Please enter a YouTube URL', 'error');
            return;
        }

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.showToast('Invalid YouTube URL', 'error');
            return;
        }

        if (!this.currentRoom || !this.currentUser) {
            this.showToast('Please join a room first', 'error');
            return;
        }

        try {
            this.showLoading('Loading video...');

            // Initialize YouTube player if not exists
            if (!this.youtubePlayer) {
                await this.initializeYouTubePlayer();
            }

            // Load video
            this.youtubePlayer.loadVideoById(videoId);

            // Update database
            await this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
                videoId: videoId,
                isPlaying: false,
                currentTime: 0,
                lastUpdated: Date.now(),
                updatedBy: this.currentUser.uid
            });

            this.hideLoading();
            this.showToast('Video loaded successfully!', 'success');
            this.addSystemMessage(`${this.getDisplayName()} loaded a new video`);

            // Clear input
            document.getElementById('video-url-input').value = '';

        } catch (error) {
            this.hideLoading();
            console.error('Load video error:', error);
            this.showToast('Error loading video: ' + error.message, 'error');
        }
    }

    async syncVideo() {
        if (!this.youtubePlayer || !this.currentRoom || !this.currentUser) {
            this.showToast('Video player not ready', 'error');
            return;
        }

        try {
            const currentTime = this.youtubePlayer.getCurrentTime();
            const isPlaying = this.youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;

            await this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
                currentTime: currentTime,
                isPlaying: isPlaying,
                lastUpdated: Date.now(),
                updatedBy: this.currentUser.uid
            });

            this.showToast('Video synchronized!', 'success');
            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Sync video error:', error);
            this.showToast('Error syncing video: ' + error.message, 'error');
        }
    }

    initializeYouTubePlayer() {
        return new Promise((resolve, reject) => {
            if (typeof YT === 'undefined') {
                reject(new Error('YouTube API not loaded'));
                return;
            }

            const playerDiv = document.getElementById('youtube-player');
            const placeholder = document.getElementById('video-placeholder');

            if (!playerDiv) {
                reject(new Error('YouTube player element not found'));
                return;
            }

            placeholder.style.display = 'none';
            playerDiv.style.display = 'block';

            try {
                this.youtubePlayer = new YT.Player('youtube-player', {
                    height: '100%',
                    width: '100%',
                    playerVars: {
                        autoplay: 0,
                        controls: 1,
                        enablejsapi: 1,
                        modestbranding: 1,
                        rel: 0
                    },
                    events: {
                        onReady: () => {
                            console.log('YouTube player ready');
                            resolve();
                        },
                        onStateChange: (event) => this.onPlayerStateChange(event),
                        onError: (event) => {
                            console.error('YouTube player error:', event);
                            this.showToast('Video player error', 'error');
                        }
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    onPlayerStateChange(event) {
        if (!this.currentRoom || !this.currentUser) return;

        const state = event.data;
        let isPlaying = false;

        if (state === YT.PlayerState.PLAYING) {
            isPlaying = true;
        } else if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.ENDED) {
            isPlaying = false;
        }

        // Debounce updates to prevent spam
        clearTimeout(this.stateUpdateTimeout);
        this.stateUpdateTimeout = setTimeout(() => {
            if (this.currentRoom && this.currentUser) {
                this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
                    isPlaying: isPlaying,
                    currentTime: this.youtubePlayer.getCurrentTime(),
                    lastUpdated: Date.now(),
                    updatedBy: this.currentUser.uid
                });
            }
        }, 1000);
    }

    syncToVideoState(videoState) {
        if (!this.youtubePlayer || !videoState) return;

        // Don't sync if this user made the change
        if (videoState.updatedBy === this.currentUser.uid) return;

        try {
            if (videoState.videoId) {
                const currentVideoData = this.youtubePlayer.getVideoData();
                if (currentVideoData && currentVideoData.video_id !== videoState.videoId) {
                    this.youtubePlayer.loadVideoById(videoState.videoId);
                    return; // Don't sync time on new video load
                }
            }

            const currentTime = this.youtubePlayer.getCurrentTime();
            const timeDiff = Math.abs(currentTime - videoState.currentTime);

            // Only sync if time difference is significant
            if (timeDiff > 3) {
                this.youtubePlayer.seekTo(videoState.currentTime, true);
            }

            // Sync play state
            if (videoState.isPlaying) {
                if (this.youtubePlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                    this.youtubePlayer.playVideo();
                }
            } else {
                if (this.youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING) {
                    this.youtubePlayer.pauseVideo();
                }
            }

            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('Sync error:', error);
            this.updateSyncStatus('error');
        }
    }

    // Chat System
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || !this.currentRoom || !this.currentUser) return;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/messages`).push({
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email || 'Anonymous',
                displayName: this.getDisplayName(),
                message: message,
                timestamp: Date.now(),
                isSystem: false
            });

            input.value = '';
        } catch (error) {
            console.error('Send message error:', error);
            this.showToast('Error sending message: ' + error.message, 'error');
        }
    }

    async addSystemMessage(message) {
        if (!this.currentRoom) return;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/messages`).push({
                userId: 'system',
                displayName: 'System',
                message: message,
                timestamp: Date.now(),
                isSystem: true
            });
        } catch (error) {
            console.error('System message error:', error);
        }
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';

        if (message.isSystem) {
            messageDiv.classList.add('system');
            messageDiv.innerHTML = `<div class="message-content">${this.escapeHtml(message.message)}</div>`;
        } else {
            if (message.userId === this.currentUser.uid) {
                messageDiv.classList.add('own');
            }

            const time = new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit', 
                minute: '2-digit'
            });

            messageDiv.innerHTML = `
                <div class="message-header">${this.escapeHtml(message.displayName)} • ${time}</div>
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Video Call System
    async startVideoCall() {
        try {
            this.showLoading('Starting video call...');

            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }

            const callWindow = document.getElementById('video-call-window');
            if (callWindow) {
                callWindow.classList.remove('hidden');
            }

            this.hideLoading();

            if (this.currentRoom) {
                this.addSystemMessage(`${this.getDisplayName()} started a video call`);
            }
            this.showToast('Video call started!', 'success');

        } catch (error) {
            this.hideLoading();
            console.error('Video call error:', error);
            this.showToast('Error accessing camera/microphone: ' + error.message, 'error');
        }
    }

    endVideoCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        const callWindow = document.getElementById('video-call-window');
        if (callWindow) {
            callWindow.classList.add('hidden');
        }

        if (this.currentRoom) {
            this.addSystemMessage(`${this.getDisplayName()} ended the video call`);
        }
        this.showToast('Video call ended', 'info');
    }

    toggleMicrophone() {
        if (!this.localStream) return;

        const audioTracks = this.localStream.getAudioTracks();
        const btn = document.getElementById('toggle-mic-btn');

        if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });

            if (btn) {
                btn.classList.toggle('active', audioTracks[0].enabled);
                btn.textContent = audioTracks[0].enabled ? '🎤' : '🔇';
            }
        }
    }

    toggleCamera() {
        if (!this.localStream) return;

        const videoTracks = this.localStream.getVideoTracks();
        const btn = document.getElementById('toggle-cam-btn');
        const localVideo = document.getElementById('local-video');

        if (videoTracks.length > 0) {
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });

            if (btn) {
                btn.classList.toggle('active', videoTracks[0].enabled);
                btn.textContent = videoTracks[0].enabled ? '📹' : '📷';
            }

            if (localVideo) {
                localVideo.style.display = videoTracks[0].enabled ? 'block' : 'none';
            }
        }
    }

    minimizeVideoCall() {
        const callWindow = document.getElementById('video-call-window');
        const btn = document.getElementById('minimize-call-btn');

        if (callWindow && btn) {
            callWindow.classList.toggle('minimized');
            btn.textContent = callWindow.classList.contains('minimized') ? '+' : '−';
        }
    }

    // Room Listeners and Updates
    setupRoomListeners() {
        if (!this.currentRoom) return;

        console.log('🎧 Setting up room listeners for:', this.currentRoom);

        const roomRef = this.database.ref(`rooms/${this.currentRoom}`);

        // Video state sync
        roomRef.child('videoState').on('value', (snapshot) => {
            const videoState = snapshot.val();
            if (videoState) {
                this.syncToVideoState(videoState);
            }
        });

        // New messages
        roomRef.child('messages').on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message) {
                this.displayMessage(message);
            }
        });

        // User changes
        roomRef.child('users').on('value', (snapshot) => {
            const users = snapshot.val() || {};
            this.updateMembersList(users);
            this.updateViewerCount(Object.keys(users).length);
        });

        // Join requests (if creator)
        if (this.isCreator) {
            roomRef.child('joinRequests').on('child_added', (snapshot) => {
                const request = snapshot.val();
                const userId = snapshot.key;

                if (request && request.status === 'pending') {
                    this.showJoinRequestModal(userId, request);
                    this.updatePendingRequestsList();
                }
            });
        }
    }

    setupJoinRequestListener() {
        if (!this.currentRoom || !this.currentUser) return;

        this.database.ref(`rooms/${this.currentRoom}/joinRequests/${this.currentUser.uid}`)
            .on('value', (snapshot) => {
                const request = snapshot.val();
                if (request) {
                    if (request.status === 'approved') {
                        this.showToast('Join request approved!', 'success');
                        this.showWatchInterface();
                        this.setupRoomListeners();
                    } else if (request.status === 'rejected') {
                        this.showToast('Join request rejected', 'error');
                        this.showLandingPage();
                        this.currentRoom = null;
                    }
                }
            });
    }

    async approveJoinRequest() {
        const modal = document.getElementById('join-request-modal');
        const userId = modal.dataset.userId;
        const request = this.pendingRequests.get(userId);

        if (!request) return;

        try {
            // Add user to room
            await this.database.ref(`rooms/${this.currentRoom}/users/${userId}`).set({
                email: request.email,
                displayName: request.displayName,
                joinedAt: Date.now(),
                approved: true,
                isCreator: false
            });

            // Update request status
            await this.database.ref(`rooms/${this.currentRoom}/joinRequests/${userId}`).update({
                status: 'approved'
            });

            this.addSystemMessage(`${request.displayName} joined the room`);
            this.hideJoinRequestModal();
            this.showToast('User approved and added to room', 'success');

        } catch (error) {
            console.error('Approve request error:', error);
            this.showToast('Error approving user: ' + error.message, 'error');
        }
    }

    async rejectJoinRequest() {
        const modal = document.getElementById('join-request-modal');
        const userId = modal.dataset.userId;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/joinRequests/${userId}`).update({
                status: 'rejected'
            });

            this.hideJoinRequestModal();
            this.showToast('Join request rejected', 'warning');

        } catch (error) {
            console.error('Reject request error:', error);
            this.showToast('Error rejecting user: ' + error.message, 'error');
        }
    }

    // UI Management
    showAuth() {
        const authPanel = document.getElementById('auth-panel');
        const appPanel = document.getElementById('app-panel');

        if (authPanel) authPanel.classList.remove('hidden');
        if (appPanel) appPanel.classList.add('hidden');
    }

    showApp() {
        const authPanel = document.getElementById('auth-panel');
        const appPanel = document.getElementById('app-panel');

        if (authPanel) authPanel.classList.add('hidden');
        if (appPanel) appPanel.classList.remove('hidden');

        // Update user display
        const displayName = this.getDisplayName();
        const userDisplayName = document.getElementById('user-display-name');
        if (userDisplayName) {
            userDisplayName.textContent = displayName;
        }

        // Show/hide creator section
        const creatorSection = document.getElementById('creator-section');
        const userRoleBadge = document.getElementById('user-role-badge');

        if (this.isAuthorizedCreator()) {
            if (creatorSection) creatorSection.classList.remove('hidden');
            if (userRoleBadge) {
                userRoleBadge.textContent = 'Creator';
                userRoleBadge.className = 'badge creator';
            }
        } else {
            if (creatorSection) creatorSection.classList.add('hidden');
            if (userRoleBadge) {
                userRoleBadge.textContent = 'Member';
                userRoleBadge.className = 'badge member';
            }
        }

        this.showLandingPage();
    }

    showLandingPage() {
        const landingPage = document.getElementById('landing-page');
        const watchInterface = document.getElementById('watch-interface');

        if (landingPage) landingPage.classList.remove('hidden');
        if (watchInterface) watchInterface.classList.add('hidden');
    }

    showWatchInterface() {
        const landingPage = document.getElementById('landing-page');
        const watchInterface = document.getElementById('watch-interface');

        if (landingPage) landingPage.classList.add('hidden');
        if (watchInterface) watchInterface.classList.remove('hidden');

        // Update room display
        const roomIdDisplay = document.getElementById('current-room-id');
        if (roomIdDisplay) {
            roomIdDisplay.textContent = this.currentRoom;
        }

        // Show creator controls if creator
        const creatorControls = document.getElementById('creator-controls');
        if (this.isCreator && creatorControls) {
            creatorControls.classList.remove('hidden');
            this.updatePendingRequestsList();
        } else if (creatorControls) {
            creatorControls.classList.add('hidden');
        }
    }

    showJoinRequestModal(userId, request) {
        const modal = document.getElementById('join-request-modal');
        const requesterName = document.getElementById('requester-name');

        if (modal && requesterName) {
            modal.dataset.userId = userId;
            this.pendingRequests.set(userId, request);

            requesterName.textContent = request.displayName || request.email;
            modal.classList.remove('hidden');
        }
    }

    hideJoinRequestModal() {
        const modal = document.getElementById('join-request-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    updateMembersList(users) {
        const membersList = document.getElementById('members-list');
        if (!membersList) return;

        membersList.innerHTML = '';

        Object.entries(users).forEach(([userId, userData]) => {
            if (userData.approved) {
                const memberDiv = document.createElement('div');
                memberDiv.className = 'member-item';
                memberDiv.innerHTML = `
                    <div class="member-info">
                        <div class="member-name">${this.escapeHtml(userData.displayName || userData.email)}</div>
                        <div class="member-role">${userData.isCreator ? 'Creator' : 'Member'}</div>
                    </div>
                `;
                membersList.appendChild(memberDiv);
            }
        });
    }

    updateViewerCount(count) {
        const viewersCount = document.getElementById('viewers-count');
        if (viewersCount) {
            viewersCount.textContent = `👥 ${count} viewer${count !== 1 ? 's' : ''}`;
        }
    }

    updatePendingRequestsList() {
        if (!this.isCreator) return;

        const requestsList = document.getElementById('pending-requests-list');
        if (!requestsList) return;

        // Clear existing requests
        requestsList.innerHTML = '';

        let hasPending = false;
        this.pendingRequests.forEach((request, userId) => {
            if (request.status === 'pending') {
                hasPending = true;
                const requestDiv = document.createElement('div');
                requestDiv.className = 'request-item';
                requestDiv.innerHTML = `
                    <span>${this.escapeHtml(request.displayName || request.email)}</span>
                    <div class="request-actions">
                        <button class="small primary" onclick="app.approveSpecificRequest('${userId}')">Approve</button>
                        <button class="small danger" onclick="app.rejectSpecificRequest('${userId}')">Reject</button>
                    </div>
                `;
                requestsList.appendChild(requestDiv);
            }
        });

        if (!hasPending) {
            requestsList.innerHTML = '<p class="no-requests">No pending requests</p>';
        }
    }

    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-status');
        if (!indicator) return;

        const statusMap = {
            'ready': { text: '⚡ Ready', class: 'status status-info' },
            'syncing': { text: '🔄 Syncing...', class: 'status status-warning' },
            'synced': { text: '✅ Synced', class: 'status status-success' },
            'error': { text: '❌ Error', class: 'status status-error' }
        };

        const statusInfo = statusMap[status] || statusMap.ready;
        indicator.textContent = statusInfo.text;
        indicator.className = statusInfo.class;
    }

    // Utility Methods
    copyRoomId() {
        if (!this.currentRoom) return;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(this.currentRoom).then(() => {
                this.showToast('Room ID copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to copy room ID', 'error');
            });
        } else {
            // Fallback for older browsers
            this.showToast('Room ID: ' + this.currentRoom, 'info');
        }
    }

    shareRoom() {
        if (!this.currentRoom) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom}`;
        const shareText = `Join me for a synchronized movie night! Room ID: ${this.currentRoom}`;

        if (navigator.share) {
            navigator.share({
                title: 'WatchTogether - Join my room!',
                text: shareText,
                url: shareUrl
            }).catch(() => {
                // Fallback to clipboard
                this.fallbackShare(shareUrl);
            });
        } else {
            this.fallbackShare(shareUrl);
        }
    }

    fallbackShare(shareUrl) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showToast('Share link copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast(`Share this link: ${shareUrl}`, 'info');
            });
        } else {
            this.showToast(`Share this link: ${shareUrl}`, 'info');
        }
    }

    isAuthorizedCreator() {
        // Check multiple creator authorization methods
        if (!this.currentUser) return false;

        // Method 1: Creator code (client-side UI only)
        if (this.currentUser.isCreatorByCode) return true;

        // Method 2: Email authorization
        const AUTHORIZED_CREATOR_EMAILS = ['keshavkuma0634@gmail.com'];
        if (this.currentUser.email && AUTHORIZED_CREATOR_EMAILS.includes(this.currentUser.email)) {
            return true;
        }

        // Method 3: UID authorization (for testing)
        const AUTHORIZED_CREATOR_UIDS = []; // Add your test UIDs here if needed
        if (AUTHORIZED_CREATOR_UIDS.includes(this.currentUser.uid)) {
            return true;
        }

        return false;
    }

    getDisplayName() {
        if (!this.currentUser) return 'Anonymous';

        if (this.currentUser.isCreatorByCode) {
            return `Creator (${this.currentUser.creatorCode})`;
        }

        if (this.currentUser.email && this.currentUser.email !== 'Anonymous') {
            return this.currentUser.email;
        }

        return `Guest-${this.currentUser.uid.slice(0, 6)}`;
    }

    generateRoomId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    makeElementDraggable(element) {
        if (!element) return;

        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = element.querySelector('.call-header');

        if (header) {
            header.style.cursor = 'move';
            header.onmousedown = (e) => {
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

            const newTop = Math.max(0, Math.min(element.offsetTop - pos2, winHeight - element.offsetHeight));
            const newLeft = Math.max(0, Math.min(element.offsetLeft - pos1, winWidth - element.offsetWidth));

            element.style.top = newTop + "px";
            element.style.left = newLeft + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    showLoading(message) {
        const loadingMessage = document.getElementById('loading-message');
        const loadingOverlay = document.getElementById('loading-overlay');

        if (loadingMessage) loadingMessage.textContent = message;
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);

        // Remove on click
        toast.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.remove();
            }
        });
    }

    // Global method access for onclick handlers
    approveSpecificRequest(userId) {
        const modal = document.getElementById('join-request-modal');
        if (modal) {
            modal.dataset.userId = userId;
            this.approveJoinRequest();
        }
    }

    rejectSpecificRequest(userId) {
        const modal = document.getElementById('join-request-modal');
        if (modal) {
            modal.dataset.userId = userId;
            this.rejectJoinRequest();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing WatchTogether App...');

    // Make app globally accessible
    window.app = new WatchTogetherApp();

    // Check for room parameter in URL for auto-join
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        const roomId = urlParams.get('room').toUpperCase();
        console.log('🔗 Room ID found in URL:', roomId);

        // Auto-fill room ID when user reaches landing page
        setTimeout(() => {
            const roomInput = document.getElementById('room-id-input');
            if (roomInput) {
                roomInput.value = roomId;
                window.app.showToast(`Room ID ${roomId} pre-filled from link!`, 'info');
            }
        }, 2000);
    }
});

// YouTube API ready callback
window.onYouTubeIframeAPIReady = () => {
    console.log('📺 YouTube API ready');
};

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (window.app) {
        window.app.showToast('An unexpected error occurred', 'error');
    }
});

// Handle page visibility change to pause video when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (window.app && window.app.youtubePlayer && document.visibilityState === 'hidden') {
        // Optionally pause when tab is hidden
        // window.app.youtubePlayer.pauseVideo();
    }
});

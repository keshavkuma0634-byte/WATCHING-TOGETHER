// WatchTogether App - Complete Secure Implementation
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
    }

    setupEventListeners() {
        // Auth events
        document.getElementById('send-magic-link-btn').addEventListener('click', () => this.sendMagicLink());
        document.getElementById('anonymous-signin-btn').addEventListener('click', () => this.signInAnonymously());
        document.getElementById('creator-code-btn').addEventListener('click', () => this.signInWithCreatorCode());
        document.getElementById('sign-out-btn').addEventListener('click', () => this.signOut());

        // Room events
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

        // Room controls
        document.getElementById('copy-room-id-btn').addEventListener('click', () => this.copyRoomId());
        document.getElementById('share-room-btn').addEventListener('click', () => this.shareRoom());

        // Video events
        document.getElementById('load-video-btn').addEventListener('click', () => this.loadVideo());
        document.getElementById('sync-video-btn').addEventListener('click', () => this.syncVideo());

        // Chat events
        document.getElementById('send-chat-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Video call events
        document.getElementById('video-call-btn').addEventListener('click', () => this.startVideoCall());
        document.getElementById('end-call-btn').addEventListener('click', () => this.endVideoCall());
        document.getElementById('toggle-mic-btn').addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('toggle-cam-btn').addEventListener('click', () => this.toggleCamera());
        document.getElementById('close-call-btn').addEventListener('click', () => this.endVideoCall());
        document.getElementById('minimize-call-btn').addEventListener('click', () => this.minimizeVideoCall());

        // Join request modal events
        document.getElementById('approve-request-btn').addEventListener('click', () => this.approveJoinRequest());
        document.getElementById('reject-request-btn').addEventListener('click', () => this.rejectJoinRequest());

        // Make video call window draggable
        this.makeElementDraggable(document.getElementById('video-call-window'));
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
            this.hideLoading();
            if (user) {
                this.currentUser = user;
                this.showApp();
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
            this.showToast('Error: ' + error.message, 'error');
        }
    }

    async signInWithCreatorCode() {
        const code = document.getElementById('creator-code-input').value.trim();
        if (!code) {
            this.showToast('Please enter creator code', 'error');
            return;
        }

        // For demo - in production, verify this server-side
        const VALID_CREATOR_CODES = ['CREATOR2024', 'ADMIN123', 'MASTER001'];

        if (VALID_CREATOR_CODES.includes(code.toUpperCase())) {
            try {
                this.showLoading('Verifying creator code...');
                await this.auth.signInAnonymously();
                // Mark as creator
                this.currentUser.isCreatorByCode = true;
                this.currentUser.creatorCode = code.toUpperCase();
                this.hideLoading();
                this.showToast('Signed in as creator!', 'success');
            } catch (error) {
                this.hideLoading();
                this.showToast('Error: ' + error.message, 'error');
            }
        } else {
            this.showToast('Invalid creator code', 'error');
        }
    }

    signOut() {
        this.auth.signOut();
        this.currentUser = null;
        this.currentRoom = null;
        this.isCreator = false;
        this.showAuth();
        this.showToast('Signed out', 'info');
    }

    // Room Management
  async createRoom() {
    if (!this.isAuthorizedCreator()) {
        this.showToast('Only authorized creators can create rooms', 'error');
        return;
    }
    const maxUsers = parseInt(document.getElementById('max-users-input').value) || 4;
    const roomId = this.generateRoomId();
    const user = firebase.auth().currentUser;
    if (!user) {
        this.showToast('User not authenticated!', 'error');
        return;
    }
    try {
        this.showLoading('Creating room...');
        const roomData = {
            id: roomId,
            creator: user.uid,              // Use freshly fetched Firebase Auth user
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
        await this.database.ref(`rooms/${roomId}`).set(roomData);
        this.currentRoom = roomId;
        this.isCreator = true;
        this.hideLoading();
        this.showWatchInterface();
        this.setupRoomListeners();
        this.showToast(`Room ${roomId} created!`, 'success');
        this.addToHistory(`Room created by ${this.getDisplayName()}`);
    } catch (error) {
        this.hideLoading();
        this.showToast('Error creating room: ' + error.message, 'error');
    }
}


    async joinRoom() {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        if (!roomId) {
            this.showToast('Please enter a room ID', 'error');
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
            this.showToast('Error joining room: ' + error.message, 'error');
        }
    }

    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            // Remove user from room
            await this.database.ref(`rooms/${this.currentRoom}/users/${this.currentUser.uid}`).remove();

            // Add to history
            this.addToHistory(`${this.getDisplayName()} left the room`);

            this.currentRoom = null;
            this.isCreator = false;
            this.showLandingPage();
            this.showToast('Left the room', 'info');
        } catch (error) {
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

        try {
            this.showLoading('Loading video...');

            // Initialize YouTube player if not exists
            if (!this.youtubePlayer) {
                await this.initializeYouTubePlayer();
            }

            // Load video and update database
            this.youtubePlayer.loadVideoById(videoId);

            await this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
                videoId: videoId,
                isPlaying: false,
                currentTime: 0,
                lastUpdated: Date.now(),
                updatedBy: this.currentUser.uid
            });

            this.hideLoading();
            this.showToast('Video loaded!', 'success');
            this.addToHistory(`${this.getDisplayName()} loaded a new video`);
            this.addSystemMessage(`${this.getDisplayName()} loaded a new video`);

            document.getElementById('video-url-input').value = '';

        } catch (error) {
            this.hideLoading();
            this.showToast('Error loading video: ' + error.message, 'error');
        }
    }

    async syncVideo() {
        if (!this.youtubePlayer || !this.currentRoom) return;

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
            this.showToast('Error syncing video: ' + error.message, 'error');
        }
    }

    initializeYouTubePlayer() {
        return new Promise((resolve) => {
            const playerDiv = document.getElementById('youtube-player');
            const placeholder = document.getElementById('video-placeholder');

            placeholder.style.display = 'none';
            playerDiv.style.display = 'block';

            this.youtubePlayer = new YT.Player('youtube-player', {
                height: '100%',
                width: '100%',
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    enablejsapi: 1,
                    modestbranding: 1
                },
                events: {
                    onReady: () => resolve(),
                    onStateChange: (event) => this.onPlayerStateChange(event)
                }
            });
        });
    }

    onPlayerStateChange(event) {
        if (!this.currentRoom) return;

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
            this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
                isPlaying: isPlaying,
                currentTime: this.youtubePlayer.getCurrentTime(),
                lastUpdated: Date.now(),
                updatedBy: this.currentUser.uid
            });
        }, 500);
    }

    syncToVideoState(videoState) {
        if (!this.youtubePlayer || !videoState) return;

        // Don't sync if this user made the change
        if (videoState.updatedBy === this.currentUser.uid) return;

        try {
            if (videoState.videoId) {
                const currentVideoId = this.youtubePlayer.getVideoData().video_id;
                if (currentVideoId !== videoState.videoId) {
                    this.youtubePlayer.loadVideoById(videoState.videoId);
                    return; // Don't sync time on new video load
                }
            }

            const currentTime = this.youtubePlayer.getCurrentTime();
            const timeDiff = Math.abs(currentTime - videoState.currentTime);

            // Only sync if time difference is significant
            if (timeDiff > 2) {
                this.youtubePlayer.seekTo(videoState.currentTime, true);
            }

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

        if (!message || !this.currentRoom) return;

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
            console.error('Error adding system message:', error);
        }
    }

    displayMessage(message) {
        const messagesContainer = document.getElementById('chat-messages');
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
            localVideo.srcObject = this.localStream;

            document.getElementById('video-call-window').classList.remove('hidden');
            this.hideLoading();

            this.addSystemMessage(`${this.getDisplayName()} started a video call`);
            this.showToast('Video call started!', 'success');

        } catch (error) {
            this.hideLoading();
            this.showToast('Error accessing camera/microphone: ' + error.message, 'error');
        }
    }

    endVideoCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        document.getElementById('video-call-window').classList.add('hidden');
        this.addSystemMessage(`${this.getDisplayName()} ended the video call`);
        this.showToast('Video call ended', 'info');
    }

    toggleMicrophone() {
        if (!this.localStream) return;

        const audioTracks = this.localStream.getAudioTracks();
        const btn = document.getElementById('toggle-mic-btn');

        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        btn.classList.toggle('active', audioTracks[0]?.enabled);
        btn.textContent = audioTracks[0]?.enabled ? '🎤' : '🔇';
    }

    toggleCamera() {
        if (!this.localStream) return;

        const videoTracks = this.localStream.getVideoTracks();
        const btn = document.getElementById('toggle-cam-btn');

        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        btn.classList.toggle('active', videoTracks[0]?.enabled);
        btn.textContent = videoTracks[0]?.enabled ? '📹' : '📷';

        const localVideo = document.getElementById('local-video');
        localVideo.style.display = videoTracks[0]?.enabled ? 'block' : 'none';
    }

    minimizeVideoCall() {
        const callWindow = document.getElementById('video-call-window');
        const btn = document.getElementById('minimize-call-btn');

        callWindow.classList.toggle('minimized');
        btn.textContent = callWindow.classList.contains('minimized') ? '+' : '−';
    }

    // Room Listeners and Updates
    setupRoomListeners() {
        if (!this.currentRoom) return;

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
        if (!this.currentRoom) return;

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
            await this.database.ref(`rooms/${this.currentRoom}/users/${userId}`).set({
                email: request.email,
                displayName: request.displayName,
                joinedAt: Date.now(),
                approved: true,
                isCreator: false
            });

            await this.database.ref(`rooms/${this.currentRoom}/joinRequests/${userId}`).update({
                status: 'approved'
            });

            this.addSystemMessage(`${request.displayName} joined the room`);
            this.addToHistory(`${request.displayName} was approved and joined`);
            this.hideJoinRequestModal();
            this.showToast('User approved', 'success');

        } catch (error) {
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
            this.showToast('User rejected', 'warning');

        } catch (error) {
            this.showToast('Error rejecting user: ' + error.message, 'error');
        }
    }

    // UI Management
    showAuth() {
        document.getElementById('auth-panel').classList.remove('hidden');
        document.getElementById('app-panel').classList.add('hidden');
    }

    showApp() {
        document.getElementById('auth-panel').classList.add('hidden');
        document.getElementById('app-panel').classList.remove('hidden');

        // Update user display
        const displayName = this.getDisplayName();
        document.getElementById('user-display-name').textContent = displayName;

        // Show/hide creator section
        const creatorSection = document.getElementById('creator-section');
        const userRoleBadge = document.getElementById('user-role-badge');

        if (this.isAuthorizedCreator()) {
            creatorSection.classList.remove('hidden');
            userRoleBadge.textContent = 'Creator';
            userRoleBadge.className = 'badge creator';
        } else {
            creatorSection.classList.add('hidden');
            userRoleBadge.textContent = 'Member';
            userRoleBadge.className = 'badge member';
        }

        this.showLandingPage();
    }

    showLandingPage() {
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('watch-interface').classList.add('hidden');
    }

    showWatchInterface() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('watch-interface').classList.remove('hidden');

        // Update room display
        document.getElementById('current-room-id').textContent = this.currentRoom;

        // Show creator controls if creator
        const creatorControls = document.getElementById('creator-controls');
        if (this.isCreator) {
            creatorControls.classList.remove('hidden');
            this.updatePendingRequestsList();
            this.updateSessionHistory();
        } else {
            creatorControls.classList.add('hidden');
        }
    }

    showJoinRequestModal(userId, request) {
        const modal = document.getElementById('join-request-modal');
        modal.dataset.userId = userId;
        this.pendingRequests.set(userId, request);

        document.getElementById('requester-name').textContent = request.displayName || request.email;
        modal.classList.remove('hidden');
    }

    hideJoinRequestModal() {
        document.getElementById('join-request-modal').classList.add('hidden');
    }

    updateMembersList(users) {
        const membersList = document.getElementById('members-list');
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
        document.getElementById('viewers-count').textContent = `👥 ${count} viewer${count !== 1 ? 's' : ''}`;
    }

    updatePendingRequestsList() {
        if (!this.isCreator) return;

        const requestsList = document.getElementById('pending-requests-list');
        requestsList.innerHTML = '';

        this.pendingRequests.forEach((request, userId) => {
            if (request.status === 'pending') {
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
    }

    updateSessionHistory() {
        if (!this.isCreator) return;

        const historyLog = document.getElementById('session-history');
        historyLog.innerHTML = '';

        this.sessionHistory.slice(-10).forEach(entry => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = `${new Date(entry.timestamp).toLocaleTimeString()} - ${entry.message}`;
            historyLog.appendChild(historyItem);
        });
    }

    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-status');
        if (!indicator) return;

        const statusMap = {
            'ready': { text: 'Ready', class: 'status status-info' },
            'syncing': { text: 'Syncing...', class: 'status status-warning' },
            'synced': { text: 'Synced', class: 'status status-success' },
            'error': { text: 'Error', class: 'status status-error' }
        };

        const statusInfo = statusMap[status] || statusMap.ready;
        indicator.textContent = statusInfo.text;
        indicator.className = statusInfo.class;
    }

    // Utility Methods
    copyRoomId() {
        if (!this.currentRoom) return;

        navigator.clipboard.writeText(this.currentRoom).then(() => {
            this.showToast('Room ID copied!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy room ID', 'error');
        });
    }

    shareRoom() {
        if (!this.currentRoom) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom}`;

        if (navigator.share) {
            navigator.share({
                title: 'Join my WatchTogether room!',
                text: `Join me for a movie night! Room ID: ${this.currentRoom}`,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showToast('Share link copied!', 'success');
            }).catch(() => {
                this.showToast('Room ID: ' + this.currentRoom, 'info');
            });
        }
    }

    addToHistory(message) {
        this.sessionHistory.push({
            message: message,
            timestamp: Date.now()
        });

        if (this.isCreator) {
            this.updateSessionHistory();

            // Also save to Firebase for persistence
            this.database.ref(`rooms/${this.currentRoom}/history`).push({
                message: message,
                timestamp: Date.now()
            });
        }
    }

    isAuthorizedCreator() {
        // Check multiple creator authorization methods
        if (!this.currentUser) return false;

        // Method 1: Creator code
        if (this.currentUser.isCreatorByCode) return true;

        // Method 2: Email authorization (replace with your email)
        const AUTHORIZED_CREATOR_EMAILS = ['keshavkuma0634@gmail.com'];
        if (this.currentUser.email && AUTHORIZED_CREATOR_EMAILS.includes(this.currentUser.email)) {
            return true;
        }

        // Method 3: UID authorization (for anonymous users)
        const AUTHORIZED_CREATOR_UIDS = ['DONCHANDU12']; // Add your test UIDs here
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

            element.style.top = Math.max(0, Math.min(element.offsetTop - pos2, winHeight - element.offsetHeight)) + "px";
            element.style.left = Math.max(0, Math.min(element.offsetLeft - pos1, winWidth - element.offsetWidth)) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    showLoading(message) {
        document.getElementById('loading-message').textContent = message;
        document.getElementById('loading-overlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // Global method access for onclick handlers
    approveSpecificRequest(userId) {
        const modal = document.getElementById('join-request-modal');
        modal.dataset.userId = userId;
        this.approveJoinRequest();
    }

    rejectSpecificRequest(userId) {
        const modal = document.getElementById('join-request-modal');
        modal.dataset.userId = userId;
        this.rejectJoinRequest();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WatchTogetherApp();

    // Check for room parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        const roomId = urlParams.get('room').toUpperCase();
        // Auto-fill room ID when user reaches landing page
        setTimeout(() => {
            const roomInput = document.getElementById('room-id-input');
            if (roomInput) {
                roomInput.value = roomId;
            }
        }, 1000);
    }
});

// YouTube API ready callback
window.onYouTubeIframeAPIReady = () => {
    console.log('YouTube API ready');
};

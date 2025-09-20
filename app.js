// WatchTogether Pro - Enhanced with ALL Features
class WatchTogetherApp {
    constructor() {
        // Core state
        this.currentUser = null;
        this.currentRoom = null;
        this.isCreator = false;
        this.youtubePlayer = null;
        this.displayName = null;

        // Video call state
        this.localStream = null;
        this.peerConnections = new Map();
        this.isInCall = false;

        // Data structures
        this.roomMembers = new Map();
        this.pendingRequests = new Map();
        this.sessionHistory = [];

        // Encryption
        this.roomKey = null;

        // Fixed User IDs for special handling
        this.FIXED_USER_IDS = ['testuser1', 'testuser2', 'guestuser', 'demouser'];

        // Initialize Firebase
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
        const addEventListenerSafe = (id, event, handler) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            }
        };

        // Auth events
        addEventListenerSafe('send-magic-link-btn', 'click', () => this.sendMagicLink());
        addEventListenerSafe('anonymous-signin-btn', 'click', () => this.signInAnonymously());
        addEventListenerSafe('creator-code-btn', 'click', () => this.signInWithCreatorCode());
        addEventListenerSafe('sign-out-btn', 'click', () => this.signOut());

        // Display name modal
        addEventListenerSafe('save-display-name-btn', 'click', () => this.saveDisplayName());

        // Room events
        addEventListenerSafe('create-room-btn', 'click', () => this.createRoom());
        addEventListenerSafe('join-room-btn', 'click', () => this.joinRoom());
        addEventListenerSafe('leave-room-btn', 'click', () => this.leaveRoom());
        addEventListenerSafe('delete-room-btn', 'click', () => this.deleteRoom());

        // Room management
        addEventListenerSafe('refresh-rooms-btn', 'click', () => this.loadMyRooms());
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
        addEventListenerSafe('start-group-call-btn', 'click', () => this.startGroupCall());
        addEventListenerSafe('end-group-call-btn', 'click', () => this.endGroupCall());
        addEventListenerSafe('toggle-mic-btn', 'click', () => this.toggleMicrophone());
        addEventListenerSafe('toggle-cam-btn', 'click', () => this.toggleCamera());
        addEventListenerSafe('screen-share-btn', 'click', () => this.toggleScreenShare());
        addEventListenerSafe('leave-call-btn', 'click', () => this.leaveCall());

        // Creator controls events
        addEventListenerSafe('approve-request-btn', 'click', () => this.approveJoinRequest());
        addEventListenerSafe('reject-request-btn', 'click', () => this.rejectJoinRequest());
        addEventListenerSafe('clear-history-btn', 'click', () => this.clearRoomHistory());
        addEventListenerSafe('update-max-users-btn', 'click', () => this.updateMaxUsers());

        // Tab controls
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        console.log('✅ Event listeners setup complete');
    }

    // Authentication Methods
    checkAuthState() {
        this.showLoading('Checking authentication...');

        if (this.auth.isSignInWithEmailLink(window.location.href)) {
            this.handleMagicLinkSignIn();
            return;
        }

        this.auth.onAuthStateChanged(async (user) => {
            console.log('Auth state changed:', user ? user.uid : 'No user');
            this.hideLoading();

            if (user) {
                this.currentUser = user;
                await this.handleUserDisplayName(user);
                this.showApp();
                this.showToast(`Welcome back, ${this.displayName}!`, 'success');
            } else {
                this.showAuth();
            }
        });
    }

    async handleUserDisplayName(user) {
        // Check if user needs display name prompt
        if (this.FIXED_USER_IDS.includes(user.uid) || user.isAnonymous) {
            this.displayName = await this.getOrPromptDisplayName(user);
        } else if (user.email) {
            this.displayName = user.email.split('@')[0];
        } else {
            this.displayName = 'User-' + user.uid.slice(0, 6);
        }
    }

    async getOrPromptDisplayName(user) {
        try {
            // Check if display name exists in Firebase
            const snapshot = await this.database.ref(`users/${user.uid}/displayName`).once('value');
            let displayName = snapshot.val();

            if (!displayName) {
                // Prompt for display name
                this.showDisplayNameModal();
                return new Promise((resolve) => {
                    this.displayNameResolve = resolve;
                });
            }

            return displayName;
        } catch (error) {
            console.error('Error getting display name:', error);
            return 'User-' + user.uid.slice(0, 6);
        }
    }

    showDisplayNameModal() {
        const modal = document.getElementById('display-name-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    async saveDisplayName() {
        const input = document.getElementById('display-name-input');
        const displayName = input.value.trim();

        if (!displayName) {
            this.showToast('Please enter a display name', 'error');
            return;
        }

        try {
            // Save to Firebase
            await this.database.ref(`users/${this.currentUser.uid}`).update({
                displayName: displayName,
                lastUpdated: Date.now()
            });

            // Hide modal
            const modal = document.getElementById('display-name-modal');
            if (modal) {
                modal.classList.add('hidden');
            }

            // Resolve promise if waiting
            if (this.displayNameResolve) {
                this.displayNameResolve(displayName);
                this.displayNameResolve = null;
            }

            this.showToast('Display name saved!', 'success');
        } catch (error) {
            console.error('Error saving display name:', error);
            this.showToast('Error saving display name', 'error');
        }
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

        const VALID_CREATOR_CODES = ['AP123SINGH', 'ADMIN123', 'MASTER001'];

        if (VALID_CREATOR_CODES.includes(code.toUpperCase())) {
            try {
                this.showLoading('Verifying creator code...');
                await this.auth.signInAnonymously();
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
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }

        this.auth.signOut();
        this.currentUser = null;
        this.currentRoom = null;
        this.isCreator = false;
        this.displayName = null;
        this.roomMembers.clear();
        this.pendingRequests.clear();

        this.showAuth();
        this.showToast('Signed out successfully', 'info');
    }

    // Room Management - Enhanced
    async createRoom() {
        console.log('🎪 Creating room...');

        if (!this.isAuthorizedCreator()) {
            this.showToast('Only authorized creators can create rooms', 'error');
            return;
        }

        const maxUsers = parseInt(document.getElementById('max-users-input').value) || 4;
        const roomId = this.generateRoomId();
        const user = this.auth.currentUser;

        if (!user) {
            this.showToast('User not authenticated!', 'error');
            return;
        }

        try {
            this.showLoading('Creating room...');

            // Generate room encryption key
            this.roomKey = this.generateEncryptionKey();

            const roomData = {
                id: roomId,
                creator: user.uid,
                creatorEmail: user.email || 'Anonymous Creator',
                maxUsers: maxUsers,
                createdAt: Date.now(),
                users: {
                    [user.uid]: {
                        email: user.email || 'Anonymous',
                        displayName: this.displayName,
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
                history: {},
                signaling: {}
            };

            await this.database.ref(`rooms/${roomId}`).set(roomData);

            this.currentRoom = roomId;
            this.isCreator = true;

            this.hideLoading();
            this.showWatchInterface();
            this.setupRoomListeners();

            this.showToast(`🎉 Room ${roomId} created successfully!`, 'success');
            this.addSystemMessage(`Room ${roomId} created by ${this.displayName}`);

            // Load my rooms list if visible
            if (this.isAuthorizedCreator()) {
                this.loadMyRooms();
            }

        } catch (error) {
            this.hideLoading();
            console.error('❌ Room creation error:', error);
            this.showToast('Error creating room: ' + error.message, 'error');
        }
    }

    async loadMyRooms() {
        if (!this.currentUser || !this.isAuthorizedCreator()) return;

        try {
            const snapshot = await this.database.ref('rooms')
                .orderByChild('creator')
                .equalTo(this.currentUser.uid)
                .once('value');

            const rooms = snapshot.val() || {};
            const roomsList = document.getElementById('my-rooms-list');

            if (!roomsList) return;

            roomsList.innerHTML = '';

            if (Object.keys(rooms).length === 0) {
                roomsList.innerHTML = '<p class="no-rooms">No rooms created yet</p>';
                return;
            }

            Object.entries(rooms).forEach(([roomId, roomData]) => {
                const userCount = roomData.users ? Object.keys(roomData.users).length : 0;
                const status = userCount > 0 ? 'Active' : 'Empty';

                const roomDiv = document.createElement('div');
                roomDiv.className = 'room-item';
                roomDiv.innerHTML = `
                    <div class="room-info">
                        <div class="room-id">${roomData.id}</div>
                        <div class="room-status">Status: ${status} • Users: ${userCount}/${roomData.maxUsers}</div>
                    </div>
                    <div class="room-actions">
                        <button class="small primary" onclick="app.joinMyRoom('${roomId}')">📱 Join</button>
                        <button class="small danger" onclick="app.deleteSpecificRoom('${roomId}')">🗑️ Delete</button>
                    </div>
                `;
                roomsList.appendChild(roomDiv);
            });

        } catch (error) {
            console.error('Error loading rooms:', error);
            this.showToast('Error loading rooms', 'error');
        }
    }

    async joinMyRoom(roomId) {
        try {
            this.currentRoom = roomId;
            this.isCreator = true;
            this.showWatchInterface();
            this.setupRoomListeners();
            this.showToast('Rejoined your room!', 'success');
        } catch (error) {
            console.error('Error joining room:', error);
            this.showToast('Error joining room', 'error');
        }
    }

    async deleteSpecificRoom(roomId) {
        if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
            return;
        }

        try {
            await this.database.ref(`rooms/${roomId}`).remove();
            this.showToast('Room deleted successfully!', 'success');
            this.loadMyRooms(); // Refresh the list

            // If currently in this room, leave it
            if (this.currentRoom === roomId) {
                this.currentRoom = null;
                this.isCreator = false;
                this.showLandingPage();
            }
        } catch (error) {
            console.error('Error deleting room:', error);
            this.showToast('Error deleting room: ' + error.message, 'error');
        }
    }

    async deleteRoom() {
        if (!this.currentRoom || !this.isCreator) {
            this.showToast('Only room creator can delete the room', 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
            return;
        }

        try {
            await this.database.ref(`rooms/${this.currentRoom}`).remove();

            const roomId = this.currentRoom;
            this.currentRoom = null;
            this.isCreator = false;

            this.showLandingPage();
            this.showToast('Room deleted successfully!', 'success');

            // Refresh rooms list
            if (this.isAuthorizedCreator()) {
                this.loadMyRooms();
            }

        } catch (error) {
            console.error('Error deleting room:', error);
            this.showToast('Error deleting room: ' + error.message, 'error');
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
                displayName: this.displayName,
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
            // End any active calls
            if (this.isInCall) {
                this.endGroupCall();
            }

            // Remove user from room
            await this.database.ref(`rooms/${this.currentRoom}/users/${this.currentUser.uid}`).remove();

            if (this.isCreator) {
                this.addSystemMessage(`${this.displayName} left the room`);
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

            if (!this.youtubePlayer) {
                await this.initializeYouTubePlayer();
            }

            this.youtubePlayer.loadVideoById(videoId);

            await this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
                videoId: videoId,
                isPlaying: false,
                currentTime: 0,
                lastUpdated: Date.now(),
                updatedBy: this.currentUser.uid
            });

            this.hideLoading();
            this.showToast('Video loaded successfully!', 'success');
            this.addSystemMessage(`${this.displayName} loaded a new video`);

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

        if (videoState.updatedBy === this.currentUser.uid) return;

        try {
            if (videoState.videoId) {
                const currentVideoData = this.youtubePlayer.getVideoData();
                if (currentVideoData && currentVideoData.video_id !== videoState.videoId) {
                    this.youtubePlayer.loadVideoById(videoState.videoId);
                    return;
                }
            }

            const currentTime = this.youtubePlayer.getCurrentTime();
            const timeDiff = Math.abs(currentTime - videoState.currentTime);

            if (timeDiff > 3) {
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

    // Enhanced Group Video Call with WebRTC
    async startGroupCall() {
        try {
            this.showLoading('Starting group call...');

            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Setup local video
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }

            // Show video call interface
            this.showVideoCallInterface();
            this.isInCall = true;

            // Setup peer connections for existing members
            await this.setupPeerConnections();

            this.hideLoading();
            this.addSystemMessage(`${this.displayName} started a group video call`);
            this.showToast('Group call started!', 'success');

        } catch (error) {
            this.hideLoading();
            console.error('Group call error:', error);
            this.showToast('Error starting group call: ' + error.message, 'error');
        }
    }

    async setupPeerConnections() {
        if (!this.currentRoom) return;

        // Setup signaling listener
        const signalingRef = this.database.ref(`rooms/${this.currentRoom}/signaling`);

        signalingRef.on('child_added', async (snapshot) => {
            const signal = snapshot.val();
            const fromUser = snapshot.key;

            if (fromUser === this.currentUser.uid) return;

            await this.handleSignal(signal, fromUser);
        });

        // Create offers for all existing members
        const roomSnapshot = await this.database.ref(`rooms/${this.currentRoom}/users`).once('value');
        const users = roomSnapshot.val() || {};

        for (const userId of Object.keys(users)) {
            if (userId !== this.currentUser.uid && users[userId].approved) {
                await this.createPeerConnection(userId, true);
            }
        }
    }

    async createPeerConnection(remoteUserId, isInitiator = false) {
        if (this.peerConnections.has(remoteUserId)) return;

        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            this.displayRemoteVideo(remoteUserId, event.streams[0]);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(remoteUserId, {
                    type: 'candidate',
                    candidate: event.candidate.toJSON()
                });
            }
        };

        this.peerConnections.set(remoteUserId, peerConnection);

        // Create offer if initiator
        if (isInitiator) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            this.sendSignal(remoteUserId, {
                type: 'offer',
                offer: offer
            });
        }

        return peerConnection;
    }

    async handleSignal(signal, fromUserId) {
        let peerConnection = this.peerConnections.get(fromUserId);

        if (!peerConnection) {
            peerConnection = await this.createPeerConnection(fromUserId, false);
        }

        try {
            if (signal.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                this.sendSignal(fromUserId, {
                    type: 'answer',
                    answer: answer
                });
            } else if (signal.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.answer));
            } else if (signal.type === 'candidate') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }

    async sendSignal(toUserId, signal) {
        if (!this.currentRoom) return;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/signaling/${this.currentUser.uid}_${toUserId}`).set({
                from: this.currentUser.uid,
                to: toUserId,
                signal: signal,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }

    displayRemoteVideo(userId, stream) {
        const remoteContainer = document.getElementById('remote-videos-container');
        if (!remoteContainer) return;

        let videoContainer = document.getElementById(`remote-video-${userId}`);

        if (!videoContainer) {
            videoContainer = document.createElement('div');
            videoContainer.id = `remote-video-${userId}`;
            videoContainer.className = 'video-stream-container';

            const video = document.createElement('video');
            video.className = 'video-stream';
            video.autoplay = true;
            video.playsinline = true;
            video.srcObject = stream;

            const label = document.createElement('div');
            label.className = 'stream-label';
            label.textContent = `User ${userId.slice(0, 6)}`;

            videoContainer.appendChild(video);
            videoContainer.appendChild(label);
            remoteContainer.appendChild(videoContainer);
        }
    }

    showVideoCallInterface() {
        const videoCallGrid = document.getElementById('video-call-grid');
        const placeholder = document.getElementById('video-placeholder');
        const youtubePlayer = document.getElementById('youtube-player');
        const callControls = document.getElementById('call-controls');
        const startBtn = document.getElementById('start-group-call-btn');
        const endBtn = document.getElementById('end-group-call-btn');

        if (videoCallGrid) videoCallGrid.classList.remove('hidden');
        if (placeholder) placeholder.style.display = 'none';
        if (youtubePlayer) youtubePlayer.style.display = 'none';
        if (callControls) callControls.classList.remove('hidden');
        if (startBtn) startBtn.classList.add('hidden');
        if (endBtn) endBtn.classList.remove('hidden');
    }

    async endGroupCall() {
        try {
            // Stop local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            // Close all peer connections
            this.peerConnections.forEach(pc => pc.close());
            this.peerConnections.clear();

            this.hideVideoCallInterface();
            this.isInCall = false;

            // Clean up signaling
            if (this.currentRoom) {
                await this.database.ref(`rooms/${this.currentRoom}/signaling`).remove();
            }

            this.addSystemMessage(`${this.displayName} ended the group call`);
            this.showToast('Group call ended', 'info');

        } catch (error) {
            console.error('Error ending group call:', error);
            this.showToast('Error ending call', 'error');
        }
    }

    hideVideoCallInterface() {
        const videoCallGrid = document.getElementById('video-call-grid');
        const placeholder = document.getElementById('video-placeholder');
        const callControls = document.getElementById('call-controls');
        const startBtn = document.getElementById('start-group-call-btn');
        const endBtn = document.getElementById('end-group-call-btn');

        if (videoCallGrid) videoCallGrid.classList.add('hidden');
        if (placeholder) placeholder.style.display = 'flex';
        if (callControls) callControls.classList.add('hidden');
        if (startBtn) startBtn.classList.remove('hidden');
        if (endBtn) endBtn.classList.add('hidden');

        // Clear remote videos
        const remoteContainer = document.getElementById('remote-videos-container');
        if (remoteContainer) {
            remoteContainer.innerHTML = '';
        }
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

    async toggleScreenShare() {
        try {
            if (!this.isScreenSharing) {
                // Start screen sharing
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                // Replace video track in peer connections
                const videoTrack = screenStream.getVideoTracks()[0];

                this.peerConnections.forEach(pc => {
                    const sender = pc.getSenders().find(s => 
                        s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });

                // Update local video
                const localVideo = document.getElementById('local-video');
                if (localVideo) {
                    localVideo.srcObject = screenStream;
                }

                this.isScreenSharing = true;
                const btn = document.getElementById('screen-share-btn');
                if (btn) {
                    btn.classList.add('active');
                    btn.textContent = '🖥️';
                }

                // Handle screen share end
                videoTrack.onended = () => {
                    this.stopScreenShare();
                };

                this.showToast('Screen sharing started', 'success');

            } else {
                this.stopScreenShare();
            }
        } catch (error) {
            console.error('Screen share error:', error);
            this.showToast('Error with screen sharing', 'error');
        }
    }

    async stopScreenShare() {
        if (!this.localStream) return;

        try {
            // Get camera stream again
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            const videoTrack = cameraStream.getVideoTracks()[0];

            // Replace track in peer connections
            this.peerConnections.forEach(pc => {
                const sender = pc.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            // Update local video
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = cameraStream;
            }

            this.localStream = cameraStream;
            this.isScreenSharing = false;

            const btn = document.getElementById('screen-share-btn');
            if (btn) {
                btn.classList.remove('active');
                btn.textContent = '🖥️';
            }

            this.showToast('Screen sharing stopped', 'info');

        } catch (error) {
            console.error('Error stopping screen share:', error);
        }
    }

    leaveCall() {
        this.endGroupCall();
    }

    // Encryption Methods
    generateEncryptionKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    encryptMessage(message, key) {
        try {
            if (!key) return message; // Fallback if no key
            const encrypted = CryptoJS.AES.encrypt(message, key).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            return message;
        }
    }

    decryptMessage(encryptedMessage, key) {
        try {
            if (!key) return encryptedMessage; // Fallback if no key
            const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key).toString(CryptoJS.enc.Utf8);
            return decrypted || encryptedMessage;
        } catch (error) {
            console.error('Decryption error:', error);
            return encryptedMessage;
        }
    }

    // Enhanced Chat System with Encryption
    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message || !this.currentRoom || !this.currentUser) return;

        try {
            // Encrypt message if room key exists
            const encryptedMessage = this.roomKey ? 
                this.encryptMessage(message, this.roomKey) : message;

            await this.database.ref(`rooms/${this.currentRoom}/messages`).push({
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email || 'Anonymous',
                displayName: this.displayName,
                message: encryptedMessage,
                encrypted: !!this.roomKey,
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
                encrypted: false,
                timestamp: Date.now(),
                isSystem: true
            });

            // Also add to history
            await this.database.ref(`rooms/${this.currentRoom}/history`).push({
                message: message,
                timestamp: Date.now(),
                type: 'system'
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

        if (message.encrypted) {
            messageDiv.classList.add('encrypted');
        }

        if (message.isSystem) {
            messageDiv.classList.add('system');
            messageDiv.innerHTML = `<div class="message-content">${this.escapeHtml(message.message)}</div>`;
        } else {
            if (message.userId === this.currentUser.uid) {
                messageDiv.classList.add('own');
            }

            // Decrypt message if encrypted
            const displayMessage = message.encrypted && this.roomKey ? 
                this.decryptMessage(message.message, this.roomKey) : message.message;

            const time = new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit', 
                minute: '2-digit'
            });

            messageDiv.innerHTML = `
                <div class="message-header">${this.escapeHtml(message.displayName)} • ${time}</div>
                <div class="message-content">${this.escapeHtml(displayMessage)}</div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Room History Management
    async loadRoomHistory() {
        if (!this.currentRoom || !this.isCreator) return;

        try {
            const snapshot = await this.database.ref(`rooms/${this.currentRoom}/history`)
                .orderByChild('timestamp')
                .once('value');

            const history = snapshot.val() || {};
            const historyList = document.getElementById('room-history-list');

            if (!historyList) return;

            historyList.innerHTML = '';

            const entries = Object.values(history).sort((a, b) => a.timestamp - b.timestamp);

            if (entries.length === 0) {
                historyList.innerHTML = '<p class="no-history">No history yet</p>';
                return;
            }

            entries.forEach(entry => {
                const div = document.createElement('div');
                div.className = 'history-entry';
                const time = new Date(entry.timestamp).toLocaleString();
                div.textContent = `[${time}] ${entry.message}`;
                historyList.appendChild(div);
            });

        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    async clearRoomHistory() {
        if (!this.currentRoom || !this.isCreator) return;

        if (!confirm('Are you sure you want to clear the room history?')) return;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/history`).remove();
            this.showToast('Room history cleared', 'success');
            this.loadRoomHistory();
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showToast('Error clearing history', 'error');
        }
    }

    async updateMaxUsers() {
        if (!this.currentRoom || !this.isCreator) return;

        const newMaxUsers = parseInt(document.getElementById('room-max-users').value);

        if (!newMaxUsers || newMaxUsers < 2 || newMaxUsers > 20) {
            this.showToast('Max users must be between 2 and 20', 'error');
            return;
        }

        try {
            await this.database.ref(`rooms/${this.currentRoom}/maxUsers`).set(newMaxUsers);
            this.showToast('Max users updated successfully', 'success');
            this.addSystemMessage(`Max users limit changed to ${newMaxUsers}`);
        } catch (error) {
            console.error('Error updating max users:', error);
            this.showToast('Error updating max users', 'error');
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
        const userDisplayName = document.getElementById('user-display-name');
        if (userDisplayName) {
            userDisplayName.textContent = this.displayName;
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
            // Load creator's rooms
            this.loadMyRooms();
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
            this.loadRoomHistory();
        } else if (creatorControls) {
            creatorControls.classList.add('hidden');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load content based on tab
        if (tabName === 'history') {
            this.loadRoomHistory();
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
            this.showToast('Room ID: ' + this.currentRoom, 'info');
        }
    }

    shareRoom() {
        if (!this.currentRoom) return;

        const shareUrl = `${window.location.origin}${window.location.pathname}?room=${this.currentRoom}`;
        const shareText = `Join me for a synchronized movie night! Room ID: ${this.currentRoom}`;

        if (navigator.share) {
            navigator.share({
                title: 'WatchTogether Pro - Join my room!',
                text: shareText,
                url: shareUrl
            }).catch(() => {
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
        if (!this.currentUser) return false;

        // Method 1: Creator code
        if (this.currentUser.isCreatorByCode) return true;

        // Method 2: Email authorization
        const AUTHORIZED_CREATOR_EMAILS = ['keshavkuma0634@gmail.com']; // Update with your email
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

        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);

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
    console.log('🚀 Initializing WatchTogether Pro...');

    window.app = new WatchTogetherApp();

    // Check for room parameter in URL for auto-join
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        const roomId = urlParams.get('room').toUpperCase();
        console.log('🔗 Room ID found in URL:', roomId);

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

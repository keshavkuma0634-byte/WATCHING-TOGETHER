// WatchTogether App - Complete Implementation
class WatchTogetherApp {
    constructor() {
        this.currentUser = null;
        this.currentRoom = null;
        this.isCreator = false;
        this.youtubePlayer = null;
        this.localStream = null;
        this.remoteStream = null;

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
        document.getElementById('send-link-btn').addEventListener('click', () => this.sendMagicLink());
        document.getElementById('sign-out-btn').addEventListener('click', () => this.signOut());

        // Room events
        document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn').addEventListener('click', () => this.joinRoom());
        document.getElementById('back-to-lobby-btn').addEventListener('click', () => this.backToLobby());
        document.getElementById('copy-room-btn').addEventListener('click', () => this.copyRoomId());

        // Video events
        document.getElementById('load-video-btn').addEventListener('click', () => this.loadVideo());
        document.getElementById('sync-btn').addEventListener('click', () => this.syncVideo());

        // Chat events
        document.getElementById('send-chat-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Video call events
        document.getElementById('start-call-btn').addEventListener('click', () => this.startVideoCall());
        document.getElementById('end-call').addEventListener('click', () => this.endVideoCall());
        document.getElementById('toggle-audio').addEventListener('click', () => this.toggleAudio());
        document.getElementById('toggle-video').addEventListener('click', () => this.toggleVideo());

        // Join request modal events
        document.getElementById('approve-btn').addEventListener('click', () => this.approveJoinRequest());
        document.getElementById('reject-btn').addEventListener('click', () => this.rejectJoinRequest());
    }

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
            this.showToast('Error: ' + error.message, 'error');
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

    signOut() {
        this.auth.signOut();
        this.currentUser = null;
        this.currentRoom = null;
        this.showAuth();
    }

    async createRoom() {
        const maxUsers = parseInt(document.getElementById('max-users').value) || 2;
        const roomId = this.generateRoomId();

        try {
            this.showLoading('Creating room...');

            const roomData = {
                id: roomId,
                creator: this.currentUser.email,
                maxUsers: maxUsers,
                createdAt: Date.now(),
                users: {
                    [this.currentUser.uid]: {
                        email: this.currentUser.email,
                        joinedAt: Date.now(),
                        approved: true
                    }
                },
                joinRequests: {},
                videoState: {
                    videoId: null,
                    isPlaying: false,
                    currentTime: 0
                },
                messages: {}
            };

            await this.database.ref(`rooms/${roomId}`).set(roomData);

            this.currentRoom = roomId;
            this.isCreator = true;
            this.hideLoading();
            this.showWatchInterface();
            this.setupRoomListeners();
            this.showToast(`Room ${roomId} created!`, 'success');

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

            // Check if already in room
            if (roomData.users && roomData.users[this.currentUser.uid]) {
                if (roomData.users[this.currentUser.uid].approved) {
                    this.currentRoom = roomId;
                    this.isCreator = (roomData.creator === this.currentUser.email);
                    this.hideLoading();
                    this.showWatchInterface();
                    this.setupRoomListeners();
                    this.showToast('Joined room!', 'success');
                    return;
                }
            }

            // Check room capacity
            const userCount = Object.keys(roomData.users || {}).length;
            if (userCount >= roomData.maxUsers) {
                this.hideLoading();
                this.showToast('Room is full', 'error');
                return;
            }

            // Send join request
            await this.database.ref(`rooms/${roomId}/joinRequests/${this.currentUser.uid}`).set({
                email: this.currentUser.email,
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

    setupRoomListeners() {
        if (!this.currentRoom) return;

        const roomRef = this.database.ref(`rooms/${this.currentRoom}`);

        // Listen for video state changes
        roomRef.child('videoState').on('value', (snapshot) => {
            const videoState = snapshot.val();
            if (videoState) {
                this.syncToVideoState(videoState);
            }
        });

        // Listen for new messages
        roomRef.child('messages').on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message) {
                this.displayMessage(message);
            }
        });

        // Listen for join requests (if creator)
        if (this.isCreator) {
            roomRef.child('joinRequests').on('child_added', (snapshot) => {
                const request = snapshot.val();
                if (request && request.status === 'pending') {
                    this.showJoinRequestModal(snapshot.key, request);
                }
            });
        }

        // Listen for user changes
        roomRef.child('users').on('value', (snapshot) => {
            const users = snapshot.val() || {};
            this.updateUsersList(users);
        });
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
                        this.backToLobby();
                    }
                }
            });
    }

    async approveJoinRequest() {
        const modal = document.getElementById('join-request-modal');
        const userId = modal.dataset.userId;
        const userEmail = modal.dataset.userEmail;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/users/${userId}`).set({
                email: userEmail,
                joinedAt: Date.now(),
                approved: true
            });

            await this.database.ref(`rooms/${this.currentRoom}/joinRequests/${userId}`).update({
                status: 'approved'
            });

            this.addSystemMessage(`${userEmail} joined the room`);
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

            await this.database.ref(`rooms/${this.currentRoom}/videoState`).set({
                videoId: videoId,
                isPlaying: false,
                currentTime: 0,
                updatedBy: this.currentUser.email,
                updatedAt: Date.now()
            });

            this.hideLoading();
            this.showToast('Video loaded!', 'success');
            this.addSystemMessage(`${this.currentUser.email} loaded a new video`);

        } catch (error) {
            this.hideLoading();
            this.showToast('Error loading video: ' + error.message, 'error');
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
                    enablejsapi: 1
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

        // Update database
        this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
            isPlaying: isPlaying,
            currentTime: this.youtubePlayer.getCurrentTime(),
            updatedBy: this.currentUser.email,
            updatedAt: Date.now()
        });
    }

    syncToVideoState(videoState) {
        if (!this.youtubePlayer || !videoState) return;

        // Don't sync if this user made the change
        if (videoState.updatedBy === this.currentUser.email) return;

        try {
            if (videoState.videoId) {
                const currentVideoId = this.youtubePlayer.getVideoData().video_id;
                if (currentVideoId !== videoState.videoId) {
                    this.youtubePlayer.loadVideoById(videoState.videoId);
                }
            }

            if (videoState.isPlaying) {
                this.youtubePlayer.seekTo(videoState.currentTime, true);
                this.youtubePlayer.playVideo();
            } else {
                this.youtubePlayer.pauseVideo();
                this.youtubePlayer.seekTo(videoState.currentTime, true);
            }

            document.getElementById('sync-status').textContent = 'Synced';
            document.getElementById('sync-status').className = 'status synced';
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message) return;

        try {
            await this.database.ref(`rooms/${this.currentRoom}/messages`).push({
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                message: message,
                timestamp: Date.now()
            });

            input.value = '';
        } catch (error) {
            this.showToast('Error sending message: ' + error.message, 'error');
        }
    }

    async addSystemMessage(message) {
        try {
            await this.database.ref(`rooms/${this.currentRoom}/messages`).push({
                userId: 'system',
                userEmail: 'System',
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
            messageDiv.innerHTML = `<div class="message-content">${message.message}</div>`;
        } else {
            if (message.userId === this.currentUser.uid) {
                messageDiv.classList.add('own');
            }

            const time = new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit', 
                minute: '2-digit'
            });

            messageDiv.innerHTML = `
                <div class="message-header">${message.userEmail} - ${time}</div>
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

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

            this.addSystemMessage(`${this.currentUser.email} started a video call`);
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
        this.addSystemMessage(`${this.currentUser.email} ended the video call`);
    }

    toggleAudio() {
        if (!this.localStream) return;

        const audioTracks = this.localStream.getAudioTracks();
        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        const btn = document.getElementById('toggle-audio');
        btn.textContent = audioTracks[0]?.enabled ? '🎤' : '🔇';
    }

    toggleVideo() {
        if (!this.localStream) return;

        const videoTracks = this.localStream.getVideoTracks();
        videoTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        const btn = document.getElementById('toggle-video');
        btn.textContent = videoTracks[0]?.enabled ? '📹' : '📷';
    }

    syncVideo() {
        if (!this.youtubePlayer) return;

        const currentTime = this.youtubePlayer.getCurrentTime();
        const isPlaying = this.youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;

        this.database.ref(`rooms/${this.currentRoom}/videoState`).update({
            currentTime: currentTime,
            isPlaying: isPlaying,
            updatedBy: this.currentUser.email,
            updatedAt: Date.now()
        });

        this.showToast('Video synced!', 'success');
    }

    copyRoomId() {
        if (!this.currentRoom) return;

        navigator.clipboard.writeText(this.currentRoom).then(() => {
            this.showToast('Room ID copied!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy room ID', 'error');
        });
    }

    backToLobby() {
        this.currentRoom = null;
        this.isCreator = false;
        this.showLandingPage();
    }

    // UI Helper Methods
    showAuth() {
        document.getElementById('auth-panel').classList.remove('hidden');
        document.getElementById('app-panel').classList.add('hidden');
    }

    showApp() {
        document.getElementById('auth-panel').classList.add('hidden');
        document.getElementById('app-panel').classList.remove('hidden');
        document.getElementById('user-email').textContent = this.currentUser.email;
        this.showLandingPage();
    }

    showLandingPage() {
        document.getElementById('landing-page').classList.remove('hidden');
        document.getElementById('watch-interface').classList.add('hidden');
    }

    showWatchInterface() {
        document.getElementById('landing-page').classList.add('hidden');
        document.getElementById('watch-interface').classList.remove('hidden');
        document.getElementById('room-id-display').textContent = this.currentRoom;

        const roleElement = document.getElementById('user-role');
        if (this.isCreator) {
            roleElement.textContent = 'Creator';
            roleElement.className = 'badge creator';
            document.getElementById('creator-controls').classList.remove('hidden');
        } else {
            roleElement.textContent = 'Member';
            roleElement.className = 'badge';
            document.getElementById('creator-controls').classList.add('hidden');
        }
    }

    showJoinRequestModal(userId, request) {
        const modal = document.getElementById('join-request-modal');
        modal.dataset.userId = userId;
        modal.dataset.userEmail = request.email;
        document.getElementById('requester-email').textContent = request.email;
        modal.classList.remove('hidden');
    }

    hideJoinRequestModal() {
        document.getElementById('join-request-modal').classList.add('hidden');
    }

    updateUsersList(users) {
        const usersList = document.getElementById('room-users');
        if (!usersList) return;

        usersList.innerHTML = '<h4>Room Members:</h4>';
        Object.entries(users).forEach(([userId, userData]) => {
            if (userData.approved) {
                const userDiv = document.createElement('div');
                userDiv.textContent = userData.email;
                usersList.appendChild(userDiv);
            }
        });
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

    // Utility Methods
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
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.watchTogetherApp = new WatchTogetherApp();
});

// Initialize YouTube API
window.onYouTubeIframeAPIReady = () => {
    console.log('YouTube API ready');
};

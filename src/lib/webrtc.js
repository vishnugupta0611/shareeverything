// Simple WebRTC P2P Connection Manager
const URL="https://sendanything.onrender.com"

export class P2PConnection {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.onMessage = null;
        this.onConnectionChange = null;
        this.onFileReceive = null;
        this.onTransferProgress = null;
        this.isConnected = false;
        this.fileChunks = new Map();
        this.chunkSize = 8192; // 8KB chunks
        
        // Create peer connection
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            if (this.onConnectionChange) {
                this.onConnectionChange(state);
            }
        };

        // Handle incoming data channels (for receiver)
        this.peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            this.setupDataChannel(channel);
        };
    }

    setupDataChannel(channel) {
        this.dataChannel = channel;

        channel.onopen = () => {
            console.log('Data channel opened');
            this.isConnected = true;
            if (this.onConnectionChange) {
                this.onConnectionChange('connected');
            }
        };

        channel.onclose = () => {
            console.log('Data channel closed');
            this.isConnected = false;
            if (this.onConnectionChange) {
                this.onConnectionChange('disconnected');
            }
        };

        channel.onerror = (error) => {
            console.error('Data channel error:', error);
            if (this.onConnectionChange) {
                this.onConnectionChange('error');
            }
        };

        channel.onmessage = (event) => {
            try {
                // Handle binary data (file chunks) vs JSON data (metadata/messages)
                if (event.data instanceof ArrayBuffer) {
                    // This is a binary file chunk
                    this.handleBinaryChunk(event.data);
                    return;
                }

                // Parse JSON data for metadata and messages
                const data = JSON.parse(event.data);

                if (data.type === 'file-start') {
                    // Initialize file transfer with ordered chunk storage
                    const smallChunkSize = 8192; // Match sender chunk size
                    this.fileChunks.set(data.fileId, {
                        name: data.name,
                        size: data.size,
                        mimeType: data.mimeType,
                        chunks: new Map(), // Use Map for ordered chunks
                        receivedSize: 0,
                        totalChunks: Math.ceil(data.size / smallChunkSize),
                        expectedChunkIndex: 0 // Track expected next chunk
                    });

                    if (this.onTransferProgress) {
                        this.onTransferProgress({
                            type: 'receiving',
                            fileName: data.name,
                            progress: 0
                        });
                    }
                } else if (data.type === 'file-chunk-meta') {
                    // Store metadata for the next binary chunk
                    this.nextChunkMeta = {
                        fileId: data.fileId,
                        chunkIndex: data.chunkIndex,
                        chunkSize: data.chunkSize
                    };
                } else if (data.type === 'file-end') {
                    // Complete file transfer with proper chunk assembly
                    const fileInfo = this.fileChunks.get(data.fileId);
                    if (fileInfo && this.onFileReceive) {
                        try {
                            // Assemble chunks in correct order
                            const orderedChunks = [];
                            for (let i = 0; i < fileInfo.totalChunks; i++) {
                                const chunk = fileInfo.chunks.get(i);
                                if (chunk) {
                                    orderedChunks.push(chunk);
                                } else {
                                    console.error(`Missing chunk ${i} for file ${fileInfo.name}`);
                                    throw new Error(`Missing chunk ${i}`);
                                }
                            }

                            // Combine all ArrayBuffer chunks
                            const totalSize = orderedChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
                            const combinedBuffer = new ArrayBuffer(totalSize);
                            const combinedView = new Uint8Array(combinedBuffer);
                            
                            let offset = 0;
                            for (const chunk of orderedChunks) {
                                combinedView.set(new Uint8Array(chunk), offset);
                                offset += chunk.byteLength;
                            }

                            this.onFileReceive({
                                name: fileInfo.name,
                                data: combinedBuffer,
                                type: fileInfo.mimeType,
                                size: fileInfo.size
                            });
                        } catch (error) {
                            console.error('Error assembling file:', error);
                            if (this.onTransferProgress) {
                                this.onTransferProgress({
                                    type: 'error',
                                    fileName: fileInfo.name,
                                    error: 'Failed to assemble file'
                                });
                            }
                        }

                        this.fileChunks.delete(data.fileId);

                        if (this.onTransferProgress) {
                            this.onTransferProgress({
                                type: 'complete',
                                fileName: fileInfo.name,
                                progress: 100
                            });
                        }
                    }
                } else if (data.type === 'message' || data.type === 'code') {
                    // Handle regular messages and code
                    if (this.onMessage) {
                        this.onMessage(data);
                    }
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
    }

    // Handle binary file chunks
    handleBinaryChunk(arrayBuffer) {
        if (!this.nextChunkMeta) {
            console.error('Received binary chunk without metadata');
            return;
        }

        const { fileId, chunkIndex, chunkSize } = this.nextChunkMeta;
        const fileInfo = this.fileChunks.get(fileId);
        
        if (fileInfo) {
            // Store the binary chunk
            fileInfo.chunks.set(chunkIndex, arrayBuffer);
            fileInfo.receivedSize += chunkSize;

            const progress = (fileInfo.receivedSize / fileInfo.size) * 100;

            if (this.onTransferProgress) {
                this.onTransferProgress({
                    type: 'receiving',
                    fileName: fileInfo.name,
                    progress: Math.round(progress)
                });
            }
        }

        // Clear the metadata
        this.nextChunkMeta = null;
    }

    // Create offer (sender side)
    async createOffer() {
        // Create data channel for sender
        this.dataChannel = this.peerConnection.createDataChannel('fileTransfer', {
            ordered: true
        });
        this.setupDataChannel(this.dataChannel);

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    // Create answer (receiver side)
    async createAnswer(offer) {
        await this.peerConnection.setRemoteDescription(offer);
        // Process any pending ICE candidates after setting remote description
        await this.processPendingIceCandidates();
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    // Set remote answer (sender side)
    async setRemoteAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
        // Process any pending ICE candidates after setting remote description
        await this.processPendingIceCandidates();
    }

    // Add ICE candidate with proper state checking
    async addIceCandidate(candidate) {
        try {
            // Only add ICE candidates if we have a remote description
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(candidate);
            } else {
                // Queue ICE candidates if remote description isn't set yet
                if (!this.pendingIceCandidates) {
                    this.pendingIceCandidates = [];
                }
                this.pendingIceCandidates.push(candidate);
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    // Process pending ICE candidates after remote description is set
    async processPendingIceCandidates() {
        if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
            for (const candidate of this.pendingIceCandidates) {
                try {
                    await this.peerConnection.addIceCandidate(candidate);
                } catch (error) {
                    console.error('Error adding pending ICE candidate:', error);
                }
            }
            this.pendingIceCandidates = [];
        }
    }

    // Send text message
    sendMessage(message) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'message',
                content: message,
                timestamp: Date.now()
            }));
        }
    }

    // Reliable file transfer using binary data directly (no base64)
    async sendFile(file) {
        if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
            throw new Error('Data channel not ready');
        }

        const fileId = Math.random().toString(36).substr(2, 9);
        const arrayBuffer = await file.arrayBuffer();

        // Send file metadata first
        this.dataChannel.send(JSON.stringify({
            type: 'file-start',
            fileId: fileId,
            name: file.name,
            size: file.size,
            mimeType: file.type,
            timestamp: Date.now()
        }));

        // Use smaller chunks for better reliability
        const smallChunkSize = 8192; // 8KB chunks for better reliability
        const totalChunks = Math.ceil(arrayBuffer.byteLength / smallChunkSize);
        let sentBytes = 0;

        // Send chunks one by one with proper flow control
        for (let i = 0; i < totalChunks; i++) {
            const start = i * smallChunkSize;
            const end = Math.min(start + smallChunkSize, arrayBuffer.byteLength);
            const chunk = arrayBuffer.slice(start, end);

            // Wait for buffer to be available
            await this.waitForBufferSpace();

            // Send chunk metadata first
            this.dataChannel.send(JSON.stringify({
                type: 'file-chunk-meta',
                fileId: fileId,
                chunkIndex: i,
                chunkSize: chunk.byteLength
            }));

            // Wait a bit for metadata to be processed
            await new Promise(resolve => setTimeout(resolve, 10));

            // Send raw binary data directly
            this.dataChannel.send(chunk);

            sentBytes += chunk.byteLength;

            // Update progress
            if (this.onTransferProgress) {
                const progress = Math.round((sentBytes / arrayBuffer.byteLength) * 100);
                this.onTransferProgress({
                    type: 'sending',
                    fileName: file.name,
                    progress: progress
                });
            }

            // Small delay to prevent overwhelming the channel
            await new Promise(resolve => setTimeout(resolve, 15));
        }

        // Send completion message
        this.dataChannel.send(JSON.stringify({
            type: 'file-end',
            fileId: fileId,
            timestamp: Date.now()
        }));
    }

    // Wait for data channel buffer to have space
    async waitForBufferSpace() {
        while (this.dataChannel && this.dataChannel.bufferedAmount > 16384) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    // Send code with syntax highlighting info
    sendCode(code, language = 'javascript') {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
                type: 'code',
                content: code,
                language: language,
                timestamp: Date.now()
            }));
        }
    }

    // Set transfer progress callback
    onTransferProgressChange(callback) {
        this.onTransferProgress = callback;
    }

    // Improved utility functions for better data integrity
    arrayBufferToBase64(buffer) {
        try {
            const bytes = new Uint8Array(buffer);
            const chunkSize = 8192; // Process in smaller chunks to avoid stack overflow
            let binary = '';
            
            for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
                binary += String.fromCharCode.apply(null, chunk);
            }
            
            return btoa(binary);
        } catch (error) {
            console.error('Base64 encode error:', error);
            throw new Error('Failed to encode data to base64');
        }
    }

    base64ToArrayBuffer(base64) {
        try {
            // Validate base64 string
            if (!base64 || typeof base64 !== 'string') {
                throw new Error('Invalid base64 string');
            }

            // Clean the base64 string - remove any whitespace or invalid characters
            let cleanBase64 = base64.replace(/[^A-Za-z0-9+/=]/g, '');

            // Add proper padding if needed
            while (cleanBase64.length % 4 !== 0) {
                cleanBase64 += '=';
            }

            // Validate base64 format more thoroughly
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
                throw new Error('Invalid base64 characters detected');
            }

            const binary = atob(cleanBase64);
            const bytes = new Uint8Array(binary.length);
            
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            return bytes.buffer;
        } catch (error) {
            console.error('Base64 decode error:', error);
            console.error('Base64 string length:', base64?.length || 'undefined');
            console.error('Base64 string sample:', base64?.substring(0, 100) || 'undefined');
            
            // Try alternative decoding approach for corrupted data
            try {
                // Remove all non-base64 characters and try again
                const strictClean = base64.replace(/[^A-Za-z0-9+/]/g, '');
                const padded = strictClean + '='.repeat((4 - strictClean.length % 4) % 4);
                
                const binary = atob(padded);
                const bytes = new Uint8Array(binary.length);
                
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                
                console.log('Successfully recovered corrupted base64 data');
                return bytes.buffer;
            } catch (recoveryError) {
                console.error('Recovery attempt failed:', recoveryError);
                throw new Error('Failed to decode base64 data: ' + error.message);
            }
        }
    }

    // Event handlers
    onMessageReceived(callback) {
        this.onMessage = callback;
    }

    onConnectionStateChange(callback) {
        this.onConnectionChange = callback;
    }

    onFileReceived(callback) {
        this.onFileReceive = callback;
    }

    // Get ICE candidates
    onIceCandidate(callback) {
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                callback(event.candidate);
            }
        };
    }

    // Close connection
    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        this.peerConnection.close();
    }
}

// Generate 6-digit session key
export function generateSessionKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Simple Backend API Client
export class BackendAPI {
    constructor() {
        this.baseURL = URL+"/api";
    }

    // Create new session
    async createSession() {
        try {
            const response = await fetch(`${this.baseURL}/sessions/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Create session error:', error);
            throw error;
        }
    }

    // Join existing session
    async joinSession(sessionId) {
        try {
            const response = await fetch(`${this.baseURL}/sessions/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Join session error:', error);
            throw error;
        }
    }

    // Check if session exists
    async checkSession(sessionId) {
        try {
            const response = await fetch(`${this.baseURL}/sessions/check/${sessionId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Check session error:', error);
            return { success: false, exists: false };
        }
    }
}

// Socket.io Signaling for WebRTC
export class SocketSignaling {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.socket = null;
        this.onSignal = null;
        this.onUserJoined = null;
        this.onUserLeft = null;
    }

    // Connect to socket server
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // Import socket.io-client dynamically
                import('socket.io-client').then(({ io }) => {
                    this.socket = io(URL);

                    this.socket.on('connect', () => {
                        console.log('Connected to signaling server');
                        
                        // Join session room
                        this.socket.emit('join-session', this.sessionId);
                        resolve();
                    });

                    this.socket.on('session-joined', (data) => {
                        console.log('Session joined:', data.message);
                    });

                    this.socket.on('user-joined', (data) => {
                        console.log('User joined:', data.message);
                        if (this.onUserJoined) {
                            this.onUserJoined(data);
                        }
                    });

                    this.socket.on('user-left', (data) => {
                        console.log('User left:', data.message);
                        if (this.onUserLeft) {
                            this.onUserLeft(data);
                        }
                    });

                    this.socket.on('webrtc-signal', (data) => {
                        if (this.onSignal) {
                            this.onSignal(data);
                        }
                    });

                    this.socket.on('error', (error) => {
                        console.error('Socket error:', error);
                        reject(error);
                    });

                    this.socket.on('disconnect', () => {
                        console.log('Disconnected from signaling server');
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Send WebRTC signal
    sendSignal(signal, targetId = null) {
        if (this.socket) {
            this.socket.emit('webrtc-signal', {
                sessionId: this.sessionId,
                signal,
                targetId
            });
        }
    }

    // Send file transfer progress
    sendProgress(progress) {
        if (this.socket) {
            this.socket.emit('file-progress', {
                sessionId: this.sessionId,
                progress
            });
        }
    }

    // Complete session
    completeSession() {
        if (this.socket) {
            this.socket.emit('complete-session', this.sessionId);
        }
    }

    // Set event handlers
    onSignalReceived(callback) {
        this.onSignal = callback;
    }

    onUserJoinedRoom(callback) {
        this.onUserJoined = callback;
    }

    onUserLeftRoom(callback) {
        this.onUserLeft = callback;
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}
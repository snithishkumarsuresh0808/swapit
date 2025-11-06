'use client';

import { useEffect, useRef, useState } from 'react';
import { getWsUrl } from '@/lib/config';

interface WebRTCCallProps {
  currentUserId: number;
  otherUserId: number;
  otherUserName: string;
  isIncoming?: boolean;
  audioOnly?: boolean;
  onClose: () => void;
}

export default function WebRTCCall({
  currentUserId,
  otherUserId,
  otherUserName,
  isIncoming = false,
  audioOnly = true,
  onClose,
}: WebRTCCallProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoCall] = useState(!audioOnly);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const wsReadyRef = useRef(false);

  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      // Create WebSocket connection first
      const ws = new WebSocket(getWsUrl(`/ws/call/${currentUserId}/`));
      websocketRef.current = ws;

      ws.onopen = async () => {
        console.log('WebSocket connected');
        wsReadyRef.current = true;

        // Flush queued ICE candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          if (candidate) {
            sendWebSocketMessage({
              type: 'ice-candidate',
              candidate: candidate,
              peer_id: otherUserId,
            });
          }
        }

        // Get user media after WebSocket is ready
        await setupMediaAndPeerConnection();

        // If not incoming call, initiate the call
        if (!isIncoming) {
          makeCall();
        }
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        await handleWebSocketMessage(data);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('Connection error. Please try again.');
        onClose();
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Could not initialize call. Please try again.');
      onClose();
    }
  };

  const setupMediaAndPeerConnection = async () => {
    try {
      // Get user media (audio and optionally video)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
      }

      createPeerConnection(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access microphone/camera. Please check permissions.');
      onClose();
    }
  };

  const createPeerConnection = (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('connected');
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (wsReadyRef.current && websocketRef.current?.readyState === WebSocket.OPEN) {
          sendWebSocketMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            peer_id: otherUserId,
          });
        } else {
          // Queue candidates if WebSocket not ready
          iceCandidatesQueue.current.push(event.candidate);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setCallStatus('ended');
      }
    };
  };

  const sendWebSocketMessage = (message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not open, cannot send message');
    }
  };

  const makeCall = async () => {
    if (!peerConnectionRef.current) return;

    try {
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      });
      await peerConnectionRef.current.setLocalDescription(offer);

      sendWebSocketMessage({
        type: 'call-offer',
        offer: offer,
        recipient_id: otherUserId,
        caller_name: 'You',
      });
    } catch (error) {
      console.error('Error making call:', error);
    }
  };

  const handleWebSocketMessage = async (data: any) => {
    console.log('Received WebSocket message:', data.type);

    switch (data.type) {
      case 'call-offer':
        await handleCallOffer(data);
        break;

      case 'call-answer':
        await handleCallAnswer(data);
        break;

      case 'ice-candidate':
        await handleIceCandidate(data);
        break;

      case 'call-end':
        setCallStatus('ended');
        cleanup();
        onClose();
        break;
    }
  };

  const handleCallOffer = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      sendWebSocketMessage({
        type: 'call-answer',
        answer: answer,
        caller_id: data.caller_id,
      });

      setCallStatus('connected');
    } catch (error) {
      console.error('Error handling call offer:', error);
    }
  };

  const handleCallAnswer = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      setCallStatus('connected');
    } catch (error) {
      console.error('Error handling call answer:', error);
    }
  };

  const handleIceCandidate = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(
        new RTCIceCandidate(data.candidate)
      );
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const endCall = () => {
    sendWebSocketMessage({
      type: 'call-end',
      peer_id: otherUserId,
    });

    cleanup();
    onClose();
  };

  const cleanup = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Close WebSocket
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    wsReadyRef.current = false;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col items-center justify-center">
      {/* Audio element for remote stream (hidden for audio calls) */}
      {!isVideoCall && (
        <audio ref={remoteVideoRef as any} autoPlay playsInline />
      )}

      {/* Video elements for video calls */}
      {isVideoCall && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </>
      )}

      {/* Call Status UI */}
      <div className="relative z-10 flex flex-col items-center">
        {/* User Avatar */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-5xl font-bold mb-6 shadow-2xl">
          {otherUserName.charAt(0)}
        </div>

        {/* User Name */}
        <h2 className="text-white text-3xl font-bold mb-2">{otherUserName}</h2>

        {/* Call Status */}
        <div className="flex items-center gap-2 mb-8">
          {callStatus === 'calling' && (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <p className="text-gray-300 text-lg">Calling...</p>
            </>
          )}
          {callStatus === 'ringing' && (
            <>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-gray-300 text-lg">Incoming Call...</p>
            </>
          )}
          {callStatus === 'connected' && (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-gray-300 text-lg">Connected</p>
            </>
          )}
          {callStatus === 'ended' && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-gray-300 text-lg">Call Ended</p>
            </>
          )}
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-6">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-5 rounded-full transition-all shadow-lg ${
              isMuted
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="p-6 bg-red-600 hover:bg-red-700 rounded-full transition-all shadow-lg"
            title="End Call"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v6.8c4.56-.93 8-4.96 8-9.8zm-12 5c-.55 0-1-.45-1-1v-3l-2.29 2.29c-.19.19-.44.29-.71.29s-.52-.1-.71-.29L3.71 13.7c-.39-.39-.39-1.02 0-1.41L9.29 6.7c.39-.39 1.02-.39 1.41 0l1.58 1.58c.39.39.39 1.02 0 1.41L10 11.59V16c0 .55-.45 1-1 1zm8 0c-.55 0-1-.45-1-1v-4.41l-2.29-2.29c-.39-.39-.39-1.02 0-1.41l1.58-1.58c.39-.39 1.02-.39 1.41 0l5.58 5.58c.39.39.39 1.02 0 1.41l-1.58 1.58c-.19.19-.44.29-.71.29s-.52-.1-.71-.29L20 11.59V16c0 .55-.45 1-1 1z" />
            </svg>
          </button>

          {/* Speaker Icon (visual indicator for audio call) */}
          {!isVideoCall && callStatus === 'connected' && (
            <div className="p-5 rounded-full bg-white bg-opacity-20 backdrop-blur-sm">
              <svg className="w-7 h-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Call Type Indicator */}
      <div className="absolute top-6 left-6 bg-black bg-opacity-50 px-4 py-2 rounded-full backdrop-blur-sm">
        <p className="text-white text-sm font-semibold flex items-center gap-2">
          {isVideoCall ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-5 4h4a2 2 0 002-2V8a2 2 0 00-2-2h-4m-8 8V8a2 2 0 012-2h2" />
              </svg>
              Video Call
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Audio Call
            </>
          )}
        </p>
      </div>
    </div>
  );
}

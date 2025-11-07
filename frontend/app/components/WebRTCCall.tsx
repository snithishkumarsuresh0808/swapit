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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
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

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      const audioElement = remoteVideoRef.current as HTMLAudioElement;
      if (isSpeakerOn) {
        audioElement.volume = 0;
        setIsSpeakerOn(false);
      } else {
        audioElement.volume = 1;
        setIsSpeakerOn(true);
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
        <div className="flex items-center gap-4">
          {/* Mute Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-all shadow-2xl transform hover:scale-110 ${
                isMuted
                  ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400 ring-opacity-50'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  <path d="M4.27 3L3 4.27l9 9 .73.73L19 20.27 20.27 19l-2-2-9-9L4.27 3z" fill="white" opacity="0.9"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              )}
            </button>
            <span className="text-white text-xs mt-2 font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={endCall}
              className="p-5 bg-red-600 hover:bg-red-700 rounded-full transition-all shadow-2xl transform hover:scale-110 hover:rotate-12 ring-4 ring-red-400 ring-opacity-50"
              title="End Call"
            >
              <svg className="w-7 h-7 text-white transform rotate-135" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
              </svg>
            </button>
            <span className="text-white text-xs mt-2 font-medium">End</span>
          </div>

          {/* Speaker Button (for audio calls) */}
          {!isVideoCall && (
            <div className="flex flex-col items-center">
              <button
                onClick={toggleSpeaker}
                className={`p-4 rounded-full transition-all shadow-2xl transform hover:scale-110 ${
                  !isSpeakerOn
                    ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400 ring-opacity-50'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                title={isSpeakerOn ? 'Mute Speaker' : 'Unmute Speaker'}
              >
                {isSpeakerOn ? (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                  </svg>
                )}
              </button>
              <span className="text-white text-xs mt-2 font-medium">{isSpeakerOn ? 'Speaker' : 'Muted'}</span>
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

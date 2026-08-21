'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { registerCallSignalHandler, sendCallSignal } from '@/lib/callSignals';
import { getApiUrl } from '@/lib/config';

interface WebRTCCallProps {
  currentUserId: number;
  otherUserId: number;
  otherUserName: string;
  isIncoming?: boolean;
  audioOnly?: boolean;
  offer?: RTCSessionDescriptionInit;
  onClose: () => void;
}

const RING_TIMEOUT_MS = 45000;
const MAX_CALL_DURATION_SECONDS = 3600;
const RECONNECT_INTERVAL_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;

export default function WebRTCCall({
  currentUserId,
  otherUserId,
  otherUserName,
  isIncoming = false,
  audioOnly = true,
  offer,
  onClose,
}: WebRTCCallProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended' | 'reconnecting'>(
    isIncoming ? 'ringing' : 'calling'
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoCall] = useState(!audioOnly);
  const [isCameraOn, setIsCameraOn] = useState(isVideoCall);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('excellent');
  const [copiedLink, setCopiedLink] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);
  const pendingRemoteCandidatesRef = useRef<RTCIceCandidate[]>([]);
  const outgoingRingtoneRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStatusRef = useRef(callStatus);
  const callDurationRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    const unregister = registerCallSignalHandler((signal) => {
      if (signal.sender_id !== otherUserId) return;

      switch (signal.type) {
        case 'call-answer':
          if (!isIncoming && signal.payload?.answer) {
            void handleCallAnswer(signal.payload.answer);
          }
          break;
        case 'ice-candidate':
          if (signal.payload?.candidate) {
            void handleIceCandidate(signal.payload.candidate);
          }
          break;
        case 'call-end':
          stopOutgoingRingtone();
          stopCallDurationTimer();
          setCallStatus('ended');
          cleanup();
          onClose();
          break;
      }
    });

    initializeCall();

    if (!isIncoming && typeof window !== 'undefined') {
      const audio = new Audio('/sounds/calling.wav');
      audio.loop = true;
      audio.volume = 0.5;
      audio.addEventListener('error', () => {
        outgoingRingtoneRef.current = null;
      });
      outgoingRingtoneRef.current = audio;
    }

    return () => {
      unregister();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeCall = async () => {
    try {
      await setupMediaAndPeerConnection();
      if (!isIncoming) {
        await makeCall();
        ringTimeoutRef.current = setTimeout(() => {
          if (callStatusRef.current === 'calling' || callStatusRef.current === 'ringing') {
            sendCallSignal(otherUserId, 'call-end', {});
            cleanup();
            onClose();
          }
        }, RING_TIMEOUT_MS);
      } else if (offer) {
        await answerIncomingCall();
      }
    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Could not initialize call. Please try again.');
      onClose();
    }
  };

  const setupMediaAndPeerConnection = async () => {
    try {
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

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus('connected');
        startCallDurationTimer();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (peerConnectionRef.current?.remoteDescription) {
          sendCallSignal(otherUserId, 'ice-candidate', { candidate: event.candidate });
        } else {
          iceCandidatesQueue.current.push(event.candidate);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setCallStatus('connected');
        startCallDurationTimer();
        reconnectAttemptsRef.current = 0;
        setConnectionQuality('excellent');
      } else if (state === 'disconnected') {
        setConnectionQuality('poor');
        attemptReconnect();
      } else if (state === 'failed') {
        setConnectionQuality('disconnected');
        setCallStatus('reconnecting');
        attemptReconnect();
      } else if (state === 'closed') {
        setCallStatus('ended');
        stopCallDurationTimer();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') {
        setConnectionQuality('excellent');
      } else if (iceState === 'checking') {
        setConnectionQuality('good');
      } else if (iceState === 'disconnected' || iceState === 'failed') {
        setConnectionQuality('poor');
      }
    };
  };

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setCallStatus('ended');
      stopCallDurationTimer();
      cleanup();
      onClose();
      return;
    }

    reconnectAttemptsRef.current += 1;
    setCallStatus('reconnecting');

    if (peerConnectionRef.current && localStreamRef.current) {
      const pc = peerConnectionRef.current;
      const stream = localStreamRef.current;

      const senders = pc.getSenders();
      const newStream = screenStreamRef.current || stream;

      senders.forEach((sender) => {
        const matchingTrack = newStream.getTracks().find(
          (track) => track.kind === sender.track?.kind
        );
        if (matchingTrack && sender.track) {
          sender.replaceTrack(matchingTrack).catch(() => {});
        }
      });

      pc.restartIce();
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (callStatusRef.current === 'reconnecting') {
        attemptReconnect();
      }
    }, RECONNECT_INTERVAL_MS);
  }, [onClose]);

  const startCallDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    callDurationRef.current = 0;
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      callDurationRef.current += 1;
      setCallDuration(callDurationRef.current);

      if (callDurationRef.current >= MAX_CALL_DURATION_SECONDS && callStatusRef.current === 'connected') {
        hangUp();
      }
    }, 1000);
  };

  const stopCallDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const makeCall = async () => {
    if (!peerConnectionRef.current) return;
    try {
      if (outgoingRingtoneRef.current) {
        outgoingRingtoneRef.current.play().catch(() => {});
      }
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      });
      await peerConnectionRef.current.setLocalDescription(offer);

      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const callerName = userData
        ? `${JSON.parse(userData).first_name} ${JSON.parse(userData).last_name}`.trim() || 'Unknown'
        : 'Unknown';

      sendCallSignal(otherUserId, 'call-offer', { offer, caller_name: callerName });
    } catch (error) {
      console.error('Error making call:', error);
    }
  };

  const answerIncomingCall = async () => {
    if (!offer || !peerConnectionRef.current) return;
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      sendCallSignal(otherUserId, 'call-answer', { answer });
      await flushCandidateQueues();
      setCallStatus('connected');
      startCallDurationTimer();
    } catch (error) {
      console.error('Error answering incoming call:', error);
    }
  };

  const flushCandidateQueues = async () => {
    if (!peerConnectionRef.current) return;

    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        sendCallSignal(otherUserId, 'ice-candidate', { candidate });
      }
    }

    const pending = pendingRemoteCandidatesRef.current;
    pendingRemoteCandidatesRef.current = [];
    for (const candidate of pending) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding queued ICE candidate:', error);
      }
    }
  };

  const stopOutgoingRingtone = () => {
    if (outgoingRingtoneRef.current) {
      outgoingRingtoneRef.current.pause();
      outgoingRingtoneRef.current.currentTime = 0;
    }
  };

  const handleCallAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    try {
      stopOutgoingRingtone();
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      await flushCandidateQueues();
      setCallStatus('connected');
      startCallDurationTimer();
    } catch (error) {
      console.error('Error handling call answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    try {
      const iceCandidate = new RTCIceCandidate(candidate);
      if (!peerConnectionRef.current.remoteDescription) {
        pendingRemoteCandidatesRef.current.push(iceCandidate);
        return;
      }
      await peerConnectionRef.current.addIceCandidate(iceCandidate);
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

  const toggleCamera = async () => {
    if (!isVideoCall || !localStreamRef.current || !peerConnectionRef.current) return;

    if (isCameraOn) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        setIsCameraOn(false);
      }
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        localStreamRef.current.addTrack(newVideoTrack);
        setIsCameraOn(true);
      } catch (error) {
        console.error('Error enabling camera:', error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = isCameraOn;
          await sender.replaceTrack(videoTrack);
        }
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }
      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);
      screenTrack.onended = () => {
        toggleScreenShare();
      };
    } catch (error) {
      console.error('Error sharing screen:', error);
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

  const copyMeetingLink = async () => {
    const link = `${window.location.origin}/messages/${otherUserId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const logCallHistory = useCallback(async (outcome: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(getApiUrl('/api/messages/call-history/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callee_id: otherUserId,
          call_type: isVideoCall ? 'video' : 'audio',
          outcome,
          duration_seconds: callDurationRef.current,
        }),
      });
    } catch {}
  }, [otherUserId, isVideoCall]);

  const hangUp = async () => {
    stopOutgoingRingtone();
    sendCallSignal(otherUserId, 'call-end', {});

    const outcome = callDurationRef.current > 0 ? 'completed' : 'missed';
    await logCallHistory(outcome);

    cleanup();
    onClose();
  };

  const cleanup = () => {
    stopOutgoingRingtone();
    stopCallDurationTimer();

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    iceCandidatesQueue.current = [];
    pendingRemoteCandidatesRef.current = [];
  };

  const qualityColor = {
    excellent: 'bg-green-400',
    good: 'bg-yellow-400',
    poor: 'bg-red-400',
    disconnected: 'bg-red-600',
  }[connectionQuality];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col items-center justify-center">
      {!isVideoCall && (
        <audio ref={remoteVideoRef as any} autoPlay playsInline />
      )}

      {isVideoCall && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg z-20">
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
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-5xl font-bold mb-6 shadow-2xl">
          {otherUserName.charAt(0)}
        </div>

        <h2 className="text-white text-3xl font-bold mb-2">{otherUserName}</h2>

        {/* Connection quality indicator */}
        {callStatus === 'connected' && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`w-2 h-2 rounded-full ${qualityColor}`}></div>
            <span className="text-gray-400 text-xs capitalize">{connectionQuality}</span>
          </div>
        )}

        {callStatus === 'reconnecting' && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-yellow-400 text-xs">Reconnecting...</span>
          </div>
        )}

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
              <p className="text-gray-300 text-lg">{formatDuration(callDuration)}</p>
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
        <div className="flex items-center gap-3 flex-wrap justify-center max-w-sm">
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
            <span className="text-white text-[10px] mt-2 font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
          </div>

          {/* End Call Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={hangUp}
              className="p-5 bg-red-600 hover:bg-red-700 rounded-full transition-all shadow-2xl transform hover:scale-110 hover:rotate-12 ring-4 ring-red-400 ring-opacity-50"
              title="End Call"
            >
              <svg className="w-7 h-7 text-white transform rotate-135" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
              </svg>
            </button>
            <span className="text-white text-[10px] mt-2 font-medium">End</span>
          </div>

          {/* Camera Toggle (video calls only) */}
          {isVideoCall && (
            <div className="flex flex-col items-center">
              <button
                onClick={toggleCamera}
                className={`p-4 rounded-full transition-all shadow-2xl transform hover:scale-110 ${
                  !isCameraOn
                    ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400 ring-opacity-50'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {isCameraOn ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-5 4h4a2 2 0 002-2V8a2 2 0 00-2-2h-4m-8 8V8a2 2 0 012-2h2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.36 5.64a9 9 0 010 12.73M15.54 8.46a5 5 0 010 7.07M12 12h.01M4.93 4.93l14.14 14.14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-5 4h4a2 2 0 002-2V8a2 2 0 00-2-2h-4m-8 8V8a2 2 0 012-2h2" />
                  </svg>
                )}
              </button>
              <span className="text-white text-[10px] mt-2 font-medium">{isCameraOn ? 'Camera' : 'Off'}</span>
            </div>
          )}

          {/* Screen Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-all shadow-2xl transform hover:scale-110 ${
                isScreenSharing
                  ? 'bg-green-600 hover:bg-green-700 ring-4 ring-green-400 ring-opacity-50'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <span className="text-white text-[10px] mt-2 font-medium">{isScreenSharing ? 'Sharing' : 'Share'}</span>
          </div>

          {/* Speaker Button (audio calls) */}
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
              <span className="text-white text-[10px] mt-2 font-medium">{isSpeakerOn ? 'Speaker' : 'Muted'}</span>
            </div>
          )}

          {/* Copy Link */}
          <div className="flex flex-col items-center">
            <button
              onClick={copyMeetingLink}
              className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-all shadow-2xl transform hover:scale-110"
              title="Copy meeting link"
            >
              {copiedLink ? (
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
            </button>
            <span className="text-white text-[10px] mt-2 font-medium">{copiedLink ? 'Copied' : 'Link'}</span>
          </div>
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

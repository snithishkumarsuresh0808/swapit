'use client';

import { useEffect, useRef, useState } from 'react';
import { getWsUrl, getApiUrl } from '@/lib/config';
import WebRTCCall from './WebRTCCall';

interface IncomingCall {
  callerId: number;
  callerName: string;
  offer: RTCSessionDescriptionInit;
}

export default function CallManager() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [showCallUI, setShowCallUI] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Get current user ID
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUserId(user.id);

      // Initialize WebSocket for incoming calls
      initializeCallListener(user.id);
    }

    // Initialize ringtone with user's preference or default
    if (typeof window !== 'undefined') {
      const savedRingtone = localStorage.getItem('ringtone') || '/sounds/ringtone.mp3';
      ringtoneRef.current = new Audio(savedRingtone);
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 0.7;

      // Preload the audio
      ringtoneRef.current.load();
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      stopRingtone();
    };
  }, []);

  const initializeCallListener = (userId: number) => {
    const ws = new WebSocket(getWsUrl(`/ws/call/${userId}/`));
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('Call listener WebSocket connected');
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'call-offer') {
        handleIncomingCall(data);
      }
    };

    ws.onerror = (error) => {
      console.error('Call listener WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Call listener WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (currentUserId) {
          initializeCallListener(currentUserId);
        }
      }, 3000);
    };
  };

  const handleIncomingCall = (data: any) => {
    const call: IncomingCall = {
      callerId: data.caller_id,
      callerName: data.caller_name || 'Unknown',
      offer: data.offer,
    };

    setIncomingCall(call);
    playRingtone();
    showBrowserNotification(call.callerName);
  };

  const playRingtone = () => {
    if (ringtoneRef.current) {
      // Reset to beginning
      ringtoneRef.current.currentTime = 0;

      // Try to play
      const playPromise = ringtoneRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Ringtone playing successfully');
          })
          .catch((error) => {
            console.error('Error playing ringtone:', error);
            // If ringtone file not found, use fallback beep
            createBeepSound();
          });
      }
    } else {
      // Fallback if audio element doesn't exist
      createBeepSound();
    }
  };

  const createBeepSound = () => {
    // Create a simple beep using Web Audio API as fallback
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      gainNode.gain.value = 0.3; // Volume

      oscillator.start();
      setTimeout(() => oscillator.stop(), 200); // 200ms beep

      // Repeat beep every 1 second
      const beepInterval = setInterval(() => {
        if (incomingCall) {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = 800;
          gain.gain.value = 0.3;
          osc.start();
          setTimeout(() => osc.stop(), 200);
        } else {
          clearInterval(beepInterval);
        }
      }, 1000);
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  const showBrowserNotification = (callerName: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Incoming Call', {
        body: `${callerName} is calling you...`,
        icon: '/logo.png',
        tag: 'incoming-call',
        requireInteraction: true,
      });
    }
  };

  const acceptCall = () => {
    stopRingtone();
    setShowCallUI(true);
  };

  const rejectCall = () => {
    stopRingtone();

    // Send rejection message
    if (websocketRef.current?.readyState === WebSocket.OPEN && incomingCall) {
      websocketRef.current.send(JSON.stringify({
        type: 'call-end',
        peer_id: incomingCall.callerId,
      }));
    }

    setIncomingCall(null);
  };

  const handleCallClose = () => {
    setShowCallUI(false);
    setIncomingCall(null);
  };

  return (
    <>
      {/* Incoming Call Notification */}
      {incomingCall && !showCallUI && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center animate-fade-in">
          {/* Animated rings */}
          <div className="relative mb-8">
            <div className="absolute inset-0 w-40 h-40 bg-green-500 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute inset-4 w-32 h-32 bg-green-500 rounded-full opacity-40 animate-ping animation-delay-300"></div>
            <div className="relative w-40 h-40 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-6xl font-bold shadow-2xl">
              {incomingCall.callerName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Caller Info */}
          <h2 className="text-white text-4xl font-bold mb-2">{incomingCall.callerName}</h2>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-gray-300 text-xl">Incoming Call...</p>
          </div>

          {/* Call Actions */}
          <div className="flex items-center gap-8">
            {/* Reject Button */}
            <button
              onClick={rejectCall}
              className="flex flex-col items-center group"
            >
              <div className="p-6 bg-red-600 hover:bg-red-700 rounded-full transition-all shadow-lg mb-2">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Decline</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={acceptCall}
              className="flex flex-col items-center group animate-bounce"
            >
              <div className="p-6 bg-green-600 hover:bg-green-700 rounded-full transition-all shadow-lg mb-2">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
                </svg>
              </div>
              <span className="text-white text-sm font-medium">Accept</span>
            </button>
          </div>

          {/* Ringtone indicator */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black bg-opacity-50 px-4 py-2 rounded-full backdrop-blur-sm">
            <svg className="w-5 h-5 text-green-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <span className="text-white text-sm">Ringing...</span>
          </div>
        </div>
      )}

      {/* WebRTC Call UI */}
      {showCallUI && incomingCall && currentUserId && (
        <WebRTCCall
          currentUserId={currentUserId}
          otherUserId={incomingCall.callerId}
          otherUserName={incomingCall.callerName}
          isIncoming={true}
          onClose={handleCallClose}
        />
      )}
    </>
  );
}

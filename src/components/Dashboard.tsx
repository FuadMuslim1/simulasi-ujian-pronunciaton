import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Camera, Mic, Play, AlertCircle, MicOff, VideoOff, RefreshCw } from 'lucide-react';
import { User } from '../types';

// Constants
const DEVICE_CHECK_INTERVAL = 5000; // 5 seconds
const STREAM_STATUS_CHECK_INTERVAL = 2000; // 2 seconds

interface DashboardProps {
  user: User;
  onStart: () => void;
  onDeviceStatusUpdate?: (videoReady: boolean, audioReady: boolean, videoEnabled?: boolean, audioEnabled?: boolean, stream?: MediaStream | null) => void;
}

interface DashboardRef {
  reloadDevices: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  getMediaStream: () => MediaStream | null;
  setRecordingState: (isRecording: boolean) => void;
}

const Dashboard = forwardRef<DashboardRef, DashboardProps>(({ user, onStart, onDeviceStatusUpdate }, ref) => {
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selfRef = useRef<{ toggleVideo: () => void; toggleAudio: () => void }>({ toggleVideo: () => {}, toggleAudio: () => {} });
  
  const [videoReady, setVideoReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Function to inspect the stream tracks independently
  const checkTrackStatus = useCallback((stream: MediaStream | null) => {
    if (!stream) {
        setVideoReady(false);
        setAudioReady(false);
        setVideoEnabled(false);
        setAudioEnabled(false);
        return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    // Check if tracks exist and are live (regardless of enabled state)
    const hasVideoTrack = videoTracks.length > 0;
    const hasAudioTrack = audioTracks.length > 0;
    
    // Check if tracks are live (readyState only, not enabled)
    const isVideoLive = hasVideoTrack && videoTracks.some(track => track.readyState === 'live');
    const isAudioLive = hasAudioTrack && audioTracks.some(track => track.readyState === 'live');

    // Check for ended tracks and attempt recovery
    const hasEndedVideoTrack = hasVideoTrack && videoTracks.some(track => track.readyState === 'ended');
    const hasEndedAudioTrack = hasAudioTrack && audioTracks.some(track => track.readyState === 'ended');

    if (hasEndedVideoTrack || hasEndedAudioTrack) {

      // Recovery will be handled by the polling useEffect
      return;
    }

    // Update ready state based on device availability (not toggle state)
    setVideoReady(isVideoLive);
    setAudioReady(isAudioLive);
    
    // Update enabled state based on track.enabled property
    if (hasVideoTrack) {
      const videoTrack = videoTracks[0];
      setVideoEnabled(videoTrack.enabled);
    } else {
      setVideoEnabled(false);
    }
    
    if (hasAudioTrack) {
      const audioTrack = audioTracks[0];
      setAudioEnabled(audioTrack.enabled);
    } else {
      setAudioEnabled(false);
    }
    
    
  }, []);

  const enableDevices = useCallback(async () => {
    try {
      setPermissionError(false);
      
      // Stop existing tracks if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request camera and microphone separately
      let videoStream: MediaStream | null = null;
      let audioStream: MediaStream | null = null;

      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30 }
          }
        });
      } catch {

        setVideoReady(false);
        setVideoEnabled(false);
      }

      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {

        setAudioReady(false);
        setAudioEnabled(false);
      }

      // Combine streams if at least one is available
      if (videoStream || audioStream) {
        const combinedStream = new MediaStream();
        
        if (videoStream) {
          videoStream.getTracks().forEach(track => combinedStream.addTrack(track));
        }
        
        if (audioStream) {
          audioStream.getTracks().forEach(track => combinedStream.addTrack(track));
        }
        
        streamRef.current = combinedStream;
        
        // Check status will set all states correctly
        checkTrackStatus(combinedStream);

        // Attach to video element
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = combinedStream;
        }
      } else {
        // Both permissions denied
        setPermissionError(true);
        setVideoReady(false);
        setAudioReady(false);
        setVideoEnabled(false);
        setAudioEnabled(false);
      }

    } catch (error) {
      console.error("Device access error:", error);
      setPermissionError(true);
      setVideoReady(false);
      setAudioReady(false);
      setVideoEnabled(false);
      setAudioEnabled(false);
    }
  }, [checkTrackStatus]);

  // SMART AUTO-REFRESH ONLY WHEN DEVICES DISCONNECTED
  useEffect(() => {
    const checkAndReconnect = () => {
      if (streamRef.current && (!videoReady || !audioReady)) {

        enableDevices();
      }
    };

    const checkInterval = setInterval(checkAndReconnect, DEVICE_CHECK_INTERVAL);
    return () => clearInterval(checkInterval);
  }, [enableDevices, videoReady, audioReady]);

  // Update parent component with device status
  useEffect(() => {

    
    
    if (onDeviceStatusUpdate) {
      onDeviceStatusUpdate(videoReady, audioReady, videoEnabled, audioEnabled, streamRef.current);
    }
  }, [videoReady, audioReady, videoEnabled, audioEnabled, onDeviceStatusUpdate]);

  // Check for existing login and session state on mount
  useEffect(() => {

    // Don't auto-start devices in production - wait for user interaction
    // enableDevices(); // Removed auto-start
  }, []);

  // Effect to attach listeners and poll status
  useEffect(() => {
    if (!streamRef.current) return;

    // 1. Event Listener Handler
    const handleTrackChange = () => {
      // Re-run the status check whenever a track changes state
      checkTrackStatus(streamRef.current);
    };

    // 2. Attach listeners to all tracks individually
    streamRef.current.getTracks().forEach(track => {
      track.onmute = handleTrackChange;
      track.onunmute = handleTrackChange;
      track.onended = handleTrackChange; // This is crucial for unplugged devices
      
      // Use addEventListener for better compatibility
      try {
        track.addEventListener('enabled', handleTrackChange);
        track.addEventListener('disabled', handleTrackChange);
      } catch {
        // Fallback for browsers that don't support these events

      }
    });

    // Event listeners are sufficient for real-time status updates

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
            track.onmute = null;
            track.onunmute = null;
            track.onended = null;
            
            // Clean up event listeners
            try {
              track.removeEventListener('enabled', handleTrackChange);
              track.removeEventListener('disabled', handleTrackChange);
            } catch {
              // Ignore cleanup errors for unsupported events
            }
        });
      }
    };
  }, [checkTrackStatus]);

  // Ensure video element gets stream if it re-renders
  useEffect(() => {
    if (videoPreviewRef.current && streamRef.current) {
        videoPreviewRef.current.srcObject = streamRef.current;
    }
  }, [videoReady, streamRef, videoPreviewRef]);

  // Poll status to ensure toggle changes are detected
  useEffect(() => {
    if (!streamRef.current) return;

    const pollInterval = setInterval(() => {
      checkTrackStatus(streamRef.current);
    }, STREAM_STATUS_CHECK_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [checkTrackStatus, streamRef]);

  const allSystemsGo = videoReady && audioReady && videoEnabled && audioEnabled;

  // Expose reloadDevices function to parent component
  useImperativeHandle(ref, () => {
    const toggleVideoFunc = () => {
      
      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();

        videoTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        // Re-check status to update all states correctly
        checkTrackStatus(streamRef.current);
      }
    };

    const toggleAudioFunc = () => {
      
      if (streamRef.current) {
        const audioTracks = streamRef.current.getAudioTracks();

        audioTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        // Re-check status to update all states correctly
        checkTrackStatus(streamRef.current);
      }
    };

    // Store functions in selfRef for internal use
    selfRef.current.toggleVideo = toggleVideoFunc;
    selfRef.current.toggleAudio = toggleAudioFunc;

    return {
      reloadDevices: enableDevices,
      toggleVideo: toggleVideoFunc,
      toggleAudio: toggleAudioFunc,
      getMediaStream: () => streamRef.current
    };
  }, [checkTrackStatus, enableDevices]);

  // Update selfRef whenever stream changes to ensure toggle functions work correctly
  useEffect(() => {

    const toggleVideoFunc = () => {
      
      if (streamRef.current) {
        const videoTracks = streamRef.current.getVideoTracks();
        
        videoTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        // Re-check status to update all states correctly
        checkTrackStatus(streamRef.current);
      }
    };

    const toggleAudioFunc = () => {
      
      if (streamRef.current) {
        const audioTracks = streamRef.current.getAudioTracks();
        
        audioTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        // Re-check status to update all states correctly
        checkTrackStatus(streamRef.current);
      }
    };

    // Update selfRef for internal use
    selfRef.current.toggleVideo = toggleVideoFunc;
    selfRef.current.toggleAudio = toggleAudioFunc;

  }, [checkTrackStatus]);

  return (
    <div className="flex flex-col h-full text-white">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-1">Welcome, <span className="text-amber-500">{user.fullName}</span></h2>
        <p className="text-gray-400">Please review the examination rules and check your equipment.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-grow">
        {/* Rules Section */}
        <div className="lg:w-1/2 space-y-6">
          <div className="bg-gray-900/60 border border-gray-700 p-6 rounded-xl">
            <h3 className="text-amber-500 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Examination Rules
            </h3>
            <ul className="space-y-4 text-gray-300">
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">1</span>
                <span>The exam consists of 3 consecutive sessions.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">2</span>
                <span>Each session has a strict <strong>1-minute</strong> time limit.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">3</span>
                <span>Recording starts automatically. Speak clearly.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">4</span>
                <span>There are short breaks between sessions.</span>
              </li>
              <li className="flex gap-3">
                <span className="bg-gray-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">5</span>
                <span>At the end, you must download your 3 recordings.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Device Check Section */}
        <div className="lg:w-1/2 flex flex-col">
          <div className="relative bg-black rounded-xl overflow-hidden border border-gray-800 shadow-xl flex-grow min-h-[200px] flex flex-col">
            
            {/* Video Area */}
            <div className="relative flex-grow bg-black">
              {streamRef.current ? (
                <video 
                  ref={videoPreviewRef} 
                  autoPlay 
                  muted 
                  playsInline
                  className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-30'}`}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-800" />
                </div>
              )}

              {/* Status Indicators Overlay */}
              {streamRef.current && (
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                  <div className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-2 transition-colors ${videoEnabled ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                    {videoEnabled ? <Camera className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                    {videoEnabled ? 'CAMERA ON' : 'CAMERA OFF'}
                  </div>
                  <div className={`px-3 py-1.5 rounded-md text-xs font-bold border flex items-center gap-2 transition-colors ${audioEnabled ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-red-900/30 border-red-500 text-red-400'}`}>
                    {audioEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    {audioEnabled ? 'MIC ON' : 'MIC OFF'}
                  </div>
                </div>
              )}

              {/* Error Overlay for specific issues */}
              {streamRef.current && (!videoEnabled || !audioEnabled) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-0 p-4 pointer-events-none">
                   {/* Messages are handled by the status bars below mostly, but this adds emphasis */}
                   <div className="flex flex-col gap-2">
                     {!videoEnabled && <div className="bg-red-900/80 px-4 py-2 rounded text-red-200 font-bold flex items-center gap-2 animate-pulse"><VideoOff className="w-5 h-5" /> CAMERA OFF</div>}
                     {!audioEnabled && <div className="bg-red-900/80 px-4 py-2 rounded text-red-200 font-bold flex items-center gap-2 animate-pulse"><MicOff className="w-5 h-5" /> MIC OFF</div>}
                   </div>
                </div>
              )}
            </div>

            {/* Controls & Status Bar */}
            <div className="bg-gray-900 border-t border-gray-800 p-4">
              
              {!streamRef.current ? (
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-3">Click below to enable camera and microphone</p>
                  {permissionError && (
                    <p className="text-red-500 mt-2 text-xs">Permission denied. Check browser settings.</p>
                  )}
                  <button
                    onClick={enableDevices}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto"
                  >
                    <Camera className="w-4 h-4" />
                    Enable Camera & Microphone
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  {/* Smart auto-refresh indicator */}
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <RefreshCw className="w-3 h-3" />
                    <span>Smart monitoring</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onStart}
            disabled={!allSystemsGo}
            className="mt-6 w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 text-lg disabled:shadow-none"
          >
            <Play className="w-6 h-6 fill-current" />
            {allSystemsGo ? 'START EXAMINATION' : 'DEVICES NOT READY'}
          </button>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;



import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { Mic, Timer, ArrowRight, Video, AlertCircle } from 'lucide-react';

interface SessionRecorderProps {
  user: User;
  sessionNumber: number;
  title: string;
  textContent: React.ReactNode;
  onComplete: (blob: Blob) => void;
  mediaStream?: MediaStream | null; // Stream dari Dashboard
}

const SessionRecorder: React.FC<SessionRecorderProps> = ({
  user,
  sessionNumber,
  title,
  textContent,
  onComplete,
  mediaStream,
}) => {
  console.log("🔍 SessionRecorder: Component rendered with mediaStream:", mediaStream);
  console.log("🔍 SessionRecorder: mediaStream details:", {
    exists: !!mediaStream,
    active: mediaStream?.active || false,
    id: mediaStream?.id || 'no-id',
    tracks: mediaStream?.getTracks().length || 0
  });
  
  const [timeLeft, setTimeLeft] = useState(60);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to check if stop event is expected (timer or user finish) vs unexpected (crash)
  const isExpectedToEnd = useRef(false);
  const mountedRef = useRef(true);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 224; // Width of preview (lg:w-56 = 14rem = 224px)
    const maxY = window.innerHeight - 168; // Height of preview (lg:h-42 = 10.5rem = 168px)
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Track mediaStream prop changes
  useEffect(() => {
    console.log("🔍 SessionRecorder: mediaStream prop changed:", {
      exists: !!mediaStream,
      active: mediaStream?.active || false,
      id: mediaStream?.id || 'no-id',
      tracks: mediaStream?.getTracks().length || 0
    });
  }, [mediaStream]);

  // Monitor stream changes during active session (for dashboard toggles)
  useEffect(() => {
    if (!mediaStream || !isRecording) return;

    console.log("🔍 Debug: Monitoring stream changes during recording");
    
    const checkStreamHealth = () => {
      if (!mediaStream) return;
      
      const tracks = mediaStream.getTracks();
      const videoTracks = tracks.filter(t => t.kind === 'video');
      const audioTracks = tracks.filter(t => t.kind === 'audio');
      
      const hasActiveVideo = videoTracks.some(t => t.enabled && t.readyState === 'live');
      const hasActiveAudio = audioTracks.some(t => t.enabled && t.readyState === 'live');
      
      console.log("🔍 Debug: Stream health check:", {
        streamActive: mediaStream.active,
        hasActiveVideo,
        hasActiveAudio,
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length
      });
      
      if (!mediaStream.active || !hasActiveVideo) {
        console.warn("🔍 Debug: Stream health issue detected");
        setError("Camera was turned off. Please return to dashboard and restart session.");
        // Stop recording if stream becomes invalid
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }
    };

    // Check immediately
    checkStreamHealth();
    
    // Set up periodic monitoring
    const interval = setInterval(checkStreamHealth, 2000);
    
    return () => clearInterval(interval);
  }, [mediaStream, isRecording]);

  // Pre-validate and prepare stream before recording
  const prepareStream = (stream: MediaStream): boolean => {
    console.log("🔍 Debug: Preparing stream for recording");
    
    // Check if stream is active
    if (!stream.active) {
      console.error("🔍 Debug: Stream is inactive during preparation");
      return false;
    }
    
    // Enable all tracks to ensure they're ready
    const tracks = stream.getTracks();
    let allTracksReady = true;
    
    tracks.forEach(track => {
      console.log(`🔍 Debug: Track ${track.kind}:`, {
        enabled: track.enabled,
        readyState: track.readyState,
        muted: track.muted
      });
      
      // Enable track if disabled
      if (!track.enabled) {
        console.log("🔍 Debug: Enabling track:", track.kind);
        track.enabled = true;
      }
      
      // Check if track is ready
      if (track.readyState !== 'live') {
        console.warn("🔍 Debug: Track not ready:", track.kind, track.readyState);
        allTracksReady = false;
      }
    });
    
    return allTracksReady;
  };

  // Initialize Stream and Recorder
  useEffect(() => {
    const initializeRecorder = () => {
      console.log("🔍 Debug: initializeRecorder called");
      console.log("🔍 Debug: mediaStream received:", mediaStream);
      console.log("🔍 Debug: mediaStream type:", typeof mediaStream);
      console.log("🔍 Debug: mediaStream.active:", mediaStream?.active || false);
      console.log("🔍 Debug: mediaStream.id:", mediaStream?.id || 'no-id');
      
      if (!mediaStream) {
        console.error("🔍 Debug: No media stream available");
        setError("No media stream available. Please return to dashboard.");
        return;
      }

      // Prepare and validate stream before proceeding
      const isStreamReady = prepareStream(mediaStream);
      if (!isStreamReady) {
        console.log("🔍 Debug: Stream not ready, attempting recovery...");
        
        // Try to recover by enabling tracks
        const tracks = mediaStream.getTracks();
        tracks.forEach(track => {
          if (!track.enabled) {
            track.enabled = true;
            console.log("🔍 Debug: Force-enabled track:", track.kind);
          }
        });
        
        // Wait a moment and check again
        setTimeout(() => {
          const recovered = prepareStream(mediaStream);
          if (!recovered) {
            setError("Stream recovery failed. Please return to dashboard and restart.");
          } else {
            console.log("🔍 Debug: Stream recovery successful, proceeding...");
            // Continue with initialization after recovery
            setTimeout(() => initializeRecorder(), 1000);
          }
        }, 1000);
        return;
      }

      // Check if stream has tracks
      const tracks = mediaStream.getTracks();
      const hasTracks = tracks.length > 0;
      
      if (!hasTracks) {
        console.error("🔍 Debug: No tracks found in stream");
        setError("No camera or microphone tracks found. Please return to dashboard.");
        return;
      }

      // Check if any tracks are ended
      const hasEndedTracks = tracks.some(track => track.readyState === 'ended');
      if (hasEndedTracks) {
        console.error("🔍 Debug: Some tracks have ended");
        setError("Some devices have been disconnected. Please return to dashboard.");
        return;
      }

      try {
        setError(null);
        isExpectedToEnd.current = false;
        
        // Use existing stream from Dashboard
        streamRef.current = mediaStream;
        
        if (videoRef.current) {
          console.log("🔍 Debug: Video element found:", videoRef.current);
          console.log("🔍 Debug: Video element readyState:", videoRef.current.readyState);
          console.log("🔍 Debug: Video element videoWidth:", videoRef.current.videoWidth);
          console.log("🔍 Debug: Video element videoHeight:", videoRef.current.videoHeight);
          
          // Check video tracks
          const videoTracks = mediaStream.getVideoTracks();
          console.log("🔍 Debug: Video tracks found:", videoTracks.length);
          
          if (videoTracks.length === 0) {
            console.error("🔍 Debug: No video tracks found in stream");
            setError("No camera tracks found. Please return to dashboard.");
            return;
          }
          
          // Log detailed track information
          videoTracks.forEach((track, index) => {
            console.log(`🔍 Debug: Video track ${index}:`, {
              id: track.id,
              label: track.label,
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
              kind: track.kind
            });
          });
          
          // Enable video tracks if disabled
          videoTracks.forEach((track) => {
            if (!track.enabled) {
              console.log("🔍 Debug: Enabling disabled video track");
              track.enabled = true;
            }
          });
          
          // Clear any existing stream
          if (videoRef.current.srcObject) {
            console.log("🔍 Debug: Clearing existing video stream");
            videoRef.current.srcObject = null;
          }
          
          // Set stream to video element
          console.log("🔍 Debug: Setting stream to video element");
          videoRef.current.srcObject = mediaStream;
          
          // Verify stream was set
          console.log("🔍 Debug: Video srcObject after setting:", videoRef.current.srcObject);
          
          // Wait for video metadata to load before playing
          videoRef.current.onloadedmetadata = () => {
            console.log("🔍 Debug: Video metadata loaded successfully");
            console.log("🔍 Debug: Video dimensions:", {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            videoRef.current?.play().catch(err => {
              console.error("Video play error after metadata:", err);
            });
          };
          
          // Add error handling for video element
          videoRef.current.onerror = (err) => {
            console.error("🔍 Debug: Video element error:", err);
            setError("Video element error. Please refresh the page.");
          };
          
          // Fallback: Try to play after a short delay if metadata doesn't load
          setTimeout(() => {
            if (videoRef.current) {
              console.log("🔍 Debug: Fallback check - video readyState:", videoRef.current.readyState);
              if (videoRef.current.readyState < 2) {
                console.log("🔍 Debug: Video not ready, attempting force play");
                videoRef.current.play().catch(err => {
                  console.error("Force video play failed:", err);
                });
              } else {
                console.log("🔍 Debug: Video appears ready, checking dimensions:", {
                  width: videoRef.current.videoWidth,
                  height: videoRef.current.videoHeight
                });
              }
            }
          }, 1000);
          
          // Wait for video to be ready before starting recording
          const waitForVideoReady = () => {
            return new Promise<void>((resolve) => {
              if (!videoRef.current) {
                resolve();
                return;
              }
              
              const checkVideo = () => {
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  console.log("🔍 Debug: Video is ready, can start recording");
                  resolve();
                } else {
                  console.log("🔍 Debug: Video not ready yet, waiting...");
                  setTimeout(checkVideo, 100);
                }
              };
              
              // Start checking
              checkVideo();
              
              // Fallback: resolve after 3 seconds anyway
              setTimeout(() => {
                console.log("🔍 Debug: Video ready timeout, proceeding anyway");
                resolve();
              }, 3000);
            });
          };
          
          // Wait for video to be ready, then start recording
          waitForVideoReady().then(() => {
            console.log("🔍 Debug: Starting recording process");
            
            // Final stream check before recording
            if (!mediaStream.active) {
              console.error("🔍 Debug: Stream became inactive before recording");
              setError("Stream became inactive. Please return to dashboard and restart.");
              return;
            }
            
            // Auto start recording
            const recorder = new MediaRecorder(mediaStream);
            console.log("🔍 Debug: MediaRecorder created:", recorder);
            console.log("🔍 Debug: MediaRecorder state:", recorder.state);
            
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunksRef.current.push(e.data);
              }
            };

            recorder.onstop = () => {
              console.log("🔍 Debug: MediaRecorder stopped");
              if (isExpectedToEnd.current) {
                 const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                 onComplete(blob);
              } 
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            console.log("🔍 Debug: recorder.start() called");
            console.log("🔍 Debug: MediaRecorder state after start:", recorder.state);
            
            setIsRecording(true);
            console.log("🔍 Debug: setIsRecording(true) called");
            
            // Start timer immediately after recording starts
            startTimer();
          });

        } else {
          setError("Video element not found. Please refresh page.");
        }

      } catch (err: any) {
        let msg = "Recorder initialization error.";
        if (err.name === 'NotAllowedError') msg = "Access denied. Please check permissions.";
        if (err.name === 'NotFoundError') msg = "No camera or microphone found.";
        if (err.name === 'NotReadableError') msg = "Hardware error. Camera might be in use.";
        setError(msg);
      }
    };

    // Small delay to ensure component is mounted and stream is ready
    const timer = setTimeout(() => {
        initializeRecorder();
    }, 500);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      stopTimer();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      streamRef.current = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [mediaStream]);

  // Timer function
  const startTimer = () => {
        if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
                if (prev <= 1) {
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
        if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFinishSession = () => {
    console.log("🔍 Debug: handleFinishSession called");
    console.log("🔍 Debug: Current error state:", error);
    
    // If there's an error, don't try to finish normally - just go to next session
    if (error) {
      console.log("🔍 Debug: Error detected, forcing session end");
      stopTimer();
      // Create empty blob to maintain flow
      const emptyBlob = new Blob([], { type: 'video/webm' });
      onComplete(emptyBlob);
      return;
    }
    
    stopTimer();
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log("🔍 Debug: Stopping media recorder");
      isExpectedToEnd.current = true;
      mediaRecorderRef.current.stop();
    } else {
      console.log("🔍 Debug: No active recorder to stop");
      // Still complete the session to maintain flow
      const emptyBlob = new Blob([], { type: 'video/webm' });
      onComplete(emptyBlob);
    }
  };

  const progress = ((60 - timeLeft) / 60) * 100;

  // --- STANDARD RENDER ---
  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-amber-500 tracking-wider">SESSION 0{sessionNumber}</h2>
          <p className="text-gray-400 text-sm uppercase tracking-widest">{title}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${isRecording ? 'bg-red-900/30 border-red-500/50' : 'bg-gray-800 border-gray-600'}`}>
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className={`${isRecording ? 'text-red-400' : 'text-gray-400'} font-mono text-xs`}>
              {isRecording ? 'REC' : 'READY'}
            </span>
          </div>
          <div className="flex items-center space-x-2 font-mono text-xl text-amber-500">
            <Timer className="w-5 h-5" />
            <span>00:{timeLeft.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-6 flex-grow">
        
        {/* Script Content - Full Width */}
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 shadow-inner flex-grow">
          <h3 className="text-gray-400 text-xs uppercase mb-4 tracking-widest">Script Content</h3>
          <div className="flex-grow flex items-center justify-center">
            <div className="text-xl md:text-2xl lg:text-3xl leading-relaxed font-serif text-gray-200 text-center max-w-4xl">
              {textContent}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Camera Feed - Draggable */}
      <div 
        className={`fixed bottom-8 right-8 w-48 h-36 lg:w-56 lg:h-42 z-30 transition-shadow ${isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab'}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        <div 
          className="relative w-full h-full bg-black rounded-xl overflow-hidden border-2 border-gray-800 shadow-2xl"
          onMouseDown={handleMouseDown}
        >
          {error ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gray-900">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-red-400 text-sm font-bold">{error}</p>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                muted 
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]" 
                style={{ 
                  backgroundColor: 'black',
                  filter: 'none',
                  WebkitFilter: 'none'
                }}
                data-testid="session-recorder-video"
              />
              
              {/* Drag Handle Indicator */}
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-mono text-gray-400 border border-gray-700 flex items-center gap-1">
                <div className="w-3 h-3 border border-gray-400 rounded-sm"></div>
                <span>DRAG</span>
              </div>
              
              {/* Studio Overlay Elements */}
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-mono text-gray-300 border border-gray-700 flex items-center gap-1">
                <Video className="w-2 h-2 text-green-400" />
                <span>CAM</span>
                <span className="w-px h-2 bg-gray-600 mx-1"></span>
                <Mic className="w-2 h-2 text-green-400" />
                <span>ON</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-400">
          {isRecording ? (
            <span className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Recording in progress...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Preparing recording...</span>
            </span>
          )}
        </div>
        
        <button
          onClick={handleFinishSession}
          disabled={false}
          className={`group flex items-center space-x-3 px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.4)] ${
            error 
              ? 'bg-red-600 hover:bg-red-500 text-white' 
              : isRecording 
                ? 'bg-amber-600 hover:bg-amber-500 text-black'
                : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
          title={error ? "Skip session due to error and continue" : isRecording ? "Finish recording early and go to next session" : "Skip session and continue"}
        >
          <span>{error ? 'SKIP & NEXT' : isRecording ? 'FINISH & NEXT' : 'SKIP & NEXT'}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SessionRecorder;
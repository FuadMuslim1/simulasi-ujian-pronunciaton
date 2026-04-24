import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Timer, ArrowRight, Video, AlertCircle } from 'lucide-react';

interface SessionRecorderProps {
  sessionNumber: number;
  title: string;
  textContent: React.ReactNode;
  onComplete: (blob: Blob) => void;
  mediaStream?: MediaStream | null; // Stream dari Dashboard
}

const SessionRecorder: React.FC<SessionRecorderProps> = ({
  sessionNumber,
  title,
  textContent,
  onComplete,
  mediaStream,
}) => {
  
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
  const onCompleteRef = useRef(onComplete);
  const errorRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);
  
  // Flag to check if stop event is expected (timer or user finish) vs unexpected (crash)
  const isExpectedToEnd = useRef(false);
  const mountedRef = useRef(true);
  const isInitializingRef = useRef(false);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Allow free dragging with minimal constraints (just keep it partially visible)
    const maxX = window.innerWidth - 100; // Keep at least 100px visible
    const maxY = window.innerHeight - 100; // Keep at least 100px visible
    const minX = -150; // Allow 150px to be hidden on the left
    const minY = -100; // Allow 100px to be hidden on top
    
    setPosition({
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(minY, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart]);

  const handleTouchMove = useCallback((e: globalThis.Event) => {
    const touchEvent = e as globalThis.Event & {
      touches: ArrayLike<{ clientX: number; clientY: number }>;
    };
    if (!isDragging || touchEvent.touches.length === 0) return;

    const touch = touchEvent.touches[0];
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    // Allow free dragging with minimal constraints
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    const minX = -150;
    const minY = -100;
    
    setPosition({
      x: Math.max(minX, Math.min(newX, maxX)),
      y: Math.max(minY, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse and touch event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Keep refs in sync to avoid stale closures without re-running heavy recorder effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Monitor stream changes during active session (for dashboard toggles)
  useEffect(() => {
    if (!mediaStream || !isRecording) return;

    const checkStreamHealth = () => {
      if (!mediaStream) return;
      
      const tracks = mediaStream.getTracks();
      const videoTracks = tracks.filter(t => t.kind === 'video');
      
      const hasActiveVideo = videoTracks.some(t => t.enabled && t.readyState === 'live');
      
      if (!mediaStream.active || !hasActiveVideo) {
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
  const prepareStream = useCallback((stream: MediaStream): boolean => {
    
    // Check if stream is active
    if (!stream.active) {
      return false;
    }
    
    // Enable all tracks to ensure they're ready
    const tracks = stream.getTracks();
    let allTracksReady = true;
    
    tracks.forEach(track => {
      
      // Enable track if disabled
      if (!track.enabled) {
        track.enabled = true;
      }
      
      // Check if track is ready
      if (track.readyState !== 'live') {
        allTracksReady = false;
      }
    });
    
    return allTracksReady;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleFinishSession = useCallback(() => {
    // Reset recording state immediately
    setIsRecording(false);

    // If there's an error, don't try to finish normally - just go to next session
    if (errorRef.current) {
      stopTimer();
      // Create empty blob to maintain flow
      const emptyBlob = new Blob([], { type: 'video/webm' });
      onCompleteRef.current(emptyBlob);
      return;
    }

    stopTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      isExpectedToEnd.current = true;
      mediaRecorderRef.current.stop();
    } else {
      // Still complete the session to maintain flow
      const emptyBlob = new Blob([], { type: 'video/webm' });
      onCompleteRef.current(emptyBlob);
    }
  }, [stopTimer]);

  const startTimer = useCallback(() => {
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
  }, [handleFinishSession]);

  // Initialize Stream and Recorder
  useEffect(() => {
    // Prevent race condition - only initialize if not already recording or initializing
    if (isRecordingRef.current || isInitializingRef.current) {
      return;
    }
    
    const initializeRecorder = () => {
      // Set initialization flag
      isInitializingRef.current = true;
      
      if (!mediaStream) {
        setError("No media stream available. Please return to dashboard.");
        isInitializingRef.current = false; // Reset flag on error
        return;
      }

      // Prepare and validate stream before proceeding
      const isStreamReady = prepareStream(mediaStream);
      if (!isStreamReady) {
        // Try to recover by enabling tracks
        const tracks = mediaStream.getTracks();
        tracks.forEach(track => {
          if (!track.enabled) {
            track.enabled = true;
          }
        });
        
        // Wait a moment and check again
        setTimeout(() => {
          const recovered = prepareStream(mediaStream);
          if (!recovered) {
            setError("Stream recovery failed. Please return to dashboard and restart.");
          } else {
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




          
          // Check video tracks
          const videoTracks = mediaStream.getVideoTracks();

          
          if (videoTracks.length === 0) {
            console.error("🔍 Debug: No video tracks found in stream");
            setError("No camera tracks found. Please return to dashboard.");
            return;
          }
          
          // Enable video tracks if disabled
          videoTracks.forEach((track) => {
            if (!track.enabled) {

              track.enabled = true;
            }
          });
          
          // Clear any existing stream
          if (videoRef.current.srcObject) {

            videoRef.current.srcObject = null;
          }
          
          // Set stream to video element

          videoRef.current.srcObject = mediaStream;
          
          // Verify stream was set

          
          // Wait for video metadata to load before playing
          videoRef.current.onloadedmetadata = () => {

            
            videoRef.current?.play().catch(err => {
              console.error("Video play error after metadata:", err);
            });
          };
          
          // Add error handling for video element
          videoRef.current.onerror = (err) => {
            console.error("🔍 Debug: Video element error:", err);
            setError("Video element error. Please continue to next session.");
          };
          
          // Fallback: Try to play after a short delay if metadata doesn't load
          setTimeout(() => {
            if (videoRef.current) {

              if (videoRef.current.readyState < 2) {

                videoRef.current.play().catch(err => {
                  console.error("Force video play failed:", err);
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

                  resolve();
                } else {

                  setTimeout(checkVideo, 100);
                }
              };
              
              // Start checking
              checkVideo();
              
              // Fallback: resolve after 3 seconds anyway
              setTimeout(() => {

                resolve();
              }, 3000);
            });
          };
          
          // Wait for video to be ready, then start recording
          waitForVideoReady().then(() => {

            
            // Final stream check before recording
            if (!mediaStream.active) {
              console.error("🔍 Debug: Stream became inactive before recording");
              setError("Stream became inactive. Please return to dashboard and restart.");
              return;
            }
            
            // Auto start recording with proper codec
            // Check supported mimeTypes and use the best available
            let mimeType = 'video/webm;codecs=vp8,opus';
            
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              // Fallback to vp9
              mimeType = 'video/webm;codecs=vp9,opus';
              
              if (!MediaRecorder.isTypeSupported(mimeType)) {
                // Fallback to h264 (Safari)
                mimeType = 'video/mp4;codecs=h264,aac';
                
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                  // Last resort - use default
                  mimeType = 'video/webm';

                }
              }
            }
            

            
            const recorder = new MediaRecorder(mediaStream, { 
              mimeType,
              videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
            });


            
            recorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                chunksRef.current.push(e.data);
              }
            };

            // Add error handling for MediaRecorder
            recorder.onerror = (event: globalThis.Event) => {
              console.error("🔍 Debug: MediaRecorder error:", event);
              setError("Recording error occurred. Please continue to next session.");
              // Don't auto-restart during recording - let user handle it
            };

            mediaRecorderRef.current = recorder;
            recorder.start();


            
            setIsRecording(true);

            
            // Start timer immediately after recording starts
            startTimer();

            // Simple monitoring - log only, no actions during recording
            const logStreamStatus = () => {
              if (!streamRef.current || mediaRecorderRef.current?.state !== 'recording') {
                return;
              }
              streamRef.current.getTracks();
            };

            // Log status every 10 seconds - non-intrusive
            const statusLogInterval = setInterval(logStreamStatus, 10000);
            
            // Clear logging when recording stops
            recorder.onstop = () => {
              clearInterval(statusLogInterval);

              if (isExpectedToEnd.current) {
                 const blob = new Blob(chunksRef.current, { type: mimeType });
                 onCompleteRef.current(blob);
              } 
            };

          });

        } else {
          setError("Video element not found. Please continue to next session.");
        }

      } catch (err: unknown) {
        let msg = "Recorder initialization error.";
        const errName =
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          typeof (err as { name?: unknown }).name === 'string'
            ? (err as { name: string }).name
            : '';
        if (errName === 'NotAllowedError') msg = "Access denied. Please check permissions.";
        if (errName === 'NotFoundError') msg = "No camera or microphone found.";
        if (errName === 'NotReadableError') msg = "Hardware error. Camera might be in use.";
        setError(msg);
      }
    };

    // Small delay to ensure component is mounted and stream is ready
    const timer = setTimeout(() => {
        initializeRecorder();
    }, 500);
    const videoElementForCleanup = videoRef.current;

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      stopTimer();
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      streamRef.current = null;
      
      if (videoElementForCleanup) {
        videoElementForCleanup.srcObject = null;
      }
      
      // Reset recording state to allow auto-start in next session
      setIsRecording(false);
      isInitializingRef.current = false; // Reset initialization flag
    };
  }, [mediaStream, prepareStream, sessionNumber, startTimer, stopTimer]);

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
          onTouchStart={handleTouchStart}
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


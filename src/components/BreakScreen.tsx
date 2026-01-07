import React, { useRef, useEffect, useState } from 'react';
import { Coffee, ArrowRight, RefreshCw, AlertTriangle, Camera, Mic, VideoOff, MicOff } from 'lucide-react';

interface BreakScreenProps {
  nextSessionName: string;
  onContinue: () => void;
  onReload?: () => void;
  videoReady?: boolean;
  audioReady?: boolean;
  mediaStream?: MediaStream | null;
}

const BreakScreen: React.FC<BreakScreenProps> = ({ 
  nextSessionName, 
  onContinue, 
  onReload, 
  videoReady = false, 
  audioReady = false,
  mediaStream = null
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const allDevicesReady = videoReady && audioReady;
  const [isReloading, setIsReloading] = useState(false);

  const handleReloadClick = () => {
    if (onReload && !isReloading) {
      setIsReloading(true);
      console.log('🔄 BreakScreen: Manual reload triggered');
      onReload();
      
      // Reset loading state after 3 seconds
      setTimeout(() => {
        setIsReloading(false);
      }, 3000);
    }
  };

  // Attach stream to video element when available
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      // Check and enable video tracks if they're disabled
      const videoTracks = mediaStream.getVideoTracks();
      videoTracks.forEach((track) => {
        if (!track.enabled) {
          track.enabled = true;
        }
      });
      
      videoRef.current.srcObject = mediaStream;
      
      // Ensure video plays and loads properly
      videoRef.current.play().catch(() => {
        // Silently handle play errors
      });
      
      // Add event listener to ensure video displays properly
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {
          // Silently handle play errors
        });
      };
    }
  }, [mediaStream]);

  // Auto-reload devices if coming from session refresh (no stream available)
  useEffect(() => {
    if (!mediaStream && onReload) {
      console.log('🔄 BreakScreen: No stream available, auto-reloading devices...');
      // Auto-reload devices after a short delay to ensure component is mounted
      const timer = setTimeout(() => {
        console.log('🔄 BreakScreen: Executing auto-reload...');
        onReload();
      }, 1000); // Increased delay for better reliability
      
      return () => clearTimeout(timer);
    } else if (mediaStream) {
      console.log('🔄 BreakScreen: Stream is available, no auto-reload needed');
    }
  }, [mediaStream, onReload]);

  // Cleanup video element when component unmounts (don't stop tracks - managed by Dashboard)
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-800 rounded-full flex items-center justify-center mb-4 sm:mb-6 animate-pulse">
            <Coffee className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-amber-500" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 text-center">Session Complete</h2>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg text-center mb-6 sm:mb-8 md:mb-12">Take a breath. The next session is ready when you are.</p>

          <div className="bg-gray-900/80 border border-gray-700 p-4 sm:p-6 md:p-8 rounded-xl w-full mb-6 sm:mb-8 md:mb-12">
            <p className="text-gray-500 text-xs sm:text-sm md:text-base uppercase tracking-widest mb-2 text-center">Up Next</p>
            <h3 className="text-base sm:text-lg md:text-2xl font-bold text-amber-500 text-center">{nextSessionName}</h3>
          </div>

          {/* Video Preview Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 sm:p-4 md:p-6 w-full mb-6 sm:mb-8 md:mb-12">
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              {mediaStream ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                    style={{ 
                      backgroundColor: 'transparent',
                      filter: 'none', // Ensure no grayscale filter
                      WebkitFilter: 'none' // Safari compatibility
                    }}
                  />
                  
                  {/* Status Indicators Overlay */}
                  <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 bg-black/60 backdrop-blur-md px-2 sm:px-3 py-1 rounded-md text-xs font-mono text-gray-300 border border-gray-700 flex items-center gap-1 sm:gap-2">
                    <Camera className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 ${videoReady ? 'text-green-400' : 'text-red-400'}`} />
                    <span className="hidden xs:inline sm:inline">CAM: {videoReady ? 'ON' : 'OFF'}</span>
                    <span className="w-px h-2 sm:h-2.5 md:h-3 bg-gray-600 mx-0.5 sm:mx-1"></span>
                    <Mic className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 ${audioReady ? 'text-green-400' : 'text-red-400'}`} />
                    <span className="hidden xs:inline sm:inline">MIC: {audioReady ? 'ACTIVE' : 'INACTIVE'}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <VideoOff className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-600 mx-auto mb-2 sm:mb-4" />
                    <p className="text-gray-500 text-xs sm:text-sm">Camera Preview Unavailable</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Device Status Warning */}
          {!allDevicesReady && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 text-xs sm:text-sm p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6 w-full">
              <p className="font-bold mb-2 flex items-center justify-center gap-2">
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                Devices Not Ready
              </p>
              <p className="mb-4 text-xs sm:text-sm text-center">Please ensure both camera and microphone are enabled before continuing.</p>
              {onReload && (
                <button
                  onClick={handleReloadClick}
                  disabled={isReloading}
                  className={`px-3 py-2 sm:px-4 sm:py-2 md:px-4 md:py-2 rounded-full text-white flex items-center gap-2 mx-auto transition-colors text-xs sm:text-sm ${
                    isReloading 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-red-800 hover:bg-red-700 border border-red-600'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 ${isReloading ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline sm:inline">
                    {isReloading ? 'Reloading...' : 'Reload Devices'}
                  </span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={onContinue}
            disabled={!allDevicesReady}
            className={`group flex items-center justify-center space-x-2 sm:space-x-3 md:space-x-3 px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 md:py-4 rounded-full font-bold transition-all text-sm sm:text-base md:text-base w-full sm:w-auto ${
              allDevicesReady 
                ? 'bg-white text-black hover:bg-gray-200' 
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            <span className="text-center">{allDevicesReady ? 'CONTINUE TO NEXT SESSION' : 'DEVICES NOT READY'}</span>
            <ArrowRight className={`w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 transition-transform ${
              allDevicesReady ? 'group-hover:translate-x-1' : ''
            }`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakScreen;

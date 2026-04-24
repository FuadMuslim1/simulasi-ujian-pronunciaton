import React from 'react';
import { Coffee, ArrowRight, AlertTriangle } from 'lucide-react';

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
  videoReady = false,
  audioReady = false,
  mediaStream: _mediaStream
}) => {
  const allDevicesReady = videoReady && audioReady;

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



          {/* Device Status Warning */}
          {!allDevicesReady && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 text-xs sm:text-sm p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6 w-full">
              <p className="font-bold mb-2 flex items-center justify-center gap-2">
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                Devices Not Ready
              </p>
              <p className="mb-4 text-xs sm:text-sm text-center">Please ensure both camera and microphone are enabled before continuing.</p>
              {/* Reload button removed to maintain exam integrity */}
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


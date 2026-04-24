import React, { useState, useEffect, useCallback } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionRecorder from './components/SessionRecorder';
import BreakScreen from './components/BreakScreen';
import Completion from './components/Completion';
import { AppStep, Recording, User } from './types';
import { Settings2, Menu, X, Lock, Unlock } from 'lucide-react';
import { StreamManager } from './utils/StreamManager';
import { StorageManager } from './utils/StorageManager';
import { indexedDBManager } from './utils/IndexedDBManager';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.LOGIN);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if we're in production
  useEffect(() => {
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    
  }, []);
  const dashboardRef = React.useRef<{ 
    reloadDevices: () => void;
    toggleVideo: () => void;
    toggleAudio: () => void;
    getMediaStream: () => MediaStream | null;
  }>(null);

  // Helper function to stop all streams
  const stopAllStreams = useCallback((stream: MediaStream | null) => {
    StreamManager.stopAllStreams(stream);
  }, []);

  // Stop media stream when completion is reached (but keep recordings)
  useEffect(() => {
    if (currentStep === AppStep.COMPLETION) {


      // Stop current app stream
      stopAllStreams(mediaStream);

      // Stop dashboard stream
      if (dashboardRef.current) {
        const dashboardStream = dashboardRef.current.getMediaStream();
        stopAllStreams(dashboardStream);
      }

      // Clear stream state only (keep recordings!)
      setMediaStream(null);
      setVideoReady(false);
      setAudioReady(false);


    }
  }, [currentStep, mediaStream]);

  // Load recordings from IndexedDB on mount
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        await indexedDBManager.init();
        const savedRecordings = await indexedDBManager.getAllRecordings();
        
        if (savedRecordings && savedRecordings.length > 0) {
          // Recreate URLs for blobs
          const restoredRecordings = savedRecordings.map(rec => ({
            ...rec,
            url: URL.createObjectURL(rec.blob)
          }));
          setRecordings(restoredRecordings);

          
          // Log storage usage
          await indexedDBManager.getStorageEstimate();
        }
      } catch (error) {
        console.error('❌ App: Error loading recordings from IndexedDB:', error);
      }
    };
    
    loadRecordings();
  }, []);

  // Save recordings to IndexedDB whenever they change
  useEffect(() => {
    const saveRecordings = async () => {
      if (recordings.length > 0) {
        try {
          // Save each recording to IndexedDB
          for (const rec of recordings) {
            await indexedDBManager.saveRecording(rec);
          }

          
          // Log storage usage
          await indexedDBManager.getStorageEstimate();
        } catch (error) {
          console.error('❌ App: Error saving recordings to IndexedDB:', error);
        }
      }
    };
    
    saveRecordings();
  }, [recordings]);

  // Check for existing login and session state on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('vocalBoothUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Check if user has completed ALL sessions and redirect to completion
        const savedRecordings = localStorage.getItem('vocalBoothRecordings');
        if (savedRecordings) {
          try {
            const parsedRecordings = JSON.parse(savedRecordings);
            // Only redirect to completion if user has completed all 3 sessions
            if (parsedRecordings.length >= 3) {

              setCurrentStep(AppStep.COMPLETION);
              return;
            } else {

            }
          } catch (error) {
            console.error('Error parsing recordings for redirect:', error);
          }
        }
        
        // Check if user was in a session or break screen and redirect appropriately
        const savedSession = localStorage.getItem('vocalBoothCurrentSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);

          
          // Redirect based on saved session state
          if (sessionData.isBreakScreen) {
            // If was on break screen, stay on the same break screen
            if (sessionData.sessionNumber === 1) {
              setCurrentStep(AppStep.BREAK_1);
            } else if (sessionData.sessionNumber === 2) {
              setCurrentStep(AppStep.BREAK_2);
            } else {
              setCurrentStep(AppStep.DASHBOARD);
            }
          } else if (sessionData.sessionNumber) {
            // If was in a session, redirect to dashboard first
            setCurrentStep(AppStep.DASHBOARD);
          }
        } else {
          // No saved session, go to dashboard
          setCurrentStep(AppStep.DASHBOARD);
        }
        
        // Reset device states on auto-login
        setVideoReady(false);
        setAudioReady(false);
      }
    } catch (error) {
      console.error('❌ App: Error loading from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem('vocalBoothUser');
      localStorage.removeItem('vocalBoothRecordings');
      localStorage.removeItem('vocalBoothCurrentSession');
    }
  }, []);

  const handleLogin = (fullName: string) => {
    const userData = { fullName, docId: fullName };
    setUser(userData);
    setCurrentStep(AppStep.DASHBOARD);

    // Reset device states on fresh login
    setVideoReady(false);
    setAudioReady(false);

    // Save to localStorage for persistence
    localStorage.setItem('vocalBoothUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentStep(AppStep.LOGIN);
    
    // Stop ALL possible streams properly
    stopAllStreams(mediaStream);
    
    // Stop dashboard stream
    if (dashboardRef.current) {
      const dashboardStream = dashboardRef.current.getMediaStream();
      stopAllStreams(dashboardStream);
    }
    
    // Reset device states on logout
    setVideoReady(false);
    setAudioReady(false);
    setMediaStream(null);
    setRecordings([]);
    
    // Clear all localStorage data
    localStorage.removeItem('vocalBoothUser');
    localStorage.removeItem('vocalBoothCurrentSession');
    localStorage.removeItem('vocalBoothRecordings');
    
    // Clear IndexedDB recordings
    indexedDBManager.clearAllRecordings().catch(err => {
      console.error('❌ Failed to clear IndexedDB:', err);
    });
    

    
    // Reload page to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleStartExam = () => {
    setCurrentStep(AppStep.SESSION_1);
    // Save session state for session 1 (not break screen)
    saveSessionState(1, false);
  };

  const handleDeviceStatusUpdate = (videoStatus: boolean, audioStatus: boolean, videoToggleStatus?: boolean, audioToggleStatus?: boolean, stream?: MediaStream | null) => {

    
    
    setVideoReady(videoStatus);
    setAudioReady(audioStatus);
    if (stream !== undefined) {

      if (stream) {
        
      } else {

      }
      setMediaStream(stream);
    }
  };

  const handleReloadDevices = () => {


    // Reset device states
    setVideoReady(false);
    setAudioReady(false);
    setMediaStream(null);

    // If dashboard is available, reload from dashboard
    if (dashboardRef.current) {

      dashboardRef.current.reloadDevices();

      // Wait a bit then get updated stream
      setTimeout(() => {
        const updatedStream = dashboardRef.current?.getMediaStream();
        if (updatedStream) {

          setMediaStream(updatedStream);
        }
      }, 1000);
    } else {

      // For BreakScreen context, we need to request new permissions
      navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).then(stream => {

        setMediaStream(stream);
        setVideoReady(true);
        setAudioReady(true);
      }).catch(error => {
        console.error('🔄 App: Error getting new stream:', error);
      });
    }
  };



  const saveRecording = (blob: Blob, sessionId: number) => {
    if (!user) return;
    
    // Create URL for session persistence
    const url = URL.createObjectURL(blob);
    const filename = `${user.fullName.replace(/\s+/g, '_')}_GEUWAT_Session_${sessionId}.webm`;

    const newRecording: Recording = {
      sessionId,
      blob,
      url,
      filename
    };

    setRecordings(prev => {
      // Remove previous recording for this session if exists
      const filtered = prev.filter(r => r.sessionId !== sessionId);
      return [...filtered, newRecording];
    });

    // Clear session state after a short delay to allow for state transition
    setTimeout(() => {
      localStorage.removeItem('vocalBoothCurrentSession');
    }, 1000);

    // Determine next step
    if (sessionId === 1) setCurrentStep(AppStep.BREAK_1);
    else if (sessionId === 2) setCurrentStep(AppStep.BREAK_2);
    else if (sessionId === 3) setCurrentStep(AppStep.COMPLETION);
  };

  // Save current session state for refresh handling
  const saveSessionState = (sessionId: number, isBreakScreen: boolean = false) => {
    const sessionData = {
      sessionNumber: sessionId,
      isBreakScreen: isBreakScreen,
      timestamp: Date.now()
    };
    localStorage.setItem('vocalBoothCurrentSession', JSON.stringify(sessionData));

  };



  // Save break screen state when user is on break screen
  useEffect(() => {
    if (currentStep === AppStep.BREAK_1) {
      saveSessionState(1, true);
    } else if (currentStep === AppStep.BREAK_2) {
      saveSessionState(2, true);
    }
  }, [currentStep]);

  // Sidebar Logic
  const getSidebarItemClass = (currentStep: AppStep, sessionNumber: number) => {
    const sessionStep = sessionNumber === 1 ? AppStep.SESSION_1 : sessionNumber === 2 ? AppStep.SESSION_2 : AppStep.SESSION_3;
    const breakStep = sessionNumber === 1 ? AppStep.BREAK_1 : sessionNumber === 2 ? AppStep.BREAK_2 : AppStep.COMPLETION;
    
    const isCurrentSession = currentStep === sessionStep;
    const isCurrentBreak = currentStep === breakStep;
    const isCompleted = recordings.find(r => r.sessionId === sessionNumber) || currentStep === breakStep;
    
    const order = [AppStep.DASHBOARD, AppStep.SESSION_1, AppStep.BREAK_1, AppStep.SESSION_2, AppStep.BREAK_2, AppStep.SESSION_3, AppStep.COMPLETION];
    const currentIndex = order.indexOf(currentStep);
    const sessionIndex = order.indexOf(sessionStep);
    const isLocked = currentIndex < sessionIndex && !isCompleted;

    let baseClass = "flex items-center justify-between p-4 rounded-lg border transition-all ";
    
    if (isCurrentSession) return baseClass + "bg-amber-600 border-amber-500 text-black font-bold shadow-lg scale-105";
    if (isCurrentBreak) return baseClass + "bg-blue-900/30 border-blue-500/50 text-blue-400";
    if (isCompleted) return baseClass + "bg-green-900/30 border-green-500/50 text-green-400";
    if (isLocked) return baseClass + "bg-gray-900 border-gray-800 text-gray-600 opacity-60";
    return baseClass + "bg-gray-900 border-gray-800 text-gray-600 opacity-60";
  };

  const getSessionStatus = (sessionNumber: number) => {
    const sessionStep = sessionNumber === 1 ? AppStep.SESSION_1 : sessionNumber === 2 ? AppStep.SESSION_2 : AppStep.SESSION_3;
    const breakStep = sessionNumber === 1 ? AppStep.BREAK_1 : sessionNumber === 2 ? AppStep.BREAK_2 : AppStep.COMPLETION;
    
    const isCurrentSession = currentStep === sessionStep;
    const isCurrentBreak = currentStep === breakStep;
    const isCompleted = recordings.find(r => r.sessionId === sessionNumber) || currentStep === breakStep;
    
    const order = [AppStep.DASHBOARD, AppStep.SESSION_1, AppStep.BREAK_1, AppStep.SESSION_2, AppStep.BREAK_2, AppStep.SESSION_3, AppStep.COMPLETION];
    const currentIndex = order.indexOf(currentStep);
    const sessionIndex = order.indexOf(sessionStep);
    const isLocked = currentIndex < sessionIndex && !isCompleted;

    if (isCurrentSession) return { 
      icon: <Unlock className="w-4 h-4" />, 
      status: 'active',
      numberClass: 'w-8 h-8 rounded-full bg-amber-600 border-2 border-amber-400 flex items-center justify-center text-sm font-bold text-black shadow-lg'
    };
    if (isCurrentBreak) return { 
      icon: <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>, 
      status: 'break',
      numberClass: 'w-8 h-8 rounded-full bg-blue-900/30 border-2 border-blue-500 flex items-center justify-center text-sm font-bold text-blue-400'
    };
    if (isCompleted) return { 
      icon: <div className="w-2 h-2 rounded-full bg-green-500"></div>, 
      status: 'completed',
      numberClass: 'w-8 h-8 rounded-full bg-green-900/30 border-2 border-green-500 flex items-center justify-center text-sm font-bold text-green-400'
    };
    if (isLocked) return { 
      icon: <Lock className="w-4 h-4" />, 
      status: 'locked',
      numberClass: 'w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-sm font-bold text-gray-500'
    };
    return { 
      icon: <Lock className="w-4 h-4" />, 
      status: 'locked',
      numberClass: 'w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-sm font-bold text-gray-500'
    };
  };

  if (currentStep === AppStep.LOGIN) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
      {/* Sidebar */}
      <div className={`w-80 bg-black border-r border-gray-800 flex flex-col p-6 z-20 shadow-2xl fixed md:relative h-full transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center">
              <Settings2 className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">PRONUNCIATION</h1>
              <p className="text-xs text-gray-500">The Examination of Pronunciation</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className={getSidebarItemClass(currentStep, 1)}>
            <div className="flex items-center gap-3">
              <div className={getSessionStatus(1).numberClass}>
                1
              </div>
              <span>Session 01</span>
            </div>
            {getSessionStatus(1).icon}
          </div>
          <div className={getSidebarItemClass(currentStep, 2)}>
            <div className="flex items-center gap-3">
              <div className={getSessionStatus(2).numberClass}>
                2
              </div>
              <span>Session 02</span>
            </div>
            {getSessionStatus(2).icon}
          </div>
          <div className={getSidebarItemClass(currentStep, 3)}>
            <div className="flex items-center gap-3">
              <div className={getSessionStatus(3).numberClass}>
                3
              </div>
              <span>Session 03</span>
            </div>
            {getSessionStatus(3).icon}
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-900">
          <p className="text-gray-500 text-xs">Logged in as</p>
          <p className="text-amber-500 font-bold truncate">{user?.fullName}</p>
          <button 
            onClick={handleLogout}
            className="mt-2 text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 relative overflow-y-auto">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-amber-500">The Examination of Pronunciation</span>
          </div>
          <div className="text-xs bg-gray-800 px-2 py-1 rounded">{currentStep.replace('_', ' ')}</div>
        </div>

        <div className="max-w-6xl mx-auto h-full">
          {currentStep === AppStep.DASHBOARD && user && (
            <Dashboard 
              ref={dashboardRef}
              user={user} 
              onStart={handleStartExam} 
              onDeviceStatusUpdate={handleDeviceStatusUpdate}
            />
          )}

          {currentStep === AppStep.SESSION_1 && user && (
            <SessionRecorder
              user={user}
              sessionNumber={1}
              title="Tongue Twister (American Accent)"
              textContent={
                <p>
                  Betty Botter bought some butter,<br/>
                  but she said, &apos;This butter&apos;s bitter.&apos;<br/>
                  &apos;If I put it in my batter,<br/>
                  it will make my batter bitter.&apos;<br/>
                  But a bit of better butter<br/>
                  will make my batter better.&apos;<br/>
                  So, it was better:<br/>
                  Betty Botter bought a bit of better butter.
                </p>
              }
              mediaStream={mediaStream}
              onComplete={(blob) => saveRecording(blob, 1)}
            />
          )}

          {currentStep === AppStep.BREAK_1 && (
            <BreakScreen 
              nextSessionName="Phonetic Transcription (IPA)" 
              onContinue={() => {
                setCurrentStep(AppStep.SESSION_2);
                saveSessionState(2, false);
              }} 
              onReload={handleReloadDevices}
              videoReady={videoReady}
              audioReady={audioReady}
              mediaStream={mediaStream}
            />
          )}

          {currentStep === AppStep.SESSION_2 && user && (
            <SessionRecorder
              user={user}
              sessionNumber={2}
              title="Phonetic Transcription (American IPA)"
              textContent={
                <p className="font-mono text-amber-200">
                  wɛn aɪ ˈstɑrtɪd, aɪ ˈdɪdənt ˌʌndərˈstænd ˈmɛni θɪŋz. ðə wɜrdz wɜr fæst, ænd ðə saʊndz wɜr kənˈfjuzɪŋ. aɪ mɪst ə lɑt, ænd aɪ meɪd ˈmɛni mɪsˈteɪks, bʌt aɪ ˈdɪdənt stɑp.<br/><br/>

                  aɪv ˈpræktɪst ˈɛvri deɪ. aɪm ˈɡɛtɪŋ ˈbɛtər, ænd maɪ ˈsɛntənsɪz saʊnd ˈklɪrər. ˈsʌmˌtaɪmz aɪ fərˈɡɑt rulz, ænd ˈsʌmˌtaɪmz aɪ mɪst smɔl dɪˈteɪlz, bʌt ðoʊz mɪsˈteɪks hɛlpt mi ɪmˈpruv.<br/><br/>

                  ˈɪŋɡlɪʃ ˈoʊpənz ˈmɛni dɔrz ænd kəˈnɛkts ˈpipəl frʌm ˈdɪfrənt ˈpleɪsɪz. ðə mɔr aɪ ˈpræktɪs, ðə ˈbɛtər ɪt ɡɛts. aɪ ˈhævənt lɜrnd ˈɛvriˌθɪŋ jɛt, bʌt ðæts pɑrt ʌv ðə ˈprɑˌsɛs.<br/><br/>

                  soʊ aɪ doʊnt kwɪt. ˈɛvri ˈlɪtəl stɛp bɪldz maɪ skɪlz, ænd ˈɛvri ˈlɛsən ˈmætərz.
                </p>
              }
              mediaStream={mediaStream}
              onComplete={(blob) => saveRecording(blob, 2)}
            />
          )}

          {currentStep === AppStep.BREAK_2 && (
            <BreakScreen 
              nextSessionName="Original Text Reading" 
              onContinue={() => {
                setCurrentStep(AppStep.SESSION_3);
                saveSessionState(3, false);
              }} 
              onReload={handleReloadDevices}
              videoReady={videoReady}
              audioReady={audioReady}
              mediaStream={mediaStream}
            />
          )}

          {currentStep === AppStep.SESSION_3 && user && (
            <SessionRecorder
              user={user}
              sessionNumber={3}
              title="Original Text Reading"
              textContent={
                <p>
                  When I started, I didn&apos;t understand many things. The words were fast, and the sounds were confusing. I missed a lot, and I made many mistakes, but I didn&apos;t stop.<br/><br/>

                  I&apos;ve practiced every day. I&apos;m getting better, and my sentences sound clearer. Sometimes I forgot rules, and sometimes I missed small details, but those mistakes helped me improve.<br/><br/>

                  English opens many doors and connects people from different places. The more I practice, the better it gets. I haven&apos;t learned everything yet, but that&apos;s part of the process.<br/><br/>

                  So I don&apos;t quit. Every little step builds my skills, and every lesson matters.
                </p>
              }
              mediaStream={mediaStream}
              onComplete={(blob) => saveRecording(blob, 3)}
            />
          )}

          {currentStep === AppStep.COMPLETION && user && (
            <Completion user={user} recordings={recordings} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;


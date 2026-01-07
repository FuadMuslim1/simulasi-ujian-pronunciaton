import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionRecorder from './components/SessionRecorder';
import BreakScreen from './components/BreakScreen';
import Completion from './components/Completion';
import { AppStep, Recording, User } from './types';
import { Lock, Unlock, Settings2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.LOGIN);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const dashboardRef = React.useRef<{ 
    reloadDevices: () => void;
    toggleVideo: () => void;
    toggleAudio: () => void;
    getMediaStream: () => MediaStream | null;
  }>(null);

  // Load recordings from localStorage on mount
  useEffect(() => {
    const savedRecordings = localStorage.getItem('vocalBoothRecordings');
    if (savedRecordings) {
      try {
        const parsedRecordings = JSON.parse(savedRecordings);
        // Recreate Blob objects from stored data
        const restoredRecordings = parsedRecordings.map((rec: any) => ({
          ...rec,
          blob: new Blob([rec.blobData], { type: 'video/webm' })
        }));
        setRecordings(restoredRecordings);
        console.log('🔄 App: Loaded recordings from localStorage:', restoredRecordings.length);
      } catch (error) {
        console.error('Error loading recordings:', error);
        localStorage.removeItem('vocalBoothRecordings');
      }
    }
  }, []);

  // Save recordings to localStorage whenever they change
  useEffect(() => {
    if (recordings.length > 0) {
      const recordingsToSave = recordings.map(rec => ({
        sessionId: rec.sessionId,
        url: rec.url,
        filename: rec.filename,
        blobData: Array.from(new Uint8Array(rec.blob)) // Convert blob to array for storage
      }));
      localStorage.setItem('vocalBoothRecordings', JSON.stringify(recordingsToSave));
      console.log('🔄 App: Saved recordings to localStorage:', recordingsToSave.length);
    }
  }, [recordings]);

  // Check for existing login and session state on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('vocalBoothUser');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Check if user has completed ALL sessions and redirect to completion
        const savedRecordings = localStorage.getItem('vocalBoothRecordings');
        if (savedRecordings) {
          try {
            const parsedRecordings = JSON.parse(savedRecordings);
            // Only redirect to completion if user has completed all 3 sessions
            if (parsedRecordings.length >= 3) {
              console.log('🔄 App: User has completed all sessions, redirecting to completion');
              setCurrentStep(AppStep.COMPLETION);
              return;
            } else {
              console.log('🔄 App: User has completed some sessions but not all, checking session state');
            }
          } catch (error) {
            console.error('Error parsing recordings for redirect:', error);
          }
        }
        
        // Check if user was in a session or break screen and redirect appropriately
        const savedSession = localStorage.getItem('vocalBoothCurrentSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          console.log('🔄 App: Found saved session, redirecting:', sessionData);
          
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
          } else {
            // If was in session, go to break screen
            if (sessionData.sessionNumber === 1) {
              setCurrentStep(AppStep.BREAK_1);
            } else if (sessionData.sessionNumber === 2) {
              setCurrentStep(AppStep.BREAK_2);
            } else if (sessionData.sessionNumber === 3) {
              setCurrentStep(AppStep.COMPLETION);
            } else {
              setCurrentStep(AppStep.DASHBOARD);
            }
          }
        } else {
          setCurrentStep(AppStep.DASHBOARD);
        }
        
        // Reset device states on auto-login
        setVideoReady(false);
        setAudioReady(false);
        setVideoEnabled(false);
        setAudioEnabled(false);
      } catch (error) {
        console.error('Error parsing saved data:', error);
        localStorage.removeItem('vocalBoothUser');
        localStorage.removeItem('vocalBoothCurrentSession');
        setCurrentStep(AppStep.DASHBOARD);
      }
    }
  }, []);

  const handleLogin = (fullName: string) => {
    const userData = { fullName, docId: fullName };
    setUser(userData);
    setCurrentStep(AppStep.DASHBOARD);
    
    // Reset device states on fresh login
    setVideoReady(false);
    setAudioReady(false);
    setVideoEnabled(false);
    setAudioEnabled(false);
    
    // Save to localStorage for persistence
    localStorage.setItem('vocalBoothUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentStep(AppStep.LOGIN);
    
    // Reset device states on logout
    setVideoReady(false);
    setAudioReady(false);
    setVideoEnabled(false);
    setAudioEnabled(false);
    setMediaStream(null); // Reset stream to force re-initialization
    setRecordings([]); // Clear recordings from state
    
    // Clear all localStorage data
    localStorage.removeItem('vocalBoothUser');
    localStorage.removeItem('vocalBoothCurrentSession');
    localStorage.removeItem('vocalBoothRecordings');
  };

  const handleStartExam = () => {
    setCurrentStep(AppStep.SESSION_1);
    // Save session state for session 1 (not break screen)
    saveSessionState(1, false);
  };

  const handleDeviceStatusUpdate = (videoStatus: boolean, audioStatus: boolean, videoToggleStatus?: boolean, audioToggleStatus?: boolean, stream?: MediaStream | null) => {
    console.log("🔄 App: Device status update received");
    console.log("🔄 App: Status details:", {
      videoStatus,
      audioStatus,
      videoToggleStatus,
      audioToggleStatus,
      hasStream: !!stream,
      streamActive: stream?.active,
      streamTracks: stream?.getTracks().length || 0,
      streamId: stream?.id
    });
    
    setVideoReady(videoStatus);
    setAudioReady(audioStatus);
    if (videoToggleStatus !== undefined) setVideoEnabled(videoToggleStatus);
    if (audioToggleStatus !== undefined) setAudioEnabled(audioToggleStatus);
    if (stream !== undefined) {
      console.log("🔄 App: Updating mediaStream state");
      if (stream) {
        console.log("🔄 App: New stream details:", {
          active: stream.active,
          id: stream.id,
          tracks: stream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            readyState: t.readyState,
            label: t.label
          }))
        });
      } else {
        console.log("🔄 App: Stream is null/undefined");
      }
      setMediaStream(stream);
    }
  };

  const handleReloadDevices = () => {
    console.log('🔄 App: handleReloadDevices called');
    
    // Reset device states
    setVideoReady(false);
    setAudioReady(false);
    setVideoEnabled(false);
    setAudioEnabled(false);
    setMediaStream(null);
    
    // If dashboard is available, reload from dashboard
    if (dashboardRef.current) {
      console.log('🔄 App: Reloading from dashboard');
      dashboardRef.current.reloadDevices();
      
      // Wait a bit then get updated stream
      setTimeout(() => {
        const updatedStream = dashboardRef.current?.getMediaStream();
        if (updatedStream) {
          console.log('🔄 App: Got updated stream from dashboard');
          setMediaStream(updatedStream);
        }
      }, 1000);
    } else {
      console.log('🔄 App: Dashboard not available, creating new stream request');
      // For BreakScreen context, we need to request new permissions
      navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      }).then(stream => {
        console.log('🔄 App: Got new stream directly');
        setMediaStream(stream);
        setVideoReady(true);
        setAudioReady(true);
        setVideoEnabled(true);
        setAudioEnabled(true);
      }).catch(error => {
        console.error('🔄 App: Error getting new stream:', error);
      });
    }
  };

  const handleToggleVideo = () => {
    if (dashboardRef.current) {
      dashboardRef.current.toggleVideo();
      // Update stream after toggle
      const updatedStream = dashboardRef.current.getMediaStream();
      if (updatedStream) {
        setMediaStream(updatedStream);
      }
    }
  };

  const handleToggleAudio = () => {
    if (dashboardRef.current) {
      dashboardRef.current.toggleAudio();
      // Update stream after toggle
      const updatedStream = dashboardRef.current.getMediaStream();
      if (updatedStream) {
        setMediaStream(updatedStream);
      }
    }
  };

  const saveRecording = (blob: Blob, sessionId: number) => {
    if (!user) return;
    
    // Create URL for session persistence
    const url = URL.createObjectURL(blob);
    const filename = `${user.fullName.replace(/\s+/g, '_')}_Session_${sessionId}.webm`;

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
    console.log('🔄 App: Saving session state:', sessionData);
  };

  // Clear session state
  const clearSessionState = () => {
    localStorage.removeItem('vocalBoothCurrentSession');
    console.log('🔄 App: Clearing session state');
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
  const getSidebarItemClass = (step: AppStep, itemStep: AppStep, itemNumber: number) => {
    // Basic logic to determine if active, completed, or locked
    // This is simplified mapping
    const order = [
      AppStep.DASHBOARD, 
      AppStep.SESSION_1, AppStep.BREAK_1, 
      AppStep.SESSION_2, AppStep.BREAK_2, 
      AppStep.SESSION_3, AppStep.COMPLETION
    ];
    
    const currentIndex = order.indexOf(step);
    
    // Determine the "Session" index in the array
    let targetIndex = -1;
    if (itemNumber === 1) targetIndex = order.indexOf(AppStep.SESSION_1);
    if (itemNumber === 2) targetIndex = order.indexOf(AppStep.SESSION_2);
    if (itemNumber === 3) targetIndex = order.indexOf(AppStep.SESSION_3);

    const isCurrent = step === (itemNumber === 1 ? AppStep.SESSION_1 : itemNumber === 2 ? AppStep.SESSION_2 : AppStep.SESSION_3);
    const isCompleted = currentIndex > targetIndex;
    const isLocked = currentIndex < targetIndex;

    let baseClass = "flex items-center justify-between p-4 rounded-lg border transition-all ";
    
    if (isCurrent) return baseClass + "bg-amber-600 border-amber-500 text-black font-bold shadow-lg scale-105";
    if (isCompleted) return baseClass + "bg-green-900/30 border-green-500/50 text-green-400";
    return baseClass + "bg-gray-900 border-gray-800 text-gray-600 opacity-60";
  };

  if (currentStep === AppStep.LOGIN) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
      {/* Sidebar */}
      <div className="w-80 bg-black border-r border-gray-800 flex-col p-6 hidden md:flex z-20 shadow-2xl">
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center">
            <Settings2 className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">SIMULATION</h1>
            <p className="text-xs text-gray-500">PRONUNCIATION EXAM</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className={getSidebarItemClass(currentStep, AppStep.SESSION_1, 1)}>
            <span>Session 01</span>
            {currentStep === AppStep.SESSION_1 ? <Unlock className="w-4 h-4" /> : currentStep === AppStep.BREAK_1 || recordings.find(r => r.sessionId === 1) ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Lock className="w-4 h-4" />}
          </div>
          <div className={getSidebarItemClass(currentStep, AppStep.SESSION_2, 2)}>
            <span>Session 02</span>
            {currentStep === AppStep.SESSION_2 ? <Unlock className="w-4 h-4" /> : currentStep === AppStep.BREAK_2 || recordings.find(r => r.sessionId === 2) ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Lock className="w-4 h-4" />}
          </div>
          <div className={getSidebarItemClass(currentStep, AppStep.SESSION_3, 3)}>
            <span>Session 03</span>
            {currentStep === AppStep.SESSION_3 ? <Unlock className="w-4 h-4" /> : currentStep === AppStep.COMPLETION || recordings.find(r => r.sessionId === 3) ? <div className="w-2 h-2 rounded-full bg-green-500"></div> : <Lock className="w-4 h-4" />}
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

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 relative overflow-y-auto">
        {/* Mobile Header (visible only on small screens) */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <span className="font-bold text-amber-500">VOCAL BOOTH</span>
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
                  "Betty Botter bought some butter,<br/>
                  but she said, 'This butter's bitter.'<br/>
                  'If I put it in my batter,<br/>
                  it will make my batter bitter.'<br/>
                  But a bit of better butter<br/>
                  will make my batter better.'<br/>
                  So, it was better:<br/>
                  Betty Botter bought a bit of better butter."
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
                  aɪ juzd tu θɪŋk prəˌnʌnsiˈeɪʃən ˈdɪdənt ˈrɪli ˈmætər, bʌt aɪ wʌz rɔŋ.  
                  wɛn aɪ ˈstɑrtɪd ˈpeɪɪŋ əˈtɛnʃən tu haʊ wɜrdz kəˈnɛkt ænd haʊ saʊndz ɡɛt rɪˈdust, ˈɛvriˌθɪŋ ʧeɪnʤd.  
                  ɪt ˈwʌzənt əˈbaʊt ˈtɔkɪŋ ˈfæstər; ɪt wʌz əˈbaʊt ˈsaʊndɪŋ ˈklɪrər ænd mɔr ˈkɑnfədənt.  

                  æt fɜrst, aɪ fɛlt ˈstupɪd rɪˈpitɪŋ ðə seɪm ˈsɛntəns əˈgɛn ænd əˈgɛn, bʌt aɪ kɛpt æt ɪt.  
                  aɪd ˈlɪsən, pɔz, rɪˈpit, ænd ðɛn du ɪt wʌn mɔr taɪm.  
                  ˈlɪtəl baɪ ˈlɪtəl, aɪ ˈnoʊtəst aɪ ˈwʌzənt ˈgɛsɪŋ ˌɛniˈmɔr; aɪ ˈækʃəli nu wʌt aɪ wʌz ˈseɪɪŋ.  

                  ɪf ju doʊnt kwɪt, jur ˈɡoʊɪŋ tu hɪr ðə ˈdɪfrəns.  
                  wʌn deɪ, jul ˈriəˌlaɪz jʊr nɑt ʤʌst ˈspikɪŋ ˈɪŋɡlɪʃ; jur ˈθɪŋkɪŋ ɪn ɪt.  
                  ænd wɛn ðæt ˈhæpənz, ɔl ði ˈɛfərt tɜrnz aʊt tu bi wɜrθ.
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
                  I used to think pronunciation didn't really matter, but I was wrong.<br/>
                  When I started paying attention to how words connect and how sounds get reduced, everything changed.<br/>
                  It wasn't about talking faster. It was about sounding clearer and more confident.<br/><br/>

                  At first, I felt stupid repeating the same sentence again and again, but I kept at it.<br/>
                  I'd listen, pause, repeat, and then do it one more time.<br/>
                  Little by little, I noticed I wasn't guessing anymore. I actually knew what I was saying.<br/><br/>

                  If you don't quit, you're going to hear the difference.<br/>
                  One day, you'll realize you're not just speaking English. You're thinking in it.<br/>
                  And when that happens, all effort turns out to be worth it.
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

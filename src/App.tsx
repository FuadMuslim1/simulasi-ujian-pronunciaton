import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionRecorder from './components/SessionRecorder';
import BreakScreen from './components/BreakScreen';
import Completion from './components/Completion';
import { AppStep, Recording, User } from './types';
import { Lock, Unlock, Settings2, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.LOGIN);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

  // Check if we're in production
  useEffect(() => {
    setIsProduction(window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');
    console.log("🌍 Environment:", {
      hostname: window.location.hostname,
      isProduction: window.location.hostname !== 'localhost',
      protocol: window.location.protocol,
      userAgent: navigator.userAgent
    });
  }, []);
  const dashboardRef = React.useRef<{ 
    reloadDevices: () => void;
    toggleVideo: () => void;
    toggleAudio: () => void;
    getMediaStream: () => MediaStream | null;
  }>(null);

  // Stop media stream when completion is reached (but keep recordings)
  useEffect(() => {
    if (currentStep === AppStep.COMPLETION) {
      console.log("🔄 App: Completion reached, stopping media streams only");
      
      // Stop all streams but keep recordings intact
      const stopAllStreams = (stream: MediaStream | null) => {
        if (stream) {
          console.log("🔄 App: Stopping stream with tracks:", stream.getTracks().length);
          stream.getTracks().forEach(track => {
            console.log(`🔄 App: Stopping ${track.kind} track:`, track.label);
            track.stop();
          });
        }
      };
      
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
      setVideoEnabled(false);
      setAudioEnabled(false);
      
      console.log("🔄 App: Media streams stopped, recordings preserved for download");
    }
  }, [currentStep]);

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
    try {
      if (recordings.length > 0) {
        const recordingsToSave = recordings.map(rec => ({
          sessionId: rec.sessionId,
          sessionNumber: rec.sessionNumber,
          timestamp: rec.timestamp,
          url: rec.url,
          filename: rec.filename,
          blobData: Array.from(new Uint8Array(rec.blob)) // Convert blob to array for storage
        }));
        localStorage.setItem('vocalBoothRecordings', JSON.stringify(recordingsToSave));
        console.log('🔄 App: Saved recordings to localStorage:', recordingsToSave.length);
      }
    } catch (error) {
      console.error('❌ App: Failed to save recordings to localStorage:', error);
      // Fallback: show error to user
      alert('Failed to save recordings. Your browser may be in private mode or storage is full.');
    }
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
        setVideoEnabled(false);
        setAudioEnabled(false);
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
    setVideoEnabled(false);
    setAudioEnabled(false);
    
    // Save to localStorage for persistence
    localStorage.setItem('vocalBoothUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentStep(AppStep.LOGIN);
    
    // Aggressively stop ALL possible streams
    const stopAllStreams = (stream: MediaStream | null) => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
    };
    
    // Stop current app stream
    stopAllStreams(mediaStream);
    
    // Stop dashboard stream
    if (dashboardRef.current) {
      const dashboardStream = dashboardRef.current.getMediaStream();
      stopAllStreams(dashboardStream);
    }
    
    // Force stop ALL media streams by getting new stream and immediately stopping it
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        console.log('🔄 Force-stopped any remaining streams');
      })
      .catch(() => {
        // No streams to stop, which is good
        console.log('✅ No additional streams found');
      });
    
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
    
    // Force garbage collection to clean up stream references
    if (window.gc) {
      window.gc();
    }
    
    // Additional: Force page reload after a short delay to ensure browser indicators update
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    console.log('🔴 App: User logged out, all streams stopped aggressively');
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
                  aɪ ˈstɑrtɪd ˈlɜrnɪŋ ˈɪŋɡlɪʃ jərz əˈɡoʊ, ænd aɪ ˈstrʌɡəld æt fɜrst.<br/>
                  aɪ ˈpræktɪst ˈɛvri deɪ, rɪˈpitɪd ˈdɪfəkəlt ˈsɛntənsɪz, ænd kəˈrɛktɪd maɪ mɪsˈteɪks.<br/>
                  æt taɪmz, aɪ ˈdaʊtɪd ˌmaɪˈsɛlf, bʌt aɪ riˈmaɪndɪd ˌmaɪˈsɛlf waɪ aɪ ˈstɑrtɪd.<br/><br/>

                  aɪ ˈnoʊtəst ˈprɑˌɡrɛs ˈæftər aɪ wɜrkt hɑrd ænd steɪd ˈfoʊkəst.<br/>
                  ði ˈɛfərt aɪ ɪnˈvɛstɪd rɪˈwɔrdɪd mi wɪð ˈkɑnfədəns ænd skɪl.<br/>
                  ˈivɪn wɛn aɪ fɛlt ˈtaɪərd ɔr ˈfrʌˌstreɪtəd, aɪ riˈmaɪndɪd ˌmaɪˈsɛlf ðæt ˈlɜrnɪŋ ɪz ə ˈprɑˌsɛs, ænd ˈɛvri stɛp ˈmætərd.<br/><br/>

                  aɪ ˈfɪnɪʃt ˈlɛsənz aɪ θɔt aɪ ˈkʊdənt, ˈsɛləˌbreɪtɪd smɔl wɪnz, ænd ʃɛrd wɑt aɪ lɜrnd wɪð ˈʌðərz.<br/>
                  baɪ ˈsteɪɪŋ ˈdɪsəplənd ænd ˈmoʊtəˌveɪtəd, aɪ dɪˈskʌvərd ðæt θɪŋz aɪ wʌns faʊnd hɑrd ˈdɪdənt fil hɑrd ˌɛniˈmɔr.
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
                  I started learning English years ago, and I struggled at first.<br/>
                  I practiced every day, repeated difficult sentences, and corrected my mistakes.<br/>
                  At times, I doubted myself, but I reminded myself why I started.<br/><br/>

                  I noticed progress after I worked hard and stayed focused.<br/>
                  The effort I invested rewarded me with confidence and skill.<br/>
                  Even when I felt tired or frustrated, I reminded myself that learning is a process, and every step mattered.<br/><br/>

                  I finished lessons I thought I couldn't, celebrated small wins, and shared what I learned with others.<br/>
                  By staying disciplined and motivated, I discovered that things I once found hard didn't feel hard anymore.
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

export class StreamManager {
  static stopAllStreams(stream: MediaStream | null): void {
    if (!stream) return;
    
    try {
      stream.getTracks().forEach(track => {
        track.stop();

      });
    } catch (error) {
      console.error('❌ StreamManager: Error stopping streams:', error);
    }
  }
}


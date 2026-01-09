import React from 'react';
import { Download, CheckCircle, UploadCloud } from 'lucide-react';
import { Recording, User } from '../types';

interface CompletionProps {
  user: User;
  recordings: Recording[];
}

const Completion: React.FC<CompletionProps> = ({ user, recordings }) => {
  return (
    <div className="flex flex-col h-full text-white">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Congratulations, {user.fullName}!</h1>
        <p className="text-gray-400">You have successfully completed The Examination of Pronunciation.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 flex-grow">
        
        {/* Download Section */}
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-amber-500 mb-6 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Recordings
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Please download all three video files below. These files are stored temporarily in your session and will be lost if you refresh.
          </p>
          
          <div className="space-y-4">
            {recordings.map((rec) => (
              <a
                key={rec.sessionId}
                href={rec.url}
                download={rec.filename}
                className="block w-full bg-black/40 hover:bg-amber-900/20 border border-gray-700 hover:border-amber-500/50 p-4 rounded-lg transition-all group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white group-hover:text-amber-500 transition-colors">Session 0{rec.sessionId}</p>
                    <p className="text-xs text-gray-500">{rec.filename}</p>
                  </div>
                  <Download className="w-5 h-5 text-gray-500 group-hover:text-amber-500" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Instructions Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-400" />
            Submission Instructions
          </h3>
          
          <ol className="space-y-6 text-gray-300 relative border-l border-gray-700 ml-3 pl-8">
            <li className="relative">
              <span className="absolute -left-[39px] w-6 h-6 bg-blue-900 rounded-full border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold">1</span>
              <strong>Upload to Drive:</strong>
              <p className="text-sm text-gray-400 mt-1">Upload the 3 downloaded video files to your Google Drive or preferred cloud storage.</p>
            </li>
            <li className="relative">
              <span className="absolute -left-[39px] w-6 h-6 bg-blue-900 rounded-full border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold">2</span>
              <strong>Set Permissions:</strong>
              <p className="text-sm text-gray-400 mt-1">Ensure the folder or files are set to "Anyone with the link can view".</p>
            </li>
            <li className="relative">
              <span className="absolute -left-[39px] w-6 h-6 bg-blue-900 rounded-full border-2 border-gray-900 flex items-center justify-center text-[10px] font-bold">3</span>
              <strong>Submit Link:</strong>
              <p className="text-sm text-gray-400 mt-1">Copy the shareable link and submit it as your weekly project assignment.</p>
            </li>
          </ol>

          <div className="mt-8 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30 text-center">
            <p className="text-blue-300 text-sm font-semibold">Great job! See you in the next evaluation.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Completion;

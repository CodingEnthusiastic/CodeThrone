import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface CertificateData {
  isEligible: boolean;
  completionPercentage: number;
  company: string;
  userName: string;
  userEmail: string;
  totalProblems: number;
  solvedProblems: number;
  difficultyStats: {
    easy: { total: number; solved: number };
    medium: { total: number; solved: number };
    hard: { total: number; solved: number };
  };
  completionDate: string | null;
  certificateId: string | null;
}

interface CertificateProps {
  certificateData: CertificateData;
  onDownload: () => void;
}

const Certificate: React.FC<CertificateProps> = ({ certificateData, onDownload }) => {
  const { isDark } = useTheme();
  
  const downloadAsPNG = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 850;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Inner border
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 150);

    // Subtitle
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('Programming Excellence Achievement', canvas.width / 2, 190);

    // User name
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.fillText(certificateData.userName, canvas.width / 2, 280);

    // Description
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('has successfully completed 100% of all coding problems for', canvas.width / 2, 330);

    // Company name
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(certificateData.company, canvas.width / 2, 380);

    // Stats
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Arial, sans-serif';
    ctx.textAlign = 'left';
    
    const statsY = 450;
    const leftCol = 250;
    const rightCol = 750;
    
    ctx.fillText(`Total Problems Solved: ${certificateData.solvedProblems}`, leftCol, statsY);
    ctx.fillText(`Easy: ${certificateData.difficultyStats.easy.solved}/${certificateData.difficultyStats.easy.total}`, leftCol, statsY + 30);
    ctx.fillText(`Medium: ${certificateData.difficultyStats.medium.solved}/${certificateData.difficultyStats.medium.total}`, leftCol, statsY + 60);
    ctx.fillText(`Hard: ${certificateData.difficultyStats.hard.solved}/${certificateData.difficultyStats.hard.total}`, leftCol, statsY + 90);

    // Date and Certificate ID
    ctx.textAlign = 'right';
    ctx.fillText(`Completion Date: ${new Date(certificateData.completionDate!).toLocaleDateString()}`, rightCol, statsY);
    ctx.fillText(`Certificate ID: ${certificateData.certificateId}`, rightCol, statsY + 30);

    // Achievement badge text
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('🏆 CODING MASTER 🏆', canvas.width / 2, 580);

    // Footer
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText('Presented by CodeArena Platform', canvas.width / 2, 720);
    ctx.fillText('Excellence in Competitive Programming', canvas.width / 2, 750);

    // Download
    const link = document.createElement('a');
    link.download = `${certificateData.company}_Certificate_${certificateData.userName}.png`;
    link.href = canvas.toDataURL();
    link.click();

    onDownload();
  };

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 rounded-xl border-2 ${
      isDark 
        ? 'bg-gray-800 border-gray-600 text-white' 
        : 'bg-white border-gray-200 text-gray-900'
    } shadow-2xl`}>
      <div className="text-center mb-6">
        <div className="inline-block p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white mb-4">
          <h2 className="text-2xl font-bold mb-2">🎉 Congratulations! 🎉</h2>
          <p className="text-lg">You've completed 100% of {certificateData.company} problems!</p>
        </div>
      </div>

      {/* Certificate Preview */}
      <div className={`bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-lg text-white mb-6 ${
        isDark ? 'shadow-gray-700' : 'shadow-gray-300'
      } shadow-lg`}>
        <div className="border-4 border-white p-6 rounded-lg bg-white/10 backdrop-blur-sm">
          <div className="text-center">
            <h3 className="text-3xl font-bold mb-2">CERTIFICATE OF COMPLETION</h3>
            <p className="text-lg mb-4">Programming Excellence Achievement</p>
            
            <div className="my-6">
              <p className="text-xl mb-2">This certifies that</p>
              <h4 className="text-4xl font-bold text-yellow-300 mb-2">{certificateData.userName}</h4>
              <p className="text-lg mb-2">has successfully completed 100% of all coding problems for</p>
              <h4 className="text-3xl font-bold text-yellow-300">{certificateData.company}</h4>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6 text-left">
              <div>
                <h5 className="font-semibold mb-2">Problem Statistics:</h5>
                <p>Total Solved: {certificateData.solvedProblems}/{certificateData.totalProblems}</p>
                <p>Easy: {certificateData.difficultyStats.easy.solved}/{certificateData.difficultyStats.easy.total}</p>
                <p>Medium: {certificateData.difficultyStats.medium.solved}/{certificateData.difficultyStats.medium.total}</p>
                <p>Hard: {certificateData.difficultyStats.hard.solved}/{certificateData.difficultyStats.hard.total}</p>
              </div>
              <div className="text-right">
                <p className="mb-2">Completion Date:</p>
                <p className="font-semibold">{new Date(certificateData.completionDate!).toLocaleDateString()}</p>
                <p className="mt-4 mb-2">Certificate ID:</p>
                <p className="font-mono text-sm">{certificateData.certificateId}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-2xl font-bold text-green-300">🏆 CODING MASTER 🏆</p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="text-center">
        <button
          onClick={downloadAsPNG}
          className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold text-lg transition-all duration-300 ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } shadow-lg hover:shadow-xl transform hover:scale-105`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Certificate (PNG)
        </button>
        <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          High-quality certificate for your portfolio
        </p>
      </div>
    </div>
  );
};

export default Certificate;

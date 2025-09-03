import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Award } from 'lucide-react';

interface CertificateProps {
  username: string;
  courseName: string;
  completionDate: Date;
  certificateId: string;
  instructor: string;
  logo?: string;
}

const Certificate: React.FC<CertificateProps> = ({
  username,
  courseName,
  completionDate,
  certificateId,
  instructor,
  logo
}) => {
  const { isDark } = useTheme();
  
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(completionDate);
  
  return (
    <div className="certificate-container">
      {/* Printable styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .certificate-container, .certificate-container * {
            visibility: visible;
          }
          .certificate-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: white !important;
            color: #333 !important;
          }
          .certificate {
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />
      
      <div className={`max-w-4xl mx-auto my-8 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => window.print()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors no-print"
          >
            Print Certificate
          </button>
        </div>
        
        <div className={`certificate p-8 border-8 ${
          isDark 
            ? 'border-gray-700 bg-gray-900 text-white' 
            : 'border-blue-100 bg-gradient-to-br from-blue-50 to-white text-gray-900'
          } rounded-lg shadow-xl`}>
          
          <div className="flex justify-center mb-8">
            {logo ? (
              <img src={logo} alt="CodeThrone Logo" className="h-16" />
            ) : (
              <div className="flex items-center">
                <Award className="h-10 w-10 text-blue-600 mr-2" />
                <h2 className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  CodeThrone
                </h2>
              </div>
            )}
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-serif font-bold uppercase tracking-wider mb-2">Certificate of Completion</h1>
            <div className={`h-1 w-40 mx-auto ${isDark ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
          </div>
          
          <div className="text-center mb-8">
            <p className="text-lg mb-2">This is to certify that</p>
            <h2 className="text-3xl font-bold font-serif mb-2">{username}</h2>
            <p className="text-lg">has successfully completed the course</p>
            <h3 className="text-2xl font-bold mt-2 font-serif">{courseName}</h3>
          </div>
          
          <div className="flex justify-between items-center mb-12 mt-16">
            <div className="text-center">
              <div className="w-40 border-t-2 border-gray-400 pt-2">
                <p>{formattedDate}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-40 border-t-2 border-gray-400 pt-2">
                <p>{instructor}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Instructor</p>
              </div>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            <p>Certificate ID: {certificateId}</p>
            <p className="mt-1">Verify this certificate at <span className="font-medium">codethrone.com/verify</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificate;

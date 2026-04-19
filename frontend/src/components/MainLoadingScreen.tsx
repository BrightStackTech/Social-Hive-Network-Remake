import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

interface MainLoadingScreenProps {
  children: React.ReactNode;
}

const MainLoadingScreen: React.FC<MainLoadingScreenProps> = ({ children }) => {
  const [isServerReady, setIsServerReady] = useState(false);
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

  useEffect(() => {
    const checkServer = async () => {
      try {
        await axios.get(`${SERVER_URL}`, { timeout: 5000 });
        setIsServerReady(true);
      } catch (error: any) {
        if (error.response || error.code === 'ECONNABORTED') {
          setIsServerReady(true);
        } else {
          setTimeout(checkServer, 3000);
        }
      }
    };

    checkServer();
  }, [SERVER_URL]);

  if (!isServerReady) {
    return (
      <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-300 ${isLight ? 'bg-gray-50' : 'bg-[#0f172a]'}`}>
        <div className="relative flex flex-col items-center">
          {/* Logo */}
          <div className={`flex items-center gap-3 mb-10 px-6 py-3 rounded-full border ${isLight ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'}`}>
            <img
              src="https://res.cloudinary.com/domckasfk/image/upload/v1773008287/social-hive-mini-project_tzq4ns.png"
              alt="SocialHive"
              className="h-10 w-10 rounded-full object-cover shadow-lg shadow-primary/30"
            />
            <span className={`text-2xl font-bold tracking-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>SocialHive</span>
          </div>

          {/* Loading Wheel */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className={`w-14 h-14 border-4 border-t-primary rounded-full mb-8 ${isLight ? 'border-black/10' : 'border-white/10'}`}
          />

          {/* Text with Animating Dots */}
          <div className="flex items-center gap-1">
            <span className={`font-medium tracking-tight text-lg ${isLight ? 'text-gray-600' : 'text-slate-300'}`}>
              Please wait, server is loading
            </span>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MainLoadingScreen;

import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Sun, Moon } from 'lucide-react';

import { api } from './services/api';

function App() {
  const [scenario, setScenario] = useState("Simulated Flood");
  const [satelliteSource, setSatelliteSource] = useState("Sentinel-2");
  const [imageryDate, setImageryDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationInput, setLocationInput] = useState("19.0760, 72.8777");
  const [analysisOptions, setAnalysisOptions] = useState({
    damage: true,
    social: true
  });
  const [activeTab, setActiveTab] = useState("map");

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Data State
  const [satelliteImage, setSatelliteImage] = useState(null);
  const [overlayBounds, setOverlayBounds] = useState(null);
  const [damageOverlay, setDamageOverlay] = useState(null);
  const [damageStats, setDamageStats] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [runCompleteAnalysis, setRunCompleteAnalysis] = useState(false);

  const handleFetchImagery = async () => {
    try {
      const { data } = await api.fetchSatelliteImagery({
        source: satelliteSource,
        date: imageryDate,
        location: locationInput
      });
      setSatelliteImage(data.image);
      setOverlayBounds(data.bounds);
    } catch (error) {
      console.error("Error fetching imagery", error);
      alert("Failed to fetch satellite imagery");
    }
  };

  const handleUploadImagery = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.uploadSatelliteImage(formData);
      setSatelliteImage(data.image);
      setOverlayBounds(data.bounds);
    } catch (error) {
      console.error("Error uploading imagery", error);
      alert("Failed to upload satellite imagery");
    }
  };

  const handleRunAnalysis = async () => {
    if (!satelliteImage) {
      alert("Please fetch satellite imagery first!");
      return;
    }

    setIsAnalyzing(true);
    setRunCompleteAnalysis(true);
    try {
      if (analysisOptions.damage) {
        const { data } = await api.detectDamage({
          image: satelliteImage,
          scenario: scenario
        });
        setDamageOverlay(data.overlay);
        setDamageStats({ percentage: data.percentage, details: data.details });
        setActiveTab('damage'); // Switch to damage tab
      }
    } catch (error) {
      console.error("Error running analysis", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-55 dark:bg-black overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-55 dark:bg-black">
        <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-800/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />

        <div className="flex-1 overflow-y-auto z-10">
          <header className="px-8 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-20 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-extrabold bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 dark:from-blue-400 dark:via-cyan-300 dark:to-blue-400 bg-clip-text text-transparent tracking-tight">
                  Artificial-Intelligence-based-Crisis-Management-System
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  System Operational
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 border border-slate-205 dark:border-slate-700 transition-colors"
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark/Black Mode"}
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <div className="px-2.5 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 text-[10px] font-bold rounded-full border border-red-100 dark:border-red-900/40 flex items-center gap-1">
                  LIVE INCIDENT
                </div>
              </div>
            </div>
          </header>

          <div className="p-8">
            <Dashboard
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              scenario={scenario}
              satelliteImage={satelliteImage}
              overlayBounds={overlayBounds}
              damageOverlay={damageOverlay}
              damageStats={damageStats}
              onRunDetection={handleRunAnalysis}
              isAnalyzing={isAnalyzing}
              runCompleteAnalysis={runCompleteAnalysis}
              darkMode={darkMode}
              satelliteSource={satelliteSource}
              setSatelliteSource={setSatelliteSource}
              imageryDate={imageryDate}
              setImageryDate={setImageryDate}
              locationInput={locationInput}
              setLocationInput={setLocationInput}
              onFetchImagery={handleFetchImagery}
              onUploadImagery={handleUploadImagery}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

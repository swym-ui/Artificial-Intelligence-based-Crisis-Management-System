import React from 'react';
import { Map, Zap, MessageSquare, Radio, Bell, Navigation, Car, Home, MessageSquareCode, Sliders } from 'lucide-react';
import CrisisMap from './CrisisMap';
import DamageDetection from './DamageDetection';
import SocialMediaAnalysis from './SocialMediaAnalysis';
import SMSFallback from './SMSFallback';
import CAPAlerts from './CAPAlerts';
import RoutingOptimization from './RoutingOptimization';
import EvacuationRoutes from './EvacuationRoutes';
import ShelterLocator from './ShelterLocator';
import AIDecisionExplanations from './AIDecisionExplanations';
import AIChatAssistant from './AIChatAssistant';
import Simulation from './Simulation';

const tabs = [
    { id: 'map', label: 'Crisis Map', icon: Map },
    { id: 'damage', label: 'Damage Detection', icon: Zap },
    { id: 'social', label: 'Social Media', icon: MessageSquare },
    { id: 'sms', label: 'SMS Fallback', icon: Radio },
    { id: 'alerts', label: 'CAP Alerts', icon: Bell },
    { id: 'routing', label: 'Routing', icon: Navigation },
    { id: 'evac', label: 'Evacuation', icon: Car },
    { id: 'shelter', label: 'Shelters', icon: Home },
    { id: 'simulation', label: 'Simulation', icon: Sliders },
    { id: 'chat', label: 'AI Chat Assistant', icon: MessageSquareCode },
];

const Dashboard = ({ 
    activeTab, 
    setActiveTab, 
    scenario, 
    satelliteImage, 
    overlayBounds, 
    damageOverlay, 
    damageStats, 
    onRunDetection, 
    isAnalyzing, 
    runCompleteAnalysis, 
    darkMode,
    satelliteSource,
    setSatelliteSource,
    imageryDate,
    setImageryDate,
    locationInput,
    setLocationInput,
    onFetchImagery,
    onUploadImagery
}) => {
    return (
        <div className="space-y-6">

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 transition-colors">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap
                                ${isActive
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-205 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }
                            `}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className={`transition-all duration-200 ${
                activeTab === 'chat'
                    ? 'w-full'
                    : 'bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 min-h-[500px]'
            }`}>
                {activeTab === 'map' && (
                    <CrisisMap
                        scenario={scenario}
                        overlayImage={satelliteImage}
                        overlayBounds={overlayBounds}
                        darkMode={darkMode}
                    />
                )}
                {activeTab === 'damage' && (
                    <DamageDetection
                        satelliteImage={satelliteImage}
                        damageOverlay={damageOverlay}
                        damageStats={damageStats}
                        scenario={scenario}
                        onRunDetection={onRunDetection}
                        isLoading={isAnalyzing}
                        satelliteSource={satelliteSource}
                        setSatelliteSource={setSatelliteSource}
                        imageryDate={imageryDate}
                        setImageryDate={setImageryDate}
                        locationInput={locationInput}
                        setLocationInput={setLocationInput}
                        onFetchImagery={onFetchImagery}
                        onUploadImagery={onUploadImagery}
                    />
                )}
                {activeTab === 'social' && <SocialMediaAnalysis scenario={scenario} />}
                {activeTab === 'sms' && <SMSFallback scenario={scenario} />}
                {activeTab === 'alerts' && <CAPAlerts scenario={scenario} darkMode={darkMode} />}
                {activeTab === 'routing' && <RoutingOptimization scenario={scenario} darkMode={darkMode} />}
                {activeTab === 'evac' && <EvacuationRoutes scenario={scenario} darkMode={darkMode} />}
                {activeTab === 'shelter' && <ShelterLocator darkMode={darkMode} />}
                {activeTab === 'simulation' && <Simulation scenario={scenario} darkMode={darkMode} />}
                {activeTab === 'chat' && <AIChatAssistant scenario={scenario} />}
            </div>

            {/* AI Insights Card (rendered below the tab content area) */}
            {activeTab !== 'chat' && activeTab !== 'simulation' && (
                <AIDecisionExplanations 
                    scenario={scenario} 
                    activeTab={activeTab} 
                    runCompleteAnalysis={runCompleteAnalysis}
                    onRunAnalysis={onRunDetection}
                    isAnalyzing={isAnalyzing}
                />
            )}
        </div>
    );
};

export default Dashboard;

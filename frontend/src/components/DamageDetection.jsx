import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Radio, Calendar, MapPin, Upload, Settings, ChevronDown, ChevronUp, Play, CheckCircle } from 'lucide-react';

const DamageDetection = ({
    satelliteImage,
    damageOverlay,
    damageStats,
    scenario,
    onRunDetection,
    isLoading,
    satelliteSource,
    setSatelliteSource,
    imageryDate,
    setImageryDate,
    locationInput,
    setLocationInput,
    onFetchImagery,
    onUploadImagery
}) => {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onUploadImagery(e.dataTransfer.files[0]);
        }
    };

    // If no satellite imagery is fetched, show the setup interface directly in the page!
    if (!satelliteImage) {
        return (
            <div className="space-y-8 animate-fadeIn">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configure Satellite Imagery</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Select a satellite data stream or upload custom aerial imagery to begin the AI damage detection model.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Option: Satellite Feeds */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                    <Radio size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-850 dark:text-white text-base">Live Satellite Data Feed</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Stream imagery directly from international space services</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-650 dark:text-slate-350 uppercase tracking-wider">Select Satellite Source</label>
                                    <select
                                        value={satelliteSource}
                                        onChange={(e) => setSatelliteSource(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                    >
                                        <option value="Sentinel-2">Sentinel-2 (Copernicus)</option>
                                        <option value="NASA GIBS">NASA GIBS (EOSDIS)</option>
                                        <option value="Maxar Open Data">Maxar Open Data Program</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-650 dark:text-slate-350 uppercase tracking-wider">Imagery Capture Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                            <input
                                                type="date"
                                                value={imageryDate}
                                                onChange={(e) => setImageryDate(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-650 dark:text-slate-350 uppercase tracking-wider">Coordinates (Lat, Lon)</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                value={locationInput}
                                                onChange={(e) => setLocationInput(e.target.value)}
                                                placeholder="e.g. 19.0760, 72.8777"
                                                className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onFetchImagery}
                            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 hover:scale-[1.01]"
                        >
                            <Radio size={16} />
                            Fetch Satellite Imagery
                        </button>
                    </div>

                    {/* Right Option: Custom Upload */}
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 flex flex-col justify-between">
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Upload size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-850 dark:text-white text-base">Custom Imagery Upload</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Upload localized high-resolution UAV/drone or custom satellite image</p>
                                </div>
                            </div>

                            <div 
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('custom-satellite-upload-direct').click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                                    dragActive 
                                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/15' 
                                        : 'border-slate-300 dark:border-slate-800 hover:border-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-900/20'
                                }`}
                            >
                                <Upload className="text-slate-400 dark:text-slate-600 mb-3 animate-bounce" size={32} />
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-350">
                                    Drag and drop your image here, or <span className="text-indigo-600 dark:text-indigo-400 font-bold">browse</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Supports JPG, PNG, TIFF up to 25MB</p>
                                <input 
                                    id="custom-satellite-upload-direct" 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            onUploadImagery(e.target.files[0]);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="text-xs text-slate-500 text-center py-2 italic">
                            Uploading files directly overlays coordinate telemetry onto the disaster bounding box automatically.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Top Bar: Title & Primary Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-205 dark:border-slate-800 pb-5">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Damage Assessment</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Comparing pre and post-disaster satellite imagery</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="px-4 py-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all flex items-center gap-2"
                    >
                        <Settings size={16} />
                        Configure Feed
                        {isSettingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    
                    {!damageOverlay && (
                        <button
                            onClick={onRunDetection}
                            disabled={isLoading}
                            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 transition-all disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02]"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Play size={15} fill="currentColor" />
                                    Run Detection Model
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Collapsible Imagery Config Panel */}
            {isSettingsOpen && (
                <div className="bg-slate-55 dark:bg-slate-900/60 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 animate-slideDown">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Settings size={14} />
                        Satellite Imagery & Data Stream Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Satellite Source</label>
                            <select
                                value={satelliteSource}
                                onChange={(e) => setSatelliteSource(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            >
                                <option value="Sentinel-2">Sentinel-2</option>
                                <option value="NASA GIBS">NASA GIBS</option>
                                <option value="Maxar Open Data">Maxar Open Data</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Capture Date</label>
                            <input
                                type="date"
                                value={imageryDate}
                                onChange={(e) => setImageryDate(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Coordinates (Lat, Lon)</label>
                            <input
                                type="text"
                                value={locationInput}
                                onChange={(e) => setLocationInput(e.target.value)}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    onFetchImagery();
                                    setIsSettingsOpen(false);
                                }}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-750 dark:text-slate-300 text-xs font-bold py-2.5 rounded-lg transition-colors"
                            >
                                Refetch Image
                            </button>
                            <button
                                onClick={() => document.getElementById('settings-file-upload').click()}
                                className="px-3 bg-slate-800 hover:bg-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-750 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors"
                                title="Upload Custom File"
                            >
                                <Upload size={14} />
                            </button>
                            <input 
                                id="settings-file-upload" 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        onUploadImagery(e.target.files[0]);
                                        setIsSettingsOpen(false);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Split Screen Imagery Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Original */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-green-500" />
                        Original Pre-Disaster Imagery
                    </h3>
                    <div className="aspect-square rounded-xl overflow-hidden border border-slate-205 dark:border-slate-800 shadow-sm relative group">
                        <img src={satelliteImage} alt="Original Satellite" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>
                </div>

                {/* Damage Overlay */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-red-500" />
                        AI Detected Damage Overlay
                    </h3>
                    {damageOverlay ? (
                        <div className="aspect-square rounded-xl overflow-hidden border border-slate-205 dark:border-slate-800 shadow-sm relative">
                            {/* Composite view: background image + overlay */}
                            <div className="relative w-full h-full">
                                <img src={satelliteImage} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
                                <img src={damageOverlay} alt="Damage Overlay" className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply animate-pulse-slow" />
                            </div>

                            {/* Stats Badge */}
                            <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3 rounded-xl shadow-lg border border-red-100 dark:border-red-950/40">
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Damage Coverage</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{damageStats.percentage}%</p>
                            </div>
                        </div>
                    ) : (
                        <div className="aspect-square rounded-xl bg-slate-100 dark:bg-slate-905 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                            {isLoading ? (
                                <div className="animate-pulse flex flex-col items-center z-10">
                                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                                    <span className="text-sm font-semibold dark:text-slate-300">Executing Computer Vision Assessment...</span>
                                    <span className="text-xs text-slate-500 mt-1">Aligning parameters & marking damage zones</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center z-10 p-6 text-center">
                                    <ArrowRight size={36} className="mb-3 text-slate-350 dark:text-slate-650 group-hover:translate-x-1.5 transition-transform duration-300" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Ready to Run Detection Model</span>
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-[240px]">
                                        Click "Run Detection Model" in the top bar to apply active computer vision algorithms.
                                    </p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                    )}
                </div>
            </div>

            {/* Impact Analysis Details */}
            {damageStats && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div>
                        <h3 className="font-bold text-slate-850 dark:text-white text-base">Detailed Impact Analysis</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Calculated metric variables from spatial neural net segmentation</p>
                    </div>
                    {damageStats.details ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(damageStats.details).map(([key, value], idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">{key}</div>
                                    <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{value}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {scenario === 'Simulated Flood' ? (
                                <>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-105 dark:border-blue-900/30 rounded-xl">
                                        <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-1">Flood Extent</h4>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-sans leading-relaxed">High water levels detected in low-lying residential zones. Primary sector structures require emergency attention.</p>
                                    </div>
                                    <div className="p-4 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-205 dark:border-slate-800 rounded-xl">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Infrastructure Status</h4>
                                        <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">Major roadways potentially compromised by water logging. Recommend emergency routing fallbacks.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-105 dark:border-red-900/30 rounded-xl">
                                        <h4 className="font-bold text-red-800 dark:text-red-300 text-sm mb-1">Structural Damage</h4>
                                        <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">Seismic activity caused significant structural stress in Sector 4. Blockades detected across high density routes.</p>
                                    </div>
                                    <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-105 dark:border-orange-900/30 rounded-xl">
                                        <h4 className="font-bold text-orange-850 dark:text-orange-300 text-sm mb-1">Secondary Hazards</h4>
                                        <p className="text-xs text-orange-605 dark:text-orange-400 leading-relaxed">Potential fire risks identified near industrial zones. Highly recommend routing responders around Sector 8 pipeline grid.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DamageDetection;

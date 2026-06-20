import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
    MessageCircle, 
    MapPin, 
    AlertCircle, 
    TrendingUp, 
    Info, 
    Activity, 
    Sparkles, 
    Filter, 
    Share2, 
    Layers, 
    HeartHandshake,
    ShieldAlert
} from 'lucide-react';

const SocialMediaAnalysis = ({ scenario }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlatform, setSelectedPlatform] = useState("All");
    const [selectedKeyword, setSelectedKeyword] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.getSocialMedia(scenario);
                setData(response.data || []);
            } catch (error) {
                console.error("Error fetching social media data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (scenario) {
            setSelectedKeyword(null); // Reset filters on scenario change
            setSelectedPlatform("All");
            setSearchQuery("");
            fetchData();
        }
    }, [scenario]);

    if (loading) return (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-sm font-medium animate-pulse">Running advanced NLP signal triage...</span>
        </div>
    );

    // List of platforms
    const platformsList = ["All", "Twitter/X", "Facebook", "Instagram", "Reddit"];

    // 1. Dynamic Keyword Frequencies (Word Cloud Data)
    const emergencyKeywords = [
        "Trapped", "Water", "SOS", "Flood", "Rubble", "Fumes", "Evacuate", 
        "Medical", "Food", "NDRF", "Smoke", "Spill", "Aftershock", 
        "Plume", "Outage", "Bridge", "Danger", "Fire", "Seniors", "Kids"
    ];

    const keywordFrequencies = emergencyKeywords.map(word => {
        const count = data.filter(post => post.text.toLowerCase().includes(word.toLowerCase())).length;
        return { word, count };
    }).filter(item => item.count > 0);

    const maxKeywordCount = Math.max(...keywordFrequencies.map(k => k.count), 1);

    // 2. Metrics Aggregations
    const needsCount = data.reduce((acc, curr) => {
        acc[curr.need] = (acc[curr.need] || 0) + 1;
        return acc;
    }, {});

    const sentimentCount = data.reduce((acc, curr) => {
        const sent = curr.sentiment || "Informational";
        acc[sent] = (acc[sent] || 0) + 1;
        return acc;
    }, { "Critical/SOS": 0, "Actionable": 0, "Informational": 0 });

    const platformDistribution = data.reduce((acc, curr) => {
        const plat = curr.platform || "Twitter/X";
        acc[plat] = (acc[plat] || 0) + 1;
        return acc;
    }, { "Twitter/X": 0, "Facebook": 0, "Instagram": 0, "Reddit": 0 });

    // 3. Filtering logic
    const filteredPosts = data.filter(post => {
        // Platform Filter
        if (selectedPlatform !== "All" && post.platform !== selectedPlatform) return false;
        
        // Keyword Filter
        if (selectedKeyword && !post.text.toLowerCase().includes(selectedKeyword.toLowerCase())) return false;
        
        // Search Query Filter
        if (searchQuery && !post.text.toLowerCase().includes(searchQuery.toLowerCase()) && !post.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        return true;
    });

    // Helper color mappings for platform badges
    const getPlatformStyles = (platform) => {
        switch (platform) {
            case "Twitter/X":
                return "bg-sky-50 dark:bg-sky-950/40 text-sky-655 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30";
            case "Facebook":
                return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-655 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30";
            case "Instagram":
                return "bg-pink-50 dark:bg-pink-950/40 text-pink-655 dark:text-pink-400 border border-pink-100 dark:border-pink-900/30";
            case "Reddit":
                return "bg-orange-50 dark:bg-orange-950/40 text-orange-655 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30";
            default:
                return "bg-slate-50 dark:bg-slate-900 text-slate-600 border border-slate-200";
        }
    };

    // Helper color mapping for sentiments
    const getSentimentBadge = (sentiment) => {
        switch (sentiment) {
            case "Critical/SOS":
                return "bg-red-500/10 text-red-655 dark:text-red-400 border border-red-500/20";
            case "Actionable":
                return "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20";
            case "Informational":
            default:
                return "bg-blue-500/10 text-blue-655 dark:text-blue-400 border border-blue-500/20";
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Top Analysis Bar */}
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Social Media Distress Tracker</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        NLP triage pipeline listening to live civilian communication streams.
                    </p>
                </div>

                {/* Filter Actions */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Platform Selector Tabs */}
                    <div className="bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-slate-850 flex items-center gap-1">
                        {platformsList.map(plat => (
                            <button
                                key={plat}
                                onClick={() => setSelectedPlatform(plat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedPlatform === plat
                                        ? 'bg-white dark:bg-slate-905 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-800'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                {plat}
                            </button>
                        ))}
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-3.5 text-slate-450 dark:text-slate-500" size={12} />
                        <input
                            type="text"
                            placeholder="Search keywords or sectors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white dark:bg-slate-950 text-xs border border-slate-250 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 w-56 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-200 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Dashboard Aggregations / KPI Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Platform Triage Card */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                    <h3 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                        <Share2 size={13} className="text-blue-500" />
                        Platform Distribution
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(platformDistribution).map(([plat, count]) => {
                            const percent = data.length > 0 ? (count / data.length) * 100 : 0;
                            return (
                                <div key={plat} className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-700 dark:text-slate-350">{plat}</span>
                                    <div className="flex items-center gap-3 flex-1 ml-4 justify-end">
                                        <div className="w-20 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 hidden sm:block">
                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                                        </div>
                                        <span className="font-mono text-slate-500 dark:text-slate-400 font-bold w-6 text-right">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sentiment Level Card */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                    <h3 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                        <Activity size={13} className="text-red-500" />
                        Triage Sentiment Index
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(sentimentCount).map(([sent, count]) => {
                            const percent = data.length > 0 ? (count / data.length) * 100 : 0;
                            let barColor = "bg-blue-500";
                            if (sent === "Critical/SOS") barColor = "bg-red-500";
                            else if (sent === "Actionable") barColor = "bg-amber-500";

                            return (
                                <div key={sent} className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-700 dark:text-slate-350">{sent}</span>
                                    <div className="flex items-center gap-3 flex-1 ml-4 justify-end">
                                        <div className="w-20 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 hidden sm:block">
                                            <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${percent}%` }} />
                                        </div>
                                        <span className="font-mono text-slate-500 dark:text-slate-400 font-bold w-6 text-right">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Distress Signals / Volume Card */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
                    <h3 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <TrendingUp size={13} className="text-green-500" />
                        Triage Volume Summary
                    </h3>
                    <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/70 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Listen Stream</span>
                            <span className="text-xl font-black text-slate-800 dark:text-white font-mono mt-0.5 block">{data.length} feeds</span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Sparkles size={16} className="animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Keyword Word Cloud Section */}
            <div className="bg-white dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 gap-3">
                    <div>
                        <h3 className="font-bold text-slate-850 dark:text-slate-205 text-sm flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
                            Crisis Keyword Word Cloud
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Frequency-weighted keywords extracted from feeds. Click any word tag to filter posts.</p>
                    </div>
                    
                    {selectedKeyword && (
                        <button
                            onClick={() => setSelectedKeyword(null)}
                            className="bg-red-500/10 text-red-655 dark:text-red-450 px-2.5 py-1 rounded-full text-[10px] font-extrabold hover:bg-red-500/20 border border-red-500/25 transition-all flex items-center gap-1.5"
                        >
                            Reset Filter: {selectedKeyword} ✕
                        </button>
                    )}
                </div>

                {/* Cloud Cluster */}
                {keywordFrequencies.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 py-6 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800/60 rounded-xl p-6 transition-all min-h-[120px]">
                        {keywordFrequencies.map((item, index) => {
                            const ratio = item.count / maxKeywordCount;
                            const isChosen = selectedKeyword === item.word;
                            
                            // Size Class Calculation
                            let sizeClass = "text-xs px-2.5 py-1";
                            if (ratio > 0.75) sizeClass = "text-lg md:text-xl font-extrabold px-4 py-2 border-2 shadow-sm";
                            else if (ratio > 0.45) sizeClass = "text-sm md:text-base font-bold px-3.5 py-1.5 border";
                            else if (ratio > 0.2) sizeClass = "text-xs md:text-sm font-semibold px-3 py-1.5 border border-slate-200/40";

                            // Severity Color Mapping
                            const redKeywords = ["trapped", "sos", "danger", "fumes", "rubble", "fire"];
                            const isUrgent = redKeywords.includes(item.word.toLowerCase());
                            
                            let colorClass = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50";
                            if (isUrgent) {
                                colorClass = "bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50";
                            } else if (ratio > 0.55) {
                                colorClass = "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-450 border-amber-200 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50";
                            }

                            if (isChosen) {
                                colorClass = "bg-blue-600 border-blue-600 text-white hover:bg-blue-500 shadow-md scale-105";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => setSelectedKeyword(item.word)}
                                    className={`${sizeClass} ${colorClass} rounded-xl transition-all duration-200 tracking-tight transform hover:-translate-y-0.5 hover:shadow-xs flex items-center gap-1.5`}
                                >
                                    <span>{item.word}</span>
                                    <span className={`text-[9px] font-mono font-black ${isChosen ? 'text-blue-100' : 'text-slate-450'}`}>
                                        ({item.count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-6 text-xs text-slate-400 italic">No recurring disaster keywords parsed.</div>
                )}
            </div>

            {/* Split Panel: Distress Feeds & Needs Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Dynamic Feeds (filtered) */}
                <div className="lg:col-span-8 space-y-4.5">
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse shrink-0" />
                            Distress Call Feeds
                        </span>
                        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800">
                            Showing {filteredPosts.length} of {data.length}
                        </span>
                    </h3>

                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {filteredPosts.map((post, idx) => (
                            <div 
                                key={idx} 
                                className="bg-white dark:bg-slate-900/50 p-5 rounded-xl border border-slate-205 dark:border-slate-800/80 shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col gap-3"
                            >
                                <p className="text-slate-850 dark:text-slate-200 text-sm font-medium leading-relaxed italic">
                                    "{post.text}"
                                </p>
                                
                                <div className="flex flex-wrap gap-2.5 items-center text-xs text-slate-550 dark:text-slate-400 pt-2.5 border-t border-slate-100/60 dark:border-slate-800/60">
                                    {/* Platform Indicator */}
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getPlatformStyles(post.platform)}`}>
                                        {post.platform || "Twitter/X"}
                                    </span>

                                    {/* Sentiment Indicator */}
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${getSentimentBadge(post.sentiment)}`}>
                                        {post.sentiment || "Informational"}
                                    </span>

                                    {/* Need Badge */}
                                    <span className="flex items-center bg-slate-50 dark:bg-slate-950 px-2.5 py-0.5 rounded text-[10px] font-bold border border-slate-150 dark:border-slate-900/60 text-slate-600 dark:text-slate-400">
                                        Need: {post.need}
                                    </span>

                                    {/* Location */}
                                    <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30 px-2.5 py-0.5 rounded border border-slate-100/50 dark:border-slate-900/30">
                                        <MapPin size={10} className="text-slate-450 dark:text-slate-500 shrink-0" />
                                        {post.location}
                                    </span>

                                    {/* Time */}
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 ml-auto font-bold">{post.timestamp}</span>
                                </div>
                            </div>
                        ))}

                        {filteredPosts.length === 0 && (
                            <div className="text-center py-20 bg-slate-50 dark:bg-slate-950/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-550 flex flex-col items-center">
                                <ShieldAlert size={36} className="text-slate-350 dark:text-slate-650 mb-3 animate-pulse" />
                                <p className="font-bold text-slate-700 dark:text-slate-300">No matching distress calls found</p>
                                <p className="text-xs mt-1 text-slate-500">Try loosening your platform, search, or word cloud filters.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Needs breakdown progress */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                        Needs Assessment
                    </h3>
                    
                    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-205 dark:border-slate-800/80 shadow-xs flex flex-col gap-4">
                        <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Triage Category Summary</span>
                        <div className="space-y-4.5">
                            {Object.entries(needsCount).map(([need, count]) => {
                                const percent = data.length > 0 ? (count / data.length) * 100 : 0;
                                let themeColor = "bg-blue-600 dark:bg-blue-500";
                                if (need === "Search & Rescue") themeColor = "bg-red-500";
                                else if (need === "Medical Assistance") themeColor = "bg-rose-500";
                                else if (need === "Food Supplies" || need === "Drinking Water") themeColor = "bg-amber-500";

                                return (
                                    <div key={need} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{need}</span>
                                            <span className="font-bold text-slate-550 dark:text-slate-400">{count} reports</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 shadow-inner">
                                            <div
                                                className={`${themeColor} h-2 rounded-full transition-all duration-300`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
                            NLP triage automatically classifies civilian posts. Tap any of the high-severity red words in the **Word Cloud** to zoom in on emergency hotspots.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialMediaAnalysis;

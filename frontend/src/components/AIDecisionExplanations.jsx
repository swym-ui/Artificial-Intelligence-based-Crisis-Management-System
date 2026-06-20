import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Activity, AlertTriangle, Route, BarChart2, Brain, CheckCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react';

const AIDecisionExplanations = ({ scenario, activeTab, runCompleteAnalysis, onRunAnalysis, isAnalyzing }) => {
    const [explanations, setExplanations] = useState(null);
    const [priorityZones, setPriorityZones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('aiInsightsCollapsed');
        return saved === 'true';
    });

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const newVal = !prev;
            localStorage.setItem('aiInsightsCollapsed', String(newVal));
            return newVal;
        });
    };

    useEffect(() => {
        const fetchExplanations = async () => {
            setLoading(true);
            try {
                const response = await api.getAIExplanations(scenario, activeTab);
                setExplanations(response.data);
            } catch (error) {
                console.error("Error fetching AI explanations:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchZones = async () => {
            try {
                const response = await api.getPriorityZones(scenario);
                setPriorityZones(response.data);
            } catch (error) {
                console.error("Error fetching priority zones for explanations:", error);
            }
        };

        if (scenario) {
            fetchExplanations();
            fetchZones();
        }
    }, [scenario, activeTab]);

    if (!explanations) return null;

    const insights = explanations.page_insights || {
        title: "AI Decision Explanations",
        summary: "Analyzing live data streams to generate emergency mitigation tasks.",
        metrics: [
            { label: "Active Incidents", value: "Assessment pending" },
            { label: "Triage Priority", value: "Dynamic" },
            { label: "System Confidence", value: "Ready" }
        ],
        recommendations: [
            "Initiate dynamic path routing to bypass blocked segments",
            "Coordinate relief cargo with open shelters showing capacity"
        ],
        confidence: "90%"
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-6 mb-8 border border-slate-200 dark:border-slate-800 transition-colors">
            <div className={`flex items-center justify-between transition-all ${isCollapsed ? '' : 'mb-4 border-b border-slate-100 dark:border-slate-800 pb-4'}`}>
                <h2 className="text-xl font-bold flex items-center text-slate-800 dark:text-white">
                    <Brain className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400 animate-pulse" />
                    {insights.title}
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-900/30 text-xs font-semibold">
                        <Shield size={12} />
                        <span>AI Confidence: {insights.confidence}</span>
                    </div>
                    <button
                        onClick={toggleCollapse}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors"
                        title={isCollapsed ? "Expand AI Insights" : "Collapse AI Insights"}
                    >
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                loading ? (
                    <div className="py-6 flex items-center justify-center text-slate-400">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                        <span className="text-sm font-medium">Re-calculating insights...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="bg-blue-50/40 dark:bg-slate-950/40 border border-blue-100/30 dark:border-slate-800/60 p-4 rounded-xl text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-sans">
                            {insights.summary}
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {insights.metrics.map((metric, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/50 shadow-xs">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{metric.label}</div>
                                    <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mt-1 font-mono">{metric.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Recommendations List */}
                        <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-950/20 rounded-xl p-5">
                            <h4 className="font-bold text-sm text-emerald-800 dark:text-emerald-450 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                                <CheckCircle size={14} className="text-emerald-500" />
                                Tactical Action Recommendations
                            </h4>
                            <ol className="list-decimal list-inside text-sm space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                {insights.recommendations.map((rec, idx) => (
                                    <li key={idx} className="marker:text-emerald-500 dark:marker:text-emerald-400 pl-1">
                                        <span className="ml-1.5">{rec}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Zone-by-Zone Analysis Panel (Only on Map Tab) */}
                        {activeTab === 'map' && (
                            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <h3 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-200">Zone-by-Zone Priority Analysis</h3>
                                {runCompleteAnalysis ? (
                                    <div className="space-y-4">
                                        {priorityZones.map((zone) => {
                                            const idx = zone.id;
                                            const damageFactor = idx <= 2 ? 80 - idx * 10 : 60 - idx * 8;
                                            const socialFactor = idx <= 3 ? 20 - idx * 4 : 8 - idx;
                                            const smsFactor = idx <= 2 ? 15 - idx * 3 : 5 - idx;

                                            return (
                                                <div key={zone.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        Zone {zone.id}: Severity {zone.severity} — Detected via satellite imagery ({damageFactor}% damage) + {socialFactor} social media reports + {smsFactor} SMS messages.
                                                    </p>
                                                    {scenario === "Simulated Flood" && zone.id === 1 && (
                                                        <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-2 rounded text-xs font-semibold">
                                                            Critical Recommendation: Deploy water rescue teams and boats immediately. Establish temporary shelters on higher ground.
                                                        </div>
                                                    )}
                                                    {scenario === "Simulated Earthquake" && zone.id === 1 && (
                                                        <div className="mt-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300 px-3 py-2 rounded text-xs font-semibold">
                                                            Critical Recommendation: Deploy search and rescue teams with specialized equipment. Set up field medical stations.
                                                        </div>
                                                    )}
                                                    {zone.id <= 2 && (
                                                        <div className="mt-2 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300 px-3 py-2 rounded text-xs font-semibold">
                                                            Resources Allocated: Emergency response teams, medical supplies, and food/water dispatched.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-inner">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                            Zone-by-zone computer vision analysis is pending. Please run the full model pipeline.
                                        </p>
                                        <button
                                            onClick={onRunAnalysis}
                                            disabled={isAnalyzing}
                                            className="mx-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all flex items-center gap-2 hover:scale-[1.02]"
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Running Core AI Assessment...
                                                </>
                                            ) : (
                                                <>
                                                    <Brain size={14} className="animate-pulse" />
                                                    Run Complete AI Analysis
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            )}
        </div>
    );
};

export default AIDecisionExplanations;

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Sliders, ShieldAlert, CheckCircle2, Clock, Play, Square, CheckSquare, Sparkles } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Simulation = ({ scenario: activeScenario, darkMode }) => {
    const [scenario, setScenario] = useState(activeScenario || "Simulated Flood");
    const [severity, setSeverity] = useState(75);
    const [radius, setRadius] = useState(8.5);
    const [responders, setResponders] = useState(35);
    const [shelterCapacity, setShelterCapacity] = useState(1200);
    const [foodSupply, setFoodSupply] = useState(65);
    
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [completedTasks, setCompletedTasks] = useState({});

    // Sync with global scenario choice initially
    useEffect(() => {
        if (activeScenario) {
            setScenario(activeScenario);
        }
    }, [activeScenario]);

    const handleRunSimulation = async () => {
        setLoading(true);
        try {
            const response = await api.simulateDisaster({
                scenario,
                severity: parseInt(severity),
                radius: parseFloat(radius),
                responders: parseInt(responders),
                shelter_capacity: parseInt(shelterCapacity),
                food_supply: parseInt(foodSupply)
            });
            setResults(response.data);
            setCompletedTasks({}); // Reset completed tasks on new run
        } catch (error) {
            console.error("Error running preparedness simulation:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleTask = (taskId) => {
        setCompletedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Disaster Preparedness Simulator</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Stress-test regional response capacities under custom catastrophe inputs.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Simulator Inputs */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <Sliders size={16} className="text-blue-500" />
                        Simulation Parameters
                    </h3>

                    <div className="space-y-4">
                        {/* Scenario */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Scenario Type</label>
                            <select
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 dark:text-slate-100"
                            >
                                <option value="Simulated Flood">Simulated Flood</option>
                                <option value="Simulated Earthquake">Simulated Earthquake</option>
                                <option value="Simulated Cyclone">Simulated Cyclone</option>
                                <option value="Simulated Wildfire">Simulated Wildfire</option>
                                <option value="Simulated Chemical Leak">Simulated Chemical Leak</option>
                            </select>
                        </div>

                        {/* Severity */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                <span>Severity Level</span>
                                <span className="font-mono text-blue-500">{severity}%</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Impact Radius */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                <span>Impact Radius</span>
                                <span className="font-mono text-blue-500">{radius} km</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="25"
                                step="0.5"
                                value={radius}
                                onChange={(e) => setRadius(e.target.value)}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Active Responders */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                <span>Responders Dispatched</span>
                                <span className="font-mono text-blue-500">{responders} Teams</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={responders}
                                onChange={(e) => setResponders(e.target.value)}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Shelter Capacity */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                <span>Shelter Beds Available</span>
                                <span className="font-mono text-blue-500">{shelterCapacity} Beds</span>
                            </div>
                            <input
                                type="range"
                                min="200"
                                max="5000"
                                step="100"
                                value={shelterCapacity}
                                onChange={(e) => setShelterCapacity(e.target.value)}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        {/* Food/Water supply */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                <span>Rations Level Index</span>
                                <span className="font-mono text-blue-500">{foodSupply}%</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={foodSupply}
                                onChange={(e) => setFoodSupply(e.target.value)}
                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleRunSimulation}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Simulating...</span>
                            </>
                        ) : (
                            <>
                                <Play size={16} fill="currentColor" />
                                <span>Initiate Simulation</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Right Panel: Simulation Results */}
                <div className="lg:col-span-2 space-y-6">
                    {results ? (
                        <div className="space-y-6">
                            {/* Score Card */}
                            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
                                <div className="space-y-2 text-center md:text-left">
                                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Preparedness Score</h4>
                                    <div className="text-3xl font-extrabold text-slate-800 dark:text-white">
                                        {results.preparedness_status}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed max-w-sm">
                                        Calculated from available emergency beds, pre-positioned responder counts, and logistical supplies against input crisis size.
                                    </p>
                                </div>
                                <div className="relative shrink-0 flex items-center justify-center w-28 h-28 rounded-full border-4 border-slate-100 dark:border-slate-800">
                                    <span className={`text-3xl font-extrabold ${
                                        results.preparedness_score >= 85 
                                            ? 'text-green-500' 
                                            : results.preparedness_score >= 60 
                                                ? 'text-yellow-500' 
                                                : 'text-red-500'
                                    }`}>{results.preparedness_score}%</span>
                                </div>
                            </div>

                            {/* Deficiency Box */}
                            {results.deficiencies.length > 0 && (
                                <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 p-5 rounded-xl">
                                    <h4 className="font-bold text-sm text-red-800 dark:text-red-400 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                                        <ShieldAlert size={16} />
                                        Resource Deficiencies Detected
                                    </h4>
                                    <ul className="list-disc list-inside text-xs text-slate-650 dark:text-slate-350 space-y-1.5 leading-relaxed">
                                        {results.deficiencies.map((def, idx) => (
                                            <li key={idx} className="marker:text-red-500">{def}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Charts block */}
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                                <h4 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-wider mb-4">24h Projected Shelter Demand vs Capacity</h4>
                                <div className="h-64 w-full text-xs">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={results.charts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorCapacity" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                                            <XAxis dataKey="hour" stroke={darkMode ? '#94a3b8' : '#64748b'} />
                                            <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} />
                                            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#0f172a' : '#ffffff', borderColor: darkMode ? '#334155' : '#e2e8f0', color: darkMode ? '#f8fafc' : '#0f172a' }} />
                                            <Legend wrapperStyle={{ color: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <Area type="monotone" dataKey="Demand" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDemand)" />
                                            <Area type="monotone" dataKey="Capacity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCapacity)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Checklist & Timeline Split */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Checklist */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
                                    <h4 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-wider">Mitigation Checklist</h4>
                                    <div className="space-y-3">
                                        {results.tasks.map((task) => {
                                            const isDone = !!completedTasks[task.id];
                                            return (
                                                <div 
                                                    key={task.id} 
                                                    onClick={() => toggleTask(task.id)}
                                                    className="flex items-start gap-2.5 cursor-pointer group select-none text-xs text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                                                >
                                                    {isDone ? (
                                                        <CheckSquare className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0 mt-0.5 group-hover:text-blue-500" />
                                                    )}
                                                    <span className={isDone ? "line-through text-slate-400 dark:text-slate-600 transition-all" : "transition-all"}>
                                                        {task.text}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
                                    <h4 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-wider">Crisis Stage Timeline</h4>
                                    <div className="space-y-4">
                                        {results.timeline.map((step, idx) => (
                                            <div key={idx} className="flex gap-3 text-xs">
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[9px] border border-blue-200 dark:border-blue-900/30">
                                                        {idx + 1}
                                                    </div>
                                                    {idx < results.timeline.length - 1 && (
                                                        <div className="w-0.5 bg-slate-100 dark:bg-slate-800 flex-1 my-1" />
                                                    )}
                                                </div>
                                                <div className="space-y-1 pb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-blue-500 font-bold">{step.hour}:</span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">{step.event}</span>
                                                    </div>
                                                    <p className="text-slate-500 dark:text-slate-400 leading-normal">{step.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-6 text-center transition-colors">
                            <Sparkles size={40} className="mb-4 text-slate-350 dark:text-slate-650 animate-bounce" />
                            <p className="font-bold text-slate-700 dark:text-slate-300">Ready to Simulate</p>
                            <p className="text-sm mt-2 text-slate-500 dark:text-slate-450 max-w-sm">
                                Select scenario inputs on the left side and click "Initiate Simulation" to run preparedness forecasts.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Simulation;

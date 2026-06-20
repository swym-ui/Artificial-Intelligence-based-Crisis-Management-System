import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Smartphone, Signal, MapPin } from 'lucide-react';

const SMSFallback = ({ scenario }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.getSMSMessages(scenario);
                setData(response.data);
            } catch (error) {
                console.error("Error fetching SMS data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (scenario) {
            fetchData();
        }
    }, [scenario]);

    if (loading) return <div className="text-center p-4 dark:text-slate-350">Loading SMS gateway data...</div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800 p-4 rounded-xl transition-colors">
                <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 tracking-wider">Network Status (Offline Areas)</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <Signal className={`w-5 h-5 mr-3 shrink-0 ${parseInt(data.stats.processing_rate) > 90 ? 'text-green-500' : 'text-yellow-500'}`} />
                        <div>
                            <div className="text-2xl font-bold dark:text-slate-100">{data.stats.processing_rate}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Processing Rate</div>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Smartphone className="w-5 h-5 mr-3 text-blue-500 shrink-0" />
                        <div>
                            <div className="text-2xl font-bold dark:text-slate-100">{data.stats.active_towers}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Active Towers</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg dark:text-white">Incoming SMS Reports</h3>
                {data.messages.map((msg, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900/50 p-4 rounded-xl shadow-sm border border-gray-205 dark:border-slate-800/80 border-l-4 border-l-orange-400 dark:border-l-l-orange-500 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-slate-950 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 border border-gray-200/20 dark:border-slate-800 transition-colors">ID: SMS-{1000 + idx}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{msg.timestamp}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 font-medium mb-2">{msg.message}</p>
                        <div className="flex gap-2 text-xs">
                            <span className="flex items-center text-slate-550 dark:text-slate-400">
                                <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                                {msg.location}
                            </span>
                            <span className="bg-orange-50 dark:bg-orange-950/40 text-orange-750 dark:text-orange-400 px-2 py-0.5 rounded border border-orange-100 dark:border-orange-900/30 transition-colors">Priority: {msg.priority}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SMSFallback;

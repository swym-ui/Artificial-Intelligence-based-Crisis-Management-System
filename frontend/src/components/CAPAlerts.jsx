import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Polygon, Circle, Popup } from 'react-leaflet';
import { AlertOctagon, Info, ShieldAlert } from 'lucide-react';

const CAPAlerts = ({ scenario, darkMode }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.getCAPAlerts(scenario);
                setAlerts(response.data);
            } catch (error) {
                console.error("Error fetching CAP alerts:", error);
            } finally {
                setLoading(false);
            }
        };

        if (scenario) {
            fetchData();
        }
    }, [scenario]);

    if (loading) return <div className="text-center p-4 dark:text-slate-305">Fetching official alerts...</div>;

    return (
        <div className="space-y-6">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[600px] pr-2">
                    {alerts.length === 0 && <div className="text-slate-500 dark:text-slate-400">No active alerts.</div>}

                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`p-4 rounded-xl shadow-sm border-l-4 ${alert.info.severity === 'Severe' || alert.info.severity === 'Extreme' ? 'bg-red-50/50 dark:bg-red-950/20 border-red-500 dark:border-red-700 border-t border-r border-b border-red-100/50 dark:border-red-900/30' : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-500 dark:border-orange-700 border-t border-r border-b border-orange-100/50 dark:border-orange-900/30'} transition-colors`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{alert.info.event}</h4>
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{alert.sent.split('T')[1].split('+')[0]}</span>
                            </div>
                            <div className="flex items-center text-xs font-semibold uppercase mb-3 text-slate-500 dark:text-slate-405">
                                <ShieldAlert className="w-4 h-4 mr-1 text-red-500 shrink-0" />
                                {alert.sender}
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">{alert.info.description}</p>

                            <div className="bg-white/60 dark:bg-black/30 p-2.5 rounded border border-gray-200/20 dark:border-slate-800 text-xs text-slate-650 dark:text-slate-355 italic flex items-start gap-1.5 transition-colors">
                                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <span>{alert.info.instruction}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-2 h-[600px] rounded-xl overflow-hidden border border-gray-300 dark:border-slate-800 relative z-0">
                    <MapContainer center={[19.0760, 72.8777]} zoom={9} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url={darkMode 
                                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                        />
                        {alerts.map((alert, idx) => {
                            const color = alert.info.severity === 'Extreme' ? '#ef4444' : '#f97316';

                            return (
                                <React.Fragment key={idx}>
                                    {alert.info.area.polygon && (
                                        <Polygon
                                            positions={alert.info.area.polygon}
                                            pathOptions={{ color: color, fillColor: color, fillOpacity: 0.3 }}
                                        >
                                            <Popup>
                                                <div className="dark:text-slate-900">
                                                    <strong>{alert.info.headline}</strong><br />
                                                    Severity: {alert.info.severity}
                                                </div>
                                            </Popup>
                                        </Polygon>
                                    )}
                                    {alert.info.area.circle && (
                                        <Circle
                                            center={alert.info.area.circle[0]}
                                            radius={alert.info.area.circle[1] * 1000}
                                            pathOptions={{ color: color, fillColor: color, fillOpacity: 0.3 }}
                                        >
                                            <Popup>
                                                <div className="dark:text-slate-900">
                                                    <strong>{alert.info.headline}</strong><br />
                                                    Severity: {alert.info.severity}
                                                </div>
                                            </Popup>
                                        </Circle>
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default CAPAlerts;

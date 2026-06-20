import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Home, Users, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const ShelterLocator = ({ darkMode }) => {
    const [shelters, setShelters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ food: false, medical: false, accessibility: false });
    const [expandedShelterId, setExpandedShelterId] = useState(null);

    const toggleExpandShelter = (id) => {
        setExpandedShelterId(prev => prev === id ? null : id);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.getShelters();
                setShelters(response.data);
            } catch (error) {
                console.error("Error fetching shelters:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredShelters = shelters.filter(s => {
        if (filter.food && s.resources.food !== 'Adequate') return false;
        if (filter.medical && s.resources.medical !== 'Adequate') return false;
        if (filter.accessibility && (!s.accessibility || !s.accessibility.toLowerCase().includes('accessible'))) return false;
        return true;
    });

    if (loading) return <div className="text-center p-4 dark:text-slate-300">Locating safe havens...</div>;

    return (
        <div className="space-y-6">

            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 dark:bg-slate-950/40 rounded-xl border border-gray-200 dark:border-slate-800 transition-colors">
                <span className="font-semibold text-gray-700 dark:text-slate-300 self-center">Requirements:</span>
                <label className="flex items-center space-x-2 cursor-pointer text-sm dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={filter.food}
                        onChange={e => setFilter({ ...filter, food: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                    />
                    <span>Food Supply</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-sm dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={filter.medical}
                        onChange={e => setFilter({ ...filter, medical: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                    />
                    <span>Medical Aid</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer text-sm dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={filter.accessibility}
                        onChange={e => setFilter({ ...filter, accessibility: e.target.checked })}
                        className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
                    />
                    <span>Accessibility</span>
                </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-[500px] rounded-xl overflow-hidden border border-gray-300 dark:border-slate-800 relative z-0">
                    <MapContainer center={[19.0760, 72.8777]} zoom={12} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            url={darkMode 
                                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                                : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                        />
                        {filteredShelters.map((s, idx) => (
                            <Marker key={idx} position={s.location}>
                                <Popup>
                                    <div className="dark:text-slate-900">
                                        <div className="font-bold">{s.name}</div>
                                        <div>Status: {s.status}</div>
                                        <div>Capacity: {s.occupancy}/{s.capacity}</div>
                                        {s.accessibility && <div className="text-xs italic text-gray-500">Access: {s.accessibility}</div>}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <div className="space-y-4 overflow-y-auto h-[500px] pr-2">
                    {filteredShelters.map((s, idx) => {
                        const occupancyRate = (s.occupancy / s.capacity) * 100;
                        let statusColor = 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400';
                        if (occupancyRate > 90) statusColor = 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400';
                        else if (occupancyRate > 70) statusColor = 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-400';

                        return (
                            <div 
                                key={idx} 
                                onClick={() => toggleExpandShelter(s.id)}
                                className={`bg-white dark:bg-slate-900/50 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none flex flex-col gap-2.5 ${
                                    expandedShelterId === s.id 
                                        ? 'border-blue-500 dark:border-blue-500 shadow-md ring-1 ring-blue-500/30' 
                                        : 'border-slate-205 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-700'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">{s.name}</h4>
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusColor}`}>
                                            {s.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center text-sm text-slate-650 dark:text-slate-350 mb-2">
                                        <Users className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                                        <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2 mr-2">
                                            <div className={`h-2 rounded-full ${occupancyRate > 90 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${occupancyRate}%` }}></div>
                                        </div>
                                        <span className="whitespace-nowrap text-xs">{s.occupancy} / {s.capacity}</span>
                                    </div>

                                    {s.accessibility && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 italic">
                                            Access: {s.accessibility}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                        <ResourceItem label="Food" status={s.resources.food} />
                                        <ResourceItem label="Water" status={s.resources.water} />
                                        <ResourceItem label="Medical" status={s.resources.medical} />
                                        <ResourceItem label="Sanitation" status={s.resources.sanitation} />
                                    </div>
                                </div>

                                {/* Collapsible Additional Details */}
                                {expandedShelterId === s.id && (
                                    <div 
                                        className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 gap-2.5 text-xs text-slate-650 dark:text-slate-400 animate-fadeIn"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80 transition-colors">
                                            <span className="font-bold text-slate-500 dark:text-slate-400">Emergency Contact:</span>
                                            <a 
                                                href={`tel:${s.contact}`} 
                                                className="text-blue-600 dark:text-blue-450 font-extrabold hover:underline"
                                            >
                                                {s.contact || "N/A"}
                                            </a>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80 transition-colors">
                                                <span className="block font-bold text-slate-450 dark:text-slate-500 text-[9px] uppercase tracking-wide">Coordinates</span>
                                                <span className="font-mono mt-0.5 block text-slate-850 dark:text-slate-200 text-xs">
                                                    {s.location[0].toFixed(5)}°N<br/>
                                                    {s.location[1].toFixed(5)}°E
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80 transition-colors">
                                                <span className="block font-bold text-slate-450 dark:text-slate-500 text-[9px] uppercase tracking-wide">Available Beds</span>
                                                <span className="font-extrabold mt-0.5 block text-slate-850 dark:text-slate-200 text-xs">
                                                    {s.capacity - s.occupancy} slots
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-1 flex justify-center text-[10px] font-bold text-blue-500 uppercase tracking-widest gap-1 items-center hover:text-blue-600 transition-colors">
                                    <span>{expandedShelterId === s.id ? "Close details" : "More details"}</span>
                                    {expandedShelterId === s.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                </div>
                            </div>
                        );
                    })}
                    {filteredShelters.length === 0 && (
                        <div className="text-center text-gray-500 dark:text-slate-450 py-10">No shelters match your criteria.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResourceItem = ({ label, status }) => (
    <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-950/40 px-2 py-1.5 rounded transition-colors">
        <span className="text-gray-600 dark:text-slate-400">{label}</span>
        {status === 'Adequate' ? (
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
            <XCircle className="w-4 h-4 text-orange-500 shrink-0" />
        )}
    </div>
);

export default ShelterLocator;

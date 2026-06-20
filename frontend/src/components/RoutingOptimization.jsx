import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle } from 'react-leaflet';
import { ArrowRight, Clock, AlertTriangle, ChevronDown, ChevronUp, Truck, ShieldAlert, CloudRain, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RoutingOptimization = ({ scenario, darkMode }) => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [customHazards, setCustomHazards] = useState([]);
    const [selectedRouteId, setSelectedRouteId] = useState("");
    const [expandedRouteId, setExpandedRouteId] = useState(null);
    const [newHazardType, setNewHazardType] = useState("Road blockage");
    const [isReRouting, setIsReRouting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await api.getRoutes({ scenario, custom_hazards: [] });
                setRoutes(response.data);
                if (response.data && response.data.length > 0) {
                    setSelectedRouteId(response.data[0].id);
                }
            } catch (error) {
                console.error("Error fetching routes:", error);
            } finally {
                setLoading(false);
            }
        };

        if (scenario) {
            setCustomHazards([]);
            fetchData();
        }
    }, [scenario]);

    const handleReRoute = async () => {
        setIsReRouting(true);
        try {
            const currentRoute = routes.find(r => r.id === selectedRouteId);
            let lat = 19.0760;
            let lon = 72.8777;
            if (currentRoute && currentRoute.path && currentRoute.path.length > 2) {
                const midIdx = Math.floor(currentRoute.path.length / 2);
                lat = currentRoute.path[midIdx][0] + (Math.random() * 0.005 - 0.0025);
                lon = currentRoute.path[midIdx][1] + (Math.random() * 0.005 - 0.0025);
            } else {
                lat = 19.0760 + (Math.random() * 0.04 - 0.02);
                lon = 72.8777 + (Math.random() * 0.04 - 0.02);
            }

            const newHazard = {
                lat: lat,
                lon: lon,
                radius: 0.4,
                type: newHazardType
            };

            const updatedHazards = [...customHazards, newHazard];
            setCustomHazards(updatedHazards);

            const response = await api.getRoutes({
                scenario,
                custom_hazards: updatedHazards
            });
            setRoutes(response.data);
        } catch (error) {
            console.error("Error simulating re-route:", error);
        } finally {
            setIsReRouting(false);
        }
    };

    const toggleExpandRoute = (id) => {
        setExpandedRouteId(expandedRouteId === id ? null : id);
    };

    if (loading) return <div className="text-center p-4 dark:text-slate-300">Optimizing supply routes...</div>;

    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#6366f1'];

    return (
        <div className="space-y-6">
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-250 dark:border-slate-800 relative z-0 shadow-inner">
                <MapContainer center={[19.0760, 72.8777]} zoom={12} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url={darkMode 
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                    />
                    {routes.map((route, idx) => (
                        <React.Fragment key={idx}>
                            <Polyline
                                positions={route.path}
                                color={colors[idx % colors.length]}
                                weight={selectedRouteId === route.id ? 6 : 4}
                                opacity={selectedRouteId === route.id ? 0.95 : 0.7}
                            >
                                <Popup>
                                    <div className="font-semibold dark:text-slate-900">{route.id}</div>
                                    <div className="dark:text-slate-900">Status: {route.status}</div>
                                    <div className="dark:text-slate-900">Distance: {route.distance}</div>
                                    <div className="dark:text-slate-900">ETA: {route.time}</div>
                                </Popup>
                            </Polyline>
                            {/* Start Marker */}
                            <Marker position={route.path[0]}>
                                <Popup><span className="dark:text-slate-900">Start: {route.start}</span></Popup>
                            </Marker>
                            {/* End Marker */}
                            <Marker position={route.path[route.path.length - 1]}>
                                <Popup><span className="dark:text-slate-900">End: {route.end}</span></Popup>
                            </Marker>
                            {/* Render Route Specific Hazards */}
                            {route.hazards && route.hazards.map((h, hIdx) => (
                                <Circle
                                    key={`route-${idx}-hazard-${hIdx}`}
                                    center={h.location}
                                    radius={h.radius * 1000}
                                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.3 }}
                                >
                                    <Popup><span className="dark:text-slate-900">Hazard: {h.type}</span></Popup>
                                </Circle>
                            ))}
                        </React.Fragment>
                    ))}
                    {/* Render Simulated Custom Hazards */}
                    {customHazards.map((hazard, idx) => (
                        <Circle
                            key={`custom-hazard-${idx}`}
                            center={[hazard.lat, hazard.lon]}
                            radius={hazard.radius * 1000}
                            pathOptions={{ color: 'darkred', fillColor: 'darkred', fillOpacity: 0.5 }}
                        >
                            <Popup><span className="dark:text-slate-900">Hazard: {hazard.type}</span></Popup>
                        </Circle>
                    ))}
                </MapContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {routes.map((route, idx) => {
                    const isExpanded = expandedRouteId === route.id;
                    const hazardCount = (route.hazards ? route.hazards.length : 0);
                    
                    return (
                        <div 
                            key={idx} 
                            onClick={() => toggleExpandRoute(route.id)}
                            className={`bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border transition-all cursor-pointer select-none flex flex-col justify-between ${
                                isExpanded 
                                    ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/30' 
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-slate-800 dark:text-white uppercase text-xs tracking-wider">{route.id}</h4>
                                    <div className="flex items-center gap-1.5">
                                        {hazardCount > 0 && (
                                            <span className="bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-0.5">
                                                <AlertTriangle size={10} />
                                                {hazardCount}
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${route.status === 'Clear' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400'}`}>
                                            {route.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-sm text-slate-650 dark:text-slate-350 mb-3">
                                    <span className="font-semibold">{route.start}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mx-2" />
                                    <span className="font-semibold">{route.end}</span>
                                </div>
                                
                                <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <span className="flex items-center">
                                        <RouteIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                        {route.distance}
                                    </span>
                                    <span className="flex items-center">
                                        <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                                        {route.time}
                                    </span>
                                </div>
                            </div>

                            {/* Collapsible Details */}
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-650 dark:text-slate-400 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80">
                                        <Truck size={14} className="text-blue-500 shrink-0" />
                                        <div>
                                            <span className="font-bold dark:text-slate-300">Vehicle: </span>
                                            <span className="text-slate-600 dark:text-slate-400">All-Terrain Heavy Cargo</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80">
                                        <Users size={14} className="text-emerald-500 shrink-0" />
                                        <div>
                                            <span className="font-bold dark:text-slate-300">Min Crew: </span>
                                            <span className="text-slate-600 dark:text-slate-400">4 Responders</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80">
                                        <ShieldAlert size={14} className="text-amber-500 shrink-0" />
                                        <div>
                                            <span className="font-bold dark:text-slate-300">Security: </span>
                                            <span className={hazardCount > 0 ? "text-red-500 font-semibold" : "text-green-500 font-semibold"}>
                                                {hazardCount > 0 ? "Armed Escort Advised" : "Stable Pathway"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/40 dark:border-slate-800/80">
                                        <CloudRain size={14} className="text-indigo-500 shrink-0" />
                                        <div>
                                            <span className="font-bold dark:text-slate-300">Weather: </span>
                                            <span className="text-slate-600 dark:text-slate-400">Moderate Rain (4km vis)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 flex justify-center text-[10px] font-bold text-blue-500 uppercase tracking-wider gap-1 items-center hover:text-blue-600">
                                <span>{isExpanded ? "Click to Close details" : "Click for more details"}</span>
                                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dynamic Re-routing UI */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mt-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-4">Dynamic Route Optimizer</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Select route to re-route</label>
                        <select
                            value={selectedRouteId}
                            onChange={(e) => setSelectedRouteId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:text-slate-100"
                        >
                            {routes.map(r => (
                                <option key={r.id} value={r.id} className="dark:bg-slate-900">{r.id} ({r.start} to {r.end})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">New hazard type</label>
                        <select
                            value={newHazardType}
                            onChange={(e) => setNewHazardType(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:text-slate-100"
                        >
                            <option value="Road blockage" className="dark:bg-slate-900">Road blockage</option>
                            <option value="Flooding" className="dark:bg-slate-900">Flooding</option>
                            <option value="Bridge collapse" className="dark:bg-slate-900">Bridge collapse</option>
                            <option value="Landslide" className="dark:bg-slate-900">Landslide</option>
                        </select>
                    </div>
                    <button
                        onClick={handleReRoute}
                        disabled={isReRouting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm shadow transition-colors"
                    >
                        {isReRouting ? 'Re-calculating paths...' : 'Simulate hazard & re-route'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RouteIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H18"></path><path d="M18 5L21 8 18 11"></path></svg>
)

export default RoutingOptimization;

import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Home, User, AlertTriangle, ChevronDown, ChevronUp, Phone, Accessibility, CheckCircle2, XCircle, Info, Footprints, Car } from 'lucide-react';
import L from 'leaflet';

function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 13);
    }, [center, map]);
    return null;
}

const EvacuationRoutes = ({ scenario, darkMode }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inputLat, setInputLat] = useState(19.0760);
    const [inputLon, setInputLon] = useState(72.8777);
    const [userLocation, setUserLocation] = useState([19.0760, 72.8777]);
    const [expandedShelterId, setExpandedShelterId] = useState(null);

    const fetchData = async (lat, lon) => {
        setLoading(true);
        try {
            const response = await api.getEvacuationRoutes({
                user_lat: parseFloat(lat),
                user_lon: parseFloat(lon),
                scenario
            });
            setData(response.data);
            setUserLocation([parseFloat(lat), parseFloat(lon)]);
        } catch (error) {
            console.error("Error fetching evacuation routes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (scenario) {
            fetchData(inputLat, inputLon);
        }
    }, [scenario]);

    const handleCalculate = () => {
        fetchData(inputLat, inputLon);
    };

    const toggleExpandShelter = (id) => {
        setExpandedShelterId(expandedShelterId === id ? null : id);
    };

    if (loading) return <div className="text-center p-4 dark:text-slate-350">Calculating safe paths...</div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 p-4 rounded-xl flex items-center">
                    <User className="w-5 h-5 mr-3 text-blue-600 dark:text-blue-400" />
                    <div>
                        <div className="font-semibold text-blue-900 dark:text-blue-300">Your Location Coordinates</div>
                        <div className="text-sm text-blue-700 dark:text-blue-400 font-mono">{userLocation[0]}, {userLocation[1]}</div>
                    </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex flex-wrap gap-4 items-end justify-between">
                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Latitude</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={inputLat}
                                onChange={(e) => setInputLat(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:text-slate-100"
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Longitude</label>
                            <input
                                type="number"
                                step="0.0001"
                                value={inputLon}
                                onChange={(e) => setInputLon(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:text-slate-100"
                            />
                        </div>
                        <button
                            onClick={handleCalculate}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded shadow transition-colors"
                        >
                            Recalculate Routes
                        </button>
                    </div>
                </div>
            </div>

            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-250 dark:border-slate-800 relative z-0">
                <MapContainer center={userLocation} zoom={13} style={{ height: '100%', width: '100%' }} attributionControl={false}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url={darkMode 
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                    />

                    <MapUpdater center={userLocation} />

                    {/* User Marker */}
                    <Marker position={userLocation}>
                        <Popup><span className="dark:text-slate-900">You are here</span></Popup>
                    </Marker>

                    {/* Shelters */}
                    {data.routes.map((route, idx) => {
                        const pathCoords = route.path;
                        const shelterCoord = pathCoords[pathCoords.length - 1];
                        return (
                            <Marker key={`shelter-mark-${idx}`} position={shelterCoord}>
                                <Popup>
                                    <div className="dark:text-slate-900">
                                        <h4 className="font-bold">{route.shelter_name}</h4>
                                        <p>Capacity: {route.capacity_status}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Hazards */}
                    {data.hazards.map((h, idx) => (
                        <Circle
                            key={`hazard-${idx}`}
                            center={[h[0], h[1]]}
                            radius={h[2] * 1000}
                            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}
                        />
                    ))}

                    {/* Routes */}
                    {data.routes.map((route, idx) => (
                        <Polyline
                            key={`route-${idx}`}
                            positions={route.path}
                            color="green"
                            weight={5}
                            dashArray="10, 10"
                        >
                            <Popup>
                                <div className="dark:text-slate-900">
                                    <strong>To {route.shelter_name}</strong><br />
                                    Distance: {route.length} km
                                </div>
                            </Popup>
                        </Polyline>
                    ))}
                </MapContainer>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-lg dark:text-slate-100">Recommended Evacuation Routes</h3>
                
                {data.routes.map((route, idx) => {
                    const isExpanded = expandedShelterId === route.shelter_id;
                    const occupancyRate = (route.occupancy / route.capacity) * 100;
                    
                    return (
                        <div 
                            key={idx} 
                            onClick={() => toggleExpandShelter(route.shelter_id)}
                            className={`bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border transition-all cursor-pointer select-none flex flex-col justify-between ${
                                isExpanded 
                                    ? 'border-green-500 dark:border-green-500 ring-1 ring-green-500/30' 
                                    : 'border-slate-205 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center">
                                    <div className="bg-green-100 dark:bg-green-950/40 p-2.5 rounded-full mr-4 shrink-0">
                                        <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-base">{route.shelter_name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Capacity: {route.capacity_status}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">{route.length} km</div>
                                    <div className="text-xs text-green-650 dark:text-green-400 font-bold">Safe Route calculated</div>
                                </div>
                            </div>

                            {/* Collapsible Details */}
                            {isExpanded && (
                                <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Status & Contact */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Shelter Information</h4>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${route.status === 'Open' ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-450' : 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-450'}`}>
                                                    {route.status}
                                                </span>
                                                <span className="text-slate-500">•</span>
                                                <span className="text-slate-600 dark:text-slate-350">{route.accessibility}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350 text-sm">
                                                <Phone size={14} className="text-slate-400" />
                                                <span>Contact: <span className="font-mono">{route.contact}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350 text-sm">
                                                <Accessibility size={14} className="text-slate-400" />
                                                <span>Occupancy Load: <span className="font-semibold">{Math.round(occupancyRate)}%</span></span>
                                            </div>
                                        </div>

                                        {/* ETA travel time estimates */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Estimated Travel Times</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded border border-slate-200/40 dark:border-slate-800 flex items-center gap-2">
                                                    <Footprints size={18} className="text-blue-500 shrink-0" />
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Walking</span>
                                                        <span className="text-sm font-bold dark:text-slate-200">{Math.round(route.length * 12)} mins</span>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded border border-slate-200/40 dark:border-slate-800 flex items-center gap-2">
                                                    <Car size={18} className="text-indigo-500 shrink-0" />
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Driving</span>
                                                        <span className="text-sm font-bold dark:text-slate-200">{Math.round(route.length * 2.5)} mins</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Resource Status */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Available Resources</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                            <ResourceIndicator label="Food" status={route.food_status} />
                                            <ResourceIndicator label="Water" status={route.water_status} />
                                            <ResourceIndicator label="Medical" status={route.medical_status} />
                                            <ResourceIndicator label="Sanitation" status={route.sanitation_status} />
                                        </div>
                                    </div>

                                    {/* Safety Guideline */}
                                    <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200/40 dark:border-slate-800 p-3 rounded-lg flex items-start gap-2.5">
                                        <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Evacuation Instructions:</span>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                                Prepare a single grab-bag containing personal ID and dry food. 
                                                Follow the green-marked coordinates. Avoid river banks and low-lying underpasses along the way.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-3 flex justify-center text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider gap-1 items-center hover:text-blue-600">
                                <span>{isExpanded ? "Click to Close details" : "Click for shelter resources & path details"}</span>
                                {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ResourceIndicator = ({ label, status }) => {
    const isAdequate = status === 'Adequate';
    return (
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 px-3 py-2 rounded border border-slate-200/30 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
            {isAdequate ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 ml-2" />
            ) : (
                <XCircle className="w-4 h-4 text-orange-500 shrink-0 ml-2" />
            )}
        </div>
    );
};

export default EvacuationRoutes;

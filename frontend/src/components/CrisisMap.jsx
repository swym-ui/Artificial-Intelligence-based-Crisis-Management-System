import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ImageOverlay, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';

// Fix Leaflet icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map view updates
function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const CrisisMap = ({ scenario, satelliteSource, imageryDate, locationInput, overlayImage, overlayBounds, darkMode }) => {
    const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
    const [zoom, setZoom] = useState(10);
    const [priorityZones, setPriorityZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);

    useEffect(() => {
        const fetchZones = async () => {
            try {
                const response = await api.getPriorityZones(scenario);
                setPriorityZones(response.data);
                if (response.data && response.data.length > 0) {
                    setMapCenter([response.data[0].lat, response.data[0].lon]);
                }
            } catch (error) {
                console.error("Error fetching priority zones:", error);
            }
        };
        if (scenario) {
            fetchZones();
        }
    }, [scenario]);

    const handleSelectZone = (zone) => {
        setSelectedZone(zone);
        setMapCenter([zone.lat, zone.lon]);
        setZoom(12);
    };

    return (
        <div className="space-y-6">
            <div className="relative h-[500px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 z-0">
                <MapContainer
                    center={mapCenter}
                    zoom={zoom}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    attributionControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url={darkMode 
                            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                    />

                    <MapUpdater center={mapCenter} zoom={zoom} />

                    {/* Priority Zones */}
                    {priorityZones.map((zone) => (
                        <CircleMarker
                            key={zone.id}
                            center={[zone.lat, zone.lon]}
                            pathOptions={{
                                color: zone.severity > 85 ? '#ef4444' : '#f97316',
                                fillColor: zone.severity > 85 ? '#ef4444' : '#f97316',
                                fillOpacity: selectedZone?.id === zone.id ? 0.9 : 0.6,
                                weight: selectedZone?.id === zone.id ? 4 : 2
                            }}
                            radius={selectedZone?.id === zone.id ? 15 : 10}
                        >
                            <Popup>
                                <div className="text-center dark:text-slate-900">
                                    <h3 className="font-bold text-sm">Zone {zone.id}</h3>
                                    <p className="text-xs">Severity: {zone.severity}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* Satellite Overlay */}
                    {overlayImage && overlayBounds && (
                        <ImageOverlay
                            url={overlayImage}
                            bounds={[
                                [overlayBounds[0], overlayBounds[1]], // lat, lon
                                [overlayBounds[2], overlayBounds[3]]  // lat, lon
                            ]}
                            opacity={0.7}
                        />
                    )}
                </MapContainer>

                <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 rounded-lg shadow-md max-w-xs z-[1000] border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Priority Legend</h4>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
                        <span className="text-xs dark:text-slate-300">Critical (Sev. &gt; 85)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500 opacity-80" />
                        <span className="text-xs dark:text-slate-300">High (Sev. &gt; 70)</span>
                    </div>
                </div>
            </div>

            {/* Top Priority Zones List */}
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs backdrop-blur-md transition-colors duration-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 mb-6">
                    <div>
                        <h3 className="text-base font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                            Active Priority Zones
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">High-severity threat hotspots calculated by incident data streams.</p>
                    </div>
                    <span className="mt-2 md:mt-0 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-950/60 px-2.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800">
                        {priorityZones.length} Sectors Flagged
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Zone Selector Column */}
                    <div className="lg:col-span-5 space-y-3">
                        <label className="block text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2">Select Target Hotspot</label>
                        <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                            {priorityZones.map((zone) => {
                                const isSelected = selectedZone?.id === zone.id;
                                const isCritical = zone.severity > 85;
                                return (
                                    <button
                                        key={zone.id}
                                        onClick={() => handleSelectZone(zone)}
                                        className={`group relative text-left p-4 rounded-xl border transition-all duration-300 flex flex-col gap-1.5 shrink-0 overflow-hidden ${
                                            isSelected 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 translate-x-1' 
                                                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800/70 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/30'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-450 dark:text-slate-400'}`}>
                                                Rank #{zone.id} Alert
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                                isCritical 
                                                    ? 'bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/20' 
                                                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                            } ${isSelected ? 'bg-white/10 text-white border-transparent' : ''}`}>
                                                Severity {zone.severity}%
                                            </span>
                                        </div>
                                        
                                        <h4 className={`font-extrabold text-sm tracking-tight truncate w-full ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {zone.title || `Hotspot grid near Sector ${zone.id}`}
                                        </h4>
                                        
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                                Lat/Lon: {parseFloat(zone.lat).toFixed(4)}, {parseFloat(zone.lon).toFixed(4)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Zone Details / Informative Info Panel */}
                    <div className="lg:col-span-7">
                        {selectedZone ? (
                            <div className="bg-white dark:bg-slate-950 p-6 rounded-xl border border-blue-500/30 dark:border-blue-500/20 shadow-md flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300">
                                {/* Decorative Glow Accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                                            <h4 className="font-extrabold text-base text-slate-800 dark:text-white tracking-tight">
                                                Zone {selectedZone.id} Analysis
                                            </h4>
                                        </div>
                                        <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400 font-semibold border border-slate-200/50 dark:border-slate-800/80">
                                            Incident ID: #{selectedZone.db_id || selectedZone.id}
                                        </span>
                                    </div>

                                    {/* Incident Meta Fields */}
                                    <div className="space-y-3.5">
                                        <div>
                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Incident Details</span>
                                            <h5 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm mt-0.5">
                                                {selectedZone.title || "Active Incident Report"}
                                            </h5>
                                            <p className="text-xs text-slate-650 dark:text-slate-350 mt-1.5 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-150 dark:border-slate-800/50">
                                                {selectedZone.description || "Live crisis telemetry verifies severe threat level indexes at this sector location. Emergency rescue priorities mapped."}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800/80">
                                                <span className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Georeference Bounds</span>
                                                <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                                                    {parseFloat(selectedZone.lat).toFixed(6)} N <br/>
                                                    {parseFloat(selectedZone.lon).toFixed(6)} E
                                                </span>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800/80">
                                                <span className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Logged Timestamp</span>
                                                <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200 mt-1 block">
                                                    {selectedZone.timestamp ? selectedZone.timestamp.replace("T", " ") : "Real-time stream"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Action Guide based on scenario */}
                                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <span className="block text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-1">Commander Action Protocol</span>
                                    <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-lg flex items-start gap-2.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5 animate-pulse" />
                                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-450 leading-relaxed">
                                            {scenario === "Simulated Flood"
                                                ? "Active flooding is blocking low-lying channels. Dispatch immediate boat rescue and high-volume pump modules. Direct local emergency relief units to construct safe perimeter highground bypasses."
                                                : "Seismic vibrations have induced structural cracks. Deploy emergency rescue teams with specialized structural support columns. Setup field trauma triage zones at adjacent park perimeters."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800/60 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 transition-colors">
                                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping mb-4 shrink-0" />
                                <h4 className="font-bold text-slate-700 dark:text-slate-350 text-sm">No Sector Selected</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-450 max-w-xs mt-1.5">
                                    Click on any priority zone card in the list to highlight coordinates, review local incident telemetry, and read critical emergency action protocols.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrisisMap;

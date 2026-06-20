import axios from 'axios';

const API_Base = 'http://localhost:8000/api';

export const api = {
    getHealth: () => axios.get(`${API_Base}/health`),
    getScenarios: () => axios.get(`${API_Base}/scenarios`),
    getSatelliteSources: () => axios.get(`${API_Base}/satellite-sources`),
    getPriorityZones: (scenario) => axios.get(`${API_Base}/priority-zones`, { params: { scenario } }),
    fetchSatelliteImagery: (data) => axios.post(`${API_Base}/satellite-imagery`, data),
    uploadSatelliteImage: (formData) => axios.post(`${API_Base}/upload-satellite`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    detectDamage: (data) => axios.post(`${API_Base}/detect-damage`, data),
    getSocialMedia: (scenario) => axios.get(`${API_Base}/social-media`, { params: { scenario } }),
    getSMSMessages: (scenario) => axios.get(`${API_Base}/sms-fallback`, { params: { scenario } }),
    getCAPAlerts: (scenario) => axios.get(`${API_Base}/cap-alerts`, { params: { scenario } }),
    getRoutes: (data) => axios.post(`${API_Base}/routes`, data),
    getEvacuationRoutes: (data) => axios.post(`${API_Base}/evacuation`, data),
    getShelters: () => axios.get(`${API_Base}/shelters`),
    getAIExplanations: (scenario, tab) => axios.get(`${API_Base}/ai-explanations`, { params: { scenario, tab } }),
    queryAIChat: (data) => axios.post(`${API_Base}/chat`, data),
    simulateDisaster: (data) => axios.post(`${API_Base}/simulate`, data),
};

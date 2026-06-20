import os
import random
import base64
import json
import sqlite3
import re
import requests
import numpy as np
from io import BytesIO
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from PIL import Image, ImageDraw
import networkx as nx
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import database module
from db import init_db, seed_db_if_empty, get_db_connection, DB_PATH

# Load environment variables
if os.path.exists(os.path.join(os.path.dirname(__file__), ".env")):
    with open(os.path.join(os.path.dirname(__file__), ".env")) as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                parts = line.strip().split("=", 1)
                if len(parts) == 2:
                    os.environ[parts[0].strip()] = parts[1].strip()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

# Initialize database
init_db()
seed_db_if_empty()

app = FastAPI(title="Crisis Management System API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Structures ---

class SatelliteRequest(BaseModel):
    source: str
    date: Optional[str] = None
    location: str

class DamageRequest(BaseModel):
    image: str # Base64 encoded image
    scenario: str

class RouteRequest(BaseModel):
    scenario: str
    custom_hazards: Optional[List[Dict[str, Any]]] = None

class EvacuationRequest(BaseModel):
    user_lat: float
    user_lon: float
    scenario: str

class ChatRequest(BaseModel):
    question: str
    scenario: str

# --- Core Logic & Simulation ---

def is_path_near_hazard(path, hazard):
    hazard_lat, hazard_lon, hazard_radius = hazard
    for point in path:
        lat_diff = point[0] - hazard_lat
        lon_diff = point[1] - hazard_lon
        distance = (lat_diff**2 + lon_diff**2)**0.5
        distance_km = distance * 111
        if distance_km < hazard_radius:
            return True
    return False

def generate_road_status(start_points, end_points, hazard_areas):
    min_lat = min([p[0] for p in start_points + end_points]) - 0.05
    max_lat = max([p[0] for p in start_points + end_points]) + 0.05
    min_lon = min([p[1] for p in start_points + end_points]) - 0.05
    max_lon = max([p[1] for p in start_points + end_points]) + 0.05
    
    grid_points = []
    for lat in np.linspace(min_lat, max_lat, 10):
        for lon in np.linspace(min_lon, max_lon, 10):
            grid_points.append([lat, lon])
            
    road_status = {}
    for i, p1 in enumerate(grid_points):
        for j, p2 in enumerate(grid_points):
            if i != j:
                is_hazardous = False
                for h in hazard_areas:
                    if is_path_near_hazard([p1, p2], h):
                        is_hazardous = True
                        break
                if is_hazardous:
                    status = random.choice(['Closed', 'Severely Damaged', 'Partially Open'])
                else:
                    status = random.choice(['Open', 'Open', 'Open', 'Minor Delays', 'Partially Open'])
                road_status[(tuple(p1), tuple(p2))] = status
    return road_status

def optimize_aid_route(start_point, end_point, hazard_areas, road_status):
    path = [start_point]
    direct_path = [start_point, end_point]
    if any(is_path_near_hazard(direct_path, h) for h in hazard_areas):
        waypoints = []
        for hazard in hazard_areas:
            if is_path_near_hazard(direct_path, hazard):
                hazard_lat, hazard_lon, hazard_radius = hazard
                mid_lat = (start_point[0] + end_point[0]) / 2
                mid_lon = (start_point[1] + end_point[1]) / 2
                dir_lat = mid_lat - hazard_lat
                dir_lon = mid_lon - hazard_lon
                mag = (dir_lat**2 + dir_lon**2)**0.5
                if mag > 0:
                    waypoint_lat = hazard_lat + (dir_lat/mag) * (hazard_radius * 1.5 / 111)
                    waypoint_lon = hazard_lon + (dir_lon/mag) * (hazard_radius * 1.5 / 111)
                    waypoints.append([waypoint_lat, waypoint_lon])
        path.extend(waypoints)
    path.append(end_point)
    
    distance = 0
    for i in range(len(path)-1):
        lat_diff = path[i+1][0] - path[i][0]
        lon_diff = path[i+1][1] - path[i][1]
        segment_distance = (lat_diff**2 + lon_diff**2)**0.5 * 111
        distance += segment_distance
        
    avg_speed = random.uniform(20, 50)
    estimated_time = distance / avg_speed * 60
    return path, round(distance, 2), round(estimated_time, 2)

def generate_evacuation_routes_logic(current_location, hazard_areas, shelter_locations):
    start_lat, start_lon = current_location
    G = nx.DiGraph()
    G.add_node(0, pos=(start_lon, start_lat))
    for i, (lat, lon) in enumerate(shelter_locations):
        G.add_node(i+1, pos=(lon, lat))
        
    grid_size = 10
    all_points = [current_location] + shelter_locations + [[h[0], h[1]] for h in hazard_areas]
    min_lat = min(p[0] for p in all_points) - 0.05
    max_lat = max(p[0] for p in all_points) + 0.05
    min_lon = min(p[1] for p in all_points) - 0.05
    max_lon = max(p[1] for p in all_points) + 0.05
    
    for i, lat in enumerate(np.linspace(min_lat, max_lat, grid_size)):
        for j, lon in enumerate(np.linspace(min_lon, max_lon, grid_size)):
            node_id = f"grid_{i}_{j}"
            G.add_node(node_id, pos=(lon, lat))
            
    for node1 in G.nodes():
        pos1 = G.nodes[node1]["pos"]
        for node2 in G.nodes():
            if node1 != node2:
                pos2 = G.nodes[node2]["pos"]
                distance = ((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)**0.5
                if distance < 0.03:
                    crosses_hazard = False
                    for hazard in hazard_areas:
                        hazard_lat, hazard_lon, radius = hazard
                        dist1 = ((pos1[1] - hazard_lat)**2 + (pos1[0] - hazard_lon)**2)**0.5
                        dist2 = ((pos2[1] - hazard_lat)**2 + (pos2[0] - hazard_lon)**2)**0.5
                        mid_lat = (pos1[1] + pos2[1]) / 2
                        mid_lon = (pos1[0] + pos2[0]) / 2
                        dist_mid = ((mid_lat - hazard_lat)**2 + (mid_lon - hazard_lon)**2)**0.5
                        if dist1 < radius or dist2 < radius or dist_mid < radius:
                            crosses_hazard = True
                            break
                    if not crosses_hazard:
                        G.add_edge(node1, node2, weight=distance)
                        
    evacuation_routes = []
    for i in range(1, len(shelter_locations) + 1):
        try:
            path = nx.shortest_path(G, source=0, target=i, weight='weight')
            path_length = nx.shortest_path_length(G, source=0, target=i, weight='weight')
            
            route_coords = [G.nodes[node_idx]['pos'] for node_idx in path]
            route_coords = [(pos[1], pos[0]) for pos in route_coords]
            evacuation_routes.append({
                'shelter_id': i-1,
                'path': route_coords,
                'length': path_length
            })
        except nx.NetworkXNoPath:
            pass
    return evacuation_routes

# --- Groq LLM API helper ---
def query_groq(prompt: str, system_prompt: str = "You are a crisis response coordinator AI.") -> str:
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured.")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }
    
    response = requests.post(url, headers=headers, json=data, timeout=10)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/scenarios")
def get_scenarios():
    return [
        "Simulated Flood", 
        "Simulated Earthquake", 
        "Simulated Cyclone", 
        "Simulated Wildfire", 
        "Simulated Chemical Leak"
    ]

@app.get("/api/satellite-sources")
def get_sources():
    return ["Upload Custom", "Sentinel-2", "NASA GIBS", "Maxar Open Data"]

@app.get("/api/priority-zones")
def get_priority_zones(scenario: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    # Query high severity incidents from DB
    cursor.execute("""
        SELECT id, title, description, latitude, longitude, severity, timestamp 
        FROM incidents 
        WHERE scenario = ? AND status = 'Active'
        ORDER BY severity DESC 
        LIMIT 5
    """, (scenario,))
    rows = cursor.fetchall()
    conn.close()
    
    zones = []
    for idx, row in enumerate(rows):
        zones.append({
            "id": idx + 1,
            "db_id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "lat": row["latitude"],
            "lon": row["longitude"],
            "severity": row["severity"],
            "timestamp": row["timestamp"]
        })
    return zones

@app.post("/api/satellite-imagery")
def get_satellite_imagery_endpoint(req: SatelliteRequest):
    try:
        lat, lon = map(float, req.location.split(','))
    except:
        lat, lon = 19.0760, 72.8777

    width, height = 500, 500
    img = Image.new("RGB", (width, height), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Programmatic drawing of unique patterns for each satellite imagery source
    if req.source == "Sentinel-2":
        # Green terrain base with a blue winding river down the middle
        draw.rectangle([0, 0, width, height], fill=(34, 139, 34))
        river_points = []
        for y in range(0, height, 10):
            x = 250 + int(60 * np.sin(y / 40.0))
            river_points.append((x, y))
        draw.line(river_points, fill=(30, 144, 255), width=25)
    elif req.source == "NASA GIBS":
        # False-color infrared: dark blue/purple ocean with bright red heat scars and orange rims
        draw.rectangle([0, 0, width, height], fill=(15, 10, 50))
        for i in range(5):
            cx = 100 + i * 80 + int(30 * np.sin(i))
            cy = 100 + i * 70
            r = 30 + (i % 3) * 15
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(220, 20, 60), outline=(255, 140, 0), width=4)
    elif req.source == "Maxar Open Data":
        # High-res urban imagery: grey blocks, regular grid patterns
        draw.rectangle([0, 0, width, height], fill=(90, 90, 90))
        for idx in range(40, 500, 80):
            draw.line([(idx, 0), (idx, height)], fill=(210, 210, 210), width=5)
            draw.line([(0, idx), (width, idx)], fill=(210, 210, 210), width=5)
        for i in range(10, 500, 80):
            for j in range(10, 500, 80):
                draw.rectangle([i+10, j+10, i+70, j+70], fill=(130, 120, 110))
    else:
        draw.rectangle([0, 0, width, height], fill=(120, 120, 120))

    # Add simulated flood/damage markers on top
    for i in range(5):
        cx, cy = 150 + i * 60, 200 + int(50 * np.cos(i))
        r = 15 + i * 5
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(0, 0, 255, 80) if req.source == "Sentinel-2" else (255, 0, 0, 80), outline=(255, 255, 255), width=2)

    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "image": f"data:image/png;base64,{img_b64}",
        "bounds": [lat-0.05, lon-0.05, lat+0.05, lon+0.05]
    }

@app.post("/api/upload-satellite")
async def upload_satellite(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(BytesIO(contents))
    
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "image": f"data:image/png;base64,{img_b64}",
        "bounds": [19.02, 72.82, 19.12, 72.92]
    }

@app.post("/api/detect-damage")
def detect_damage_endpoint(req: DamageRequest):
    try:
        header, encoded = req.image.split(",", 1)
        data = base64.b64decode(encoded)
        img = Image.open(BytesIO(data))
    except:
        raise HTTPException(status_code=400, detail="Invalid image data")

    img_array = np.array(img.convert("RGB"))
    height, width = img_array.shape[:2]
    damage_mask = np.zeros((height, width), dtype=np.uint8)
    
    if req.scenario == "Simulated Flood":
        for i in range(8):
            x, y = np.random.randint(0, width), np.random.randint(0, height)
            size = np.random.randint(30, 150)
            damage_mask[max(0, y-size):min(height, y+size), max(0, x-size):min(width, x+size)] = 1
    else:
        for i in range(25):
             x, y = np.random.randint(0, width), np.random.randint(0, height)
             size = np.random.randint(10, 60)
             damage_mask[max(0, y-size):min(height, y+size), max(0, x-size):min(width, x+size)] = 1
             
    damage_percentage = (np.sum(damage_mask) / (height * width)) * 100
    
    damage_vis = np.zeros((height, width, 4), dtype=np.uint8)
    if req.scenario == "Simulated Flood":
        damage_vis[damage_mask == 1] = [0, 0, 255, 150]
    else:
        damage_vis[damage_mask == 1] = [255, 0, 0, 150]
        
    overlay = Image.fromarray(damage_vis)
    buffered = BytesIO()
    overlay.save(buffered, format="PNG")
    overlay_b64 = base64.b64encode(buffered.getvalue()).decode()

    # AI NLP analysis explanation for damage
    details = {}
    if GROQ_API_KEY:
        try:
            prompt = f"Write 4 bullet points explaining satellite analysis findings for a {req.scenario} with {damage_percentage:.1f}% estimated damage in key Lucknow grids. Return in JSON format matching this schema: {{'Collapsed/Flooded Structures': '...', 'Blocked/Damaged Roads': '...', 'Impact Severity': '...', 'Estimated Affected Area': '...'}}"
            ai_resp = query_groq(prompt, "You are a satellite image interpreter. Keep the JSON keys exactly as requested and values concise.")
            details = json.loads(ai_resp)
        except Exception as e:
            print("Groq satellite details failed, using fallback:", e)
            
    if not details: # Fallback
        if req.scenario == "Simulated Flood":
            details = {
                "Flooded Houses": str(random.randint(120, 450)),
                "Blocked Roads": f"{random.randint(5, 20)} Locations",
                "Water Level": f"{random.uniform(1.5, 4.2):.1f}m",
                "Affected Area": f"{random.randint(15, 40)} sq km"
            }
        else:
            details = {
                "Collapsed Structures": str(random.randint(40, 150)),
                "Cracked Buildings": str(random.randint(200, 500)),
                "Road Fissures": f"{random.randint(10, 30)} Locations",
                "Power Outages": f"{random.randint(5000, 20000)} Households"
            }
            
    return {
        "overlay": f"data:image/png;base64,{overlay_b64}",
        "percentage": round(damage_percentage, 2),
        "details": details
    }

@app.get("/api/social-media")
def get_social_media(scenario: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT text, location, need, timestamp, platform, sentiment 
        FROM social_media 
        WHERE scenario = ? 
        ORDER BY id DESC 
        LIMIT 30
    """, (scenario,))
    rows = cursor.fetchall()
    conn.close()
    
    posts = []
    for r in rows:
        posts.append({
            "text": r["text"],
            "location": r["location"],
            "need": r["need"],
            "timestamp": r["timestamp"],
            "platform": r["platform"],
            "sentiment": r["sentiment"]
        })
    return posts

@app.get("/api/sms-fallback")
def get_sms_messages(scenario: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT message, location, priority, timestamp 
        FROM sms_messages 
        WHERE scenario = ? 
        ORDER BY id DESC 
        LIMIT 25
    """, (scenario,))
    rows = cursor.fetchall()
    conn.close()
    
    messages = []
    for r in rows:
        messages.append({
            "message": r["message"],
            "timestamp": r["timestamp"],
            "location": r["location"], 
            "priority": r["priority"]
        })
        
    return {
        "messages": messages,
        "stats": {
            "active_towers": f"{random.randint(15,22)}/{random.randint(25,30)}",
            "processing_rate": f"{random.randint(85,98)}%"
        }
    }

@app.get("/api/cap-alerts")
def get_cap_alerts(scenario: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT identifier, sender, sent, status, msg_type, scope, category, event, urgency, severity, certainty, headline, description, instruction, area_desc, polygon_data
        FROM cap_alerts 
        WHERE scenario = ? 
        ORDER BY id DESC 
        LIMIT 5
    """, (scenario,))
    rows = cursor.fetchall()
    conn.close()
    
    alerts = []
    for r in rows:
        # Deserialize coordinates polygon
        try:
            poly = eval(r["polygon_data"])
        except:
            poly = [[26.7,80.8], [26.7,81.1], [27.0,81.1], [27.0,80.8], [26.7,80.8]]
            
        alerts.append({
            "identifier": r["identifier"],
            "sender": r["sender"],
            "sent": r["sent"],
            "status": r["status"],
            "msgType": r["msg_type"],
            "scope": r["scope"],
            "info": {
                "category": r["category"],
                "event": r["event"],
                "urgency": r["urgency"],
                "severity": r["severity"],
                "certainty": r["certainty"],
                "headline": r["headline"],
                "description": r["description"],
                "instruction": r["instruction"],
                "area": {
                    "areaDesc": r["area_desc"],
                    "polygon": poly,
                    "geocode": {"valueName": "HASC", "value": "IN.UP.LU"}
                }
            }
        })
    return alerts

@app.post("/api/routes")
def get_routes(req: RouteRequest):
    # Retrieve incidents / hazard points from DB to run Dijkstra
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT latitude, longitude, severity FROM incidents WHERE scenario = ? LIMIT 5", (req.scenario,))
    incidents = cursor.fetchall()
    conn.close()
    
    hazard_areas = []
    for inc in incidents:
        # Calculate a hazard radius based on severity
        radius = (inc["severity"] / 100.0) * 0.5
        hazard_areas.append([inc["latitude"], inc["longitude"], radius])
        
    if req.scenario == "Simulated Flood":
        start_points = [[19.0760, 72.8777], [19.0596, 72.8295], [19.1176, 72.9060]]
        end_points = [[18.9430, 72.8227], [19.1204, 72.8481], [19.0178, 72.8478], [19.2294, 72.8573]]
    else:
        start_points = [[19.0760, 72.8777], [19.0380, 72.8538]]
        end_points = [[18.9067, 72.8147], [19.1023, 72.8267], [19.0622, 72.9024], [19.0118, 72.8184]]
        
    if req.custom_hazards:
        for ch in req.custom_hazards:
            ch_lat = ch.get("lat")
            ch_lon = ch.get("lon")
            ch_radius = ch.get("radius", 0.3)
            if ch_lat is not None and ch_lon is not None:
                hazard_areas.append([ch_lat, ch_lon, ch_radius])
                
    road_status = generate_road_status(start_points, end_points, hazard_areas)
    routes = []
    
    for i, start in enumerate(start_points):
        for j, end in enumerate(end_points):
            path, distance, estimated_time = optimize_aid_route(start, end, hazard_areas, road_status)
            
            routes.append({
                "id": f"Route-{i*10 + j + 101}",
                "start": f"Distribution Center {i+1}",
                "end": f"Affected Area {j+1}",
                "start_point": f"Distribution Center {i+1}",
                "end_point": f"Affected Area {j+1}",
                "path": path,
                "distance": f"{distance:.1f} km",
                "time": f"{estimated_time:.1f} min",
                "estimated_time": f"{estimated_time:.1f} min",
                "status": "Clear" if random.random() > 0.25 else "Congested",
                "hazards": [
                    {"location": [h[0], h[1]], "radius": h[2], "type": "Simulation Hazard"}
                    for h in hazard_areas if is_path_near_hazard(path, h)
                ]
            })
            
    return routes

@app.post("/api/evacuation")
def get_evacuation(req: EvacuationRequest):
    user_location = [req.user_lat, req.user_lon]
    
    # Retrieve incidents / hazards from DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT latitude, longitude, severity FROM incidents WHERE scenario = ? LIMIT 3", (req.scenario,))
    incidents = cursor.fetchall()
    
    hazard_areas = []
    for inc in incidents:
        # Radii between 0.01 and 0.02
        radius = 0.01 + (inc["severity"] / 100.0) * 0.01
        hazard_areas.append([inc["latitude"], inc["longitude"], radius])
        
    # Retrieve shelters from DB for active scenario
    cursor.execute("SELECT id, name, latitude, longitude, capacity, current_occupancy, food_status, water_status, medical_status, sanitation_status, accessibility, status, contact FROM shelters WHERE scenario = ?", (req.scenario,))
    shelter_rows = cursor.fetchall()
    conn.close()
    
    shelter_locations = []
    shelters_map = {}
    for row in shelter_rows:
        shelter_id = row["id"]
        shelter_locations.append([row["latitude"], row["longitude"]])
        shelters_map[len(shelter_locations) - 1] = {
            "id": shelter_id,
            "name": row["name"],
            "occupancy": row["current_occupancy"],
            "capacity": row["capacity"],
            "food_status": row["food_status"],
            "water_status": row["water_status"],
            "medical_status": row["medical_status"],
            "sanitation_status": row["sanitation_status"],
            "accessibility": row["accessibility"],
            "status": row["status"],
            "contact": row["contact"]
        }
        
    evac_routes = []
    if shelter_locations:
        routes_logic = generate_evacuation_routes_logic(user_location, hazard_areas, shelter_locations)
        for r in routes_logic:
            s_info = shelters_map[r["shelter_id"]]
            evac_routes.append({
                "shelter_id": s_info["id"],
                "shelter_name": s_info["name"],
                "path": r["path"],
                "length": round(r["length"] * 111, 1),
                "capacity_status": f"{s_info['occupancy']}/{s_info['capacity']}",
                "occupancy": s_info["occupancy"],
                "capacity": s_info["capacity"],
                "food_status": s_info["food_status"],
                "water_status": s_info["water_status"],
                "medical_status": s_info["medical_status"],
                "sanitation_status": s_info["sanitation_status"],
                "accessibility": s_info["accessibility"],
                "status": s_info["status"],
                "contact": s_info["contact"]
            })
        
    return {
        "routes": evac_routes,
        "shelters": shelter_locations,
        "hazards": hazard_areas
    }

@app.get("/api/shelters")
def get_shelters_endpoint():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shelters")
    rows = cursor.fetchall()
    conn.close()
    
    shelters = []
    for row in rows:
        shelters.append({
            "id": row["id"],
            "name": row["name"],
            "location": [row["latitude"], row["longitude"]],
            "capacity": row["capacity"],
            "occupancy": row["current_occupancy"],
            "current_occupancy": row["current_occupancy"],
            "resources": {
                "food": row["food_status"],
                "water": row["water_status"],
                "medical": row["medical_status"],
                "sanitation": row["sanitation_status"]
            },
            "accessibility": row["accessibility"],
            "status": row["status"],
            "contact": row["contact"]
        })
    return shelters

@app.get("/api/ai-explanations")
def get_ai_explanations(scenario: str, tab: Optional[str] = None):
    # Fetch details from DB to build prompt
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE scenario = ? AND status = 'Active'", (scenario,))
    active_incidents = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM shelters WHERE scenario = ? AND status = 'Open'", (scenario,))
    open_shelters = cursor.fetchone()[0]
    
    cursor.execute("SELECT name, capacity - current_occupancy AS free_space FROM shelters WHERE scenario = ? AND status = 'Open' ORDER BY free_space DESC LIMIT 3", (scenario,))
    best_shelters = cursor.fetchall()
    shelters_desc = ", ".join([f"{s['name']} (free space: {s['free_space']})" for s in best_shelters])
    conn.close()
    
    explanation = None
    if GROQ_API_KEY:
        try:
            prompt = (
                f"Active disaster scenario: {scenario}.\n"
                f"Active incidents count: {active_incidents}.\n"
                f"Open relief shelters count: {open_shelters}.\n"
                f"Top shelters by capacity: {shelters_desc}.\n"
                f"Active dashboard tab: {tab or 'general'}.\n\n"
                f"Task: Generate a professional JSON structure explaining the AI decision-making criteria. "
                f"Include a page_insights object in your response tailored to the active tab '{tab or 'general'}'. "
                f"Return EXACTLY a JSON object matching this schema (do not output any conversational response outside the JSON):\n"
                f"{{\n"
                f"  \"damage_assessment\": {{\n"
                f"    \"severity\": \"Summarize severity\",\n"
                f"    \"reasoning\": \"Reasoning based on satellite grids\",\n"
                f"    \"confidence\": \"Confidence score %\"\n"
                f"  }},\n"
                f"  \"resource_allocation\": {{\n"
                f"    \"priority\": \"Prioritized supplies/teams\",\n"
                f"    \"reasoning\": \"Reasoning based on social media or SMS signals\",\n"
                f"    \"action\": \"Recommended specific resource deployment action\"\n"
                f"  }},\n"
                f"  \"routing\": {{\n"
                f"    \"status\": \"Routing system state\",\n"
                f"    \"reasoning\": \"Reasoning for routes and blocks\",\n"
                f"    \"impact\": \"Estimated delay impact on aid delivery\"\n"
                f"  }},\n"
                f"  \"prediction\": {{\n"
                f"    \"next_24h\": \"Forecast prediction\",\n"
                f"    \"affected_population\": \"Estimate of affected population\"\n"
                f"  }},\n"
                f"  \"page_insights\": {{\n"
                f"    \"title\": \"AI Insights - Tab Name\",\n"
                f"    \"summary\": \"Brief 1-2 sentence page summary of conditions\",\n"
                f"    \"metrics\": [\n"
                f"      {{\"label\": \"Metric Label 1\", \"value\": \"Value 1\"}},\n"
                f"      {{\"label\": \"Metric Label 2\", \"value\": \"Value 2\"}},\n"
                f"      {{\"label\": \"Metric Label 3\", \"value\": \"Value 3\"}}\n"
                f"    ],\n"
                f"    \"recommendations\": [\n"
                f"      \"Actionable recommendation 1\",\n"
                f"      \"Actionable recommendation 2\"\n"
                f"    ],\n"
                f"    \"confidence\": \"Confidence %\"\n"
                f"  }}\n"
                f"}}"
            )
            ai_resp = query_groq(prompt, "You are a disaster response coordination advisor. Always reply with strict JSON matching the requested template.")
            explanation = json.loads(ai_resp)
        except Exception as e:
            print("Groq explanations failed, using fallback:", e)
            
    if not explanation or "page_insights" not in explanation:
        # Fallback
        base_explanation = {
            "damage_assessment": {
                "severity": "High damage concentration in northern districts" if scenario == "Simulated Flood" or scenario == "Simulated Cyclone" else "Widespread structural integrity concerns",
                "reasoning": "Satellite analysis detects substantial anomaly delta matching flow parameters.",
                "confidence": "88%"
            },
            "resource_allocation": {
                "priority": "Drinking Water & First Aid" if scenario == "Simulated Flood" or scenario == "Simulated Cyclone" else "Search/Rescue & Heavy Machinery",
                "reasoning": "High distress keywords in SMS fallback network and social reports.",
                "action": "Dispatch emergency logistics unit with high-priority kits."
            },
            "routing": {
                "status": "Dynamic Route Optimization Active",
                "reasoning": "Multiple roadway obstructions detected near active incidents.",
                "impact": "+15 mins average delay on blocked sectors"
            },
            "prediction": {
                "next_24h": "Secondary surges expected" if scenario == "Simulated Flood" else "Aftershock probability: 35%" if scenario == "Simulated Earthquake" else "Gradual containment and recovery start",
                "affected_population": "Approx. 15,000 citizens"
            }
        }

        # Page-specific insights logic
        fallback_insights = {
            "map": {
                "title": "Geospatial Crisis Map Analysis",
                "summary": "Analyzing the geographic distribution of live incident clusters and high-severity zones.",
                "metrics": [
                    {"label": "Active Incidents", "value": str(active_incidents)},
                    {"label": "Critical Hotspots", "value": "Sector 4 & Dadar"},
                    {"label": "Geo Tracking Coverage", "value": "100%"}
                ],
                "recommendations": [
                    "Direct emergency responders to high-severity markers on the map",
                    "Establish a temporary perimeter block around Zone 1"
                ],
                "confidence": "94%"
            },
            "damage": {
                "title": "Satellite Damage Detection Metrics",
                "summary": "Analyzing pre- and post-disaster spectral changes to estimate structural damage and flooding.",
                "metrics": [
                    {"label": "Estimated Damage", "value": "42.5% Average"},
                    {"label": "Confidence Level", "value": "89%"},
                    {"label": "Grids Assessed", "value": "24 sectors"}
                ],
                "recommendations": [
                    "Flag highlighted red/blue structures for immediate physical inspection",
                    "Divert recovery resources from sectors showing minimal damage levels"
                ],
                "confidence": "89%"
            },
            "social": {
                "title": "Social Media Distress Signal Triage",
                "summary": "Live processing of social posts to discover rescue coordinates and top civilian resource needs.",
                "metrics": [
                    {"label": "Distress Feeds", "value": "100 reports"},
                    {"label": "Dominant Demand", "value": "Drinking Water & Rescue"},
                    {"label": "Citizen Sentiment Index", "value": "Critical (-0.88)"}
                ],
                "recommendations": [
                    "Coordinate NGO dispatch with localized drinking water distress clusters",
                    "Dispatch boat rescue teams to Marine Drive coordinates"
                ],
                "confidence": "85%"
            },
            "sms": {
                "title": "Offline SMS Network Resilience",
                "summary": "Triage of emergency communications transmitted through low-bandwidth SMS fallback networks.",
                "metrics": [
                    {"label": "Offline Gateway Status", "value": "Operational (88%)"},
                    {"label": "SMS Reports Logged", "value": "150 Messages"},
                    {"label": "High-Priority Triage", "value": "35% Urgent"}
                ],
                "recommendations": [
                    "Deploy satellite communications backup COW to offline sectors",
                    "Instruct responders to prioritize SMS-logged medical distress tags"
                ],
                "confidence": "91%"
            },
            "alerts": {
                "title": "Common Alerting Protocol (CAP) Broadcasts",
                "summary": "Monitoring public warnings broadcasted via standard emergency alerts channels.",
                "metrics": [
                    {"label": "Broadcast Scope", "value": "Public Sector"},
                    {"label": "Broadcast Urgency", "value": "Immediate"},
                    {"label": "Active Warnings", "value": "5 Alerts"}
                ],
                "recommendations": [
                    "Push extreme severity alert signals to all active cellular towers",
                    "Ensure instructions are broadcasted in English and regional languages"
                ],
                "confidence": "95%"
            },
            "routing": {
                "title": "Supply Chain Routing Optimization",
                "summary": "Dijkstra-optimized pathway calculations bypassing active blockages and hazard zones.",
                "metrics": [
                    {"label": "Optimal Paths Computed", "value": "12 routes"},
                    {"label": "Active Blockages", "value": "4 major roads"},
                    {"label": "Average Supply Delay", "value": "12.4 minutes"}
                ],
                "recommendations": [
                    "Route supply convoys through the southern bypass freeway",
                    "Pre-position road clearing machinery near Bandra bridge"
                ],
                "confidence": "87%"
            },
            "evac": {
                "title": "Evacuation Flow Navigation",
                "summary": "Mapping safe navigation lanes from citizen coordinates to open shelters, avoiding hazard zones.",
                "metrics": [
                    {"label": "Safe Lanes Active", "value": "3 Main Lanes"},
                    {"label": "Evacuation Bottleneck Risk", "value": "Low-Medium"},
                    {"label": "Average Travel Time", "value": "14.5 minutes"}
                ],
                "recommendations": [
                    "Direct citizens to follow marked green lanes to closest shelters",
                    "Station traffic control units at high-density intersection points"
                ],
                "confidence": "90%"
            },
            "shelter": {
                "title": "Shelter Resource Optimization",
                "summary": "Predictive analysis of shelter occupancy rates and vital supply depletion timelines.",
                "metrics": [
                    {"label": "Shelters Registered", "value": "150 shelters"},
                    {"label": "Average Occupancy", "value": "62.4%"},
                    {"label": "Critical Supplies Index", "value": "Stable"}
                ],
                "recommendations": [
                    "Divert incoming evacuees to Colaba Community Hall (320 slots free)",
                    "Dispatch emergency food/water refills to Borivali Relief camp"
                ],
                "confidence": "93%"
            },
            "simulation": {
                "title": "Disaster Preparedness Simulator",
                "summary": "Running mock scenarios to stress-test regional emergency response preparedness levels.",
                "metrics": [
                    {"label": "Preparedness Rating", "value": "Good (78/100)"},
                    {"label": "Identified Deficit", "value": "Water supply beds"},
                    {"label": "Active Simulated Hazards", "value": "6 Zones"}
                ],
                "recommendations": [
                    "Increase water reserve levels by 15% in high-risk zones",
                    "Organize responder communication drills for simulated blackouts"
                ],
                "confidence": "82%"
            },
            "chat": {
                "title": "NLP Database Query Engine",
                "summary": "Assisting command staff in running natural language queries against SQLite database tables.",
                "metrics": [
                    {"label": "Query Parser Mode", "value": "Read-Only (SELECT)"},
                    {"label": "Database Engine", "value": "SQLite (cms.db)"},
                    {"label": "SQL Translation Rate", "value": "92.5%"}
                ],
                "recommendations": [
                    "Maintain precise column naming conventions in database queries",
                    "Verify parsed SQL queries via the drop-down log terminal"
                ],
                "confidence": "96%"
            }
        }
        
        selected_insights = fallback_insights.get(tab, fallback_insights["map"])
        if not explanation:
            explanation = base_explanation
        explanation["page_insights"] = selected_insights
        
    return explanation

# --- Advanced TEXT-TO-SQL AI Chatbot ---
@app.post("/api/chat")
def query_ai_chat(req: ChatRequest):
    if not GROQ_API_KEY:
        return {
            "response": "Groq LLM is not configured. Please supply GROQ_API_KEY in the `.env` file to activate the AI Chat Assistant.",
            "sql": "N/A"
        }
        
    # Schema guide for LLM
    schema_prompt = (
        "You are an expert SQLite Text-to-SQL parser. Your job is to translate a user's natural language question into a syntactically correct SQLite query.\n"
        "DATABASE SCHEMA:\n"
        "1. users (id, username, password, role)\n"
        "2. incidents (id, title, description, scenario, latitude, longitude, severity, status, timestamp) -- status is in ('Active', 'Mitigated', 'Monitoring')\n"
        "3. shelters (id, name, latitude, longitude, capacity, current_occupancy, food_status, water_status, medical_status, sanitation_status, accessibility, status, contact, scenario) -- food_status, water_status, medical_status, sanitation_status are values in ('Adequate', 'Limited', 'None'); status is in ('Open', 'Full', 'Closed'); accessibility is in ('Fully accessible', 'Wheelchair accessible', 'Partially accessible', 'Not accessible')\n"
        "4. social_media (id, text, location, latitude, longitude, need, timestamp, scenario) -- need is in ('Drinking Water', 'Food Supplies', 'Medical Assistance', 'Search & Rescue', 'Temporary Shelter')\n"
        "5. sms_messages (id, message, location, latitude, longitude, priority, timestamp, scenario) -- priority is in ('High', 'Medium', 'Low')\n"
        "6. cap_alerts (id, identifier, sender, sent, status, msg_type, scope, category, event, urgency, severity, certainty, headline, description, instruction, area_desc, polygon_data, scenario)\n\n"
        "RULES:\n"
        "1. Return ONLY the raw SQL SELECT query. Do not wrap it in markdown. Do not include '```sql' or similar block tags.\n"
        "2. Keep the query read-only (SELECT statements only). Do not generate INSERT, UPDATE, DELETE, or DROP queries.\n"
        "3. Filter results appropriately using conditions like LIKE '%query%' for text search.\n"
        f"4. The current disaster scenario selected by the coordinator is: '{req.scenario}'. Keep this in mind if they ask about 'current' shelters or alerts.\n"
        "5. If a question is not related to the database tables, return: NO_QUERY\n\n"
        f"USER QUESTION: {req.question}"
    )
    
    try:
        sql = query_groq(schema_prompt, "You are a text-to-SQL translator. Output only the SQL query string or NO_QUERY.").strip()
        
        # Clean markdown if generated
        sql = sql.replace("```sql", "").replace("```", "").strip()
        
        if not sql or sql == "NO_QUERY" or "select" not in sql.lower():
            # If LLM says NO_QUERY or no SELECT keyword found
            return {
                "response": "I could not find data corresponding to your request in the database. Please ask a question related to shelters, incidents, alerts, social reports, or SMS records.",
                "sql": sql if sql else "N/A"
            }
            
        # Security parsing (SELECT only)
        forbidden_keywords = ["insert", "update", "delete", "drop", "alter", "create", "truncate", "replace"]
        for kw in forbidden_keywords:
            if re.search(r'\b' + kw + r'\b', sql.lower()):
                raise ValueError("Unauthorized write keyword detected in SQL query.")
                
        # Execute query against database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        conn.close()
        
        # Format results for AI report synthesizer
        results_list = [dict(r) for r in rows[:15]] # Limit to top 15 results for prompt safety
        
        # Synthesize final response
        summary_prompt = (
            f"User Question: '{req.question}'\n"
            f"SQL Query executed: '{sql}'\n"
            f"Query Results from Database (JSON): '{json.dumps(results_list)}'\n\n"
            "Task: Synthesize a friendly, precise, and highly professional answer for the emergency responder dashboard. "
            "Address them as 'Commander' or 'Coordinator'. Highlight the key numbers and location names clearly. "
            "CRITICAL WRITING RULE: Do NOT use any double asterisks (**), single asterisks (*), or stars anywhere in your response. "
            "Write in natural, clean paragraph formatting with bullet points as clean dash lines ('- ') instead of asterisks. "
            "Ensure the output contains zero asterisks of any kind. If no rows were returned, politely mention that no records matched the criteria."
        )
        
        final_response = query_groq(summary_prompt, "You are an emergency command assistant. Summarize the database findings professionally with absolutely no asterisks, stars, or markdown bold symbols.")
        
        # Post-process to strip any accidental double-asterisks/stars generated by the LLM
        clean_response = final_response.replace("**", "").replace("*", "").strip()
        
        return {
            "response": clean_response,
            "sql": sql
        }
    except Exception as e:
        print("Error during AI Chat processing:", e)
        return {
            "response": f"Encountered an issue processing that query: {str(e)}",
            "sql": sql if 'sql' in locals() else "N/A"
        }

class SimulationRequest(BaseModel):
    scenario: str
    severity: int
    radius: float
    responders: int
    shelter_capacity: int
    food_supply: int

@app.post("/api/simulate")
def run_simulation(req: SimulationRequest):
    # Calculated demand metrics based on severity & radius
    estimated_affected = int(req.radius * req.severity * 250)
    required_responders = int(req.severity * 0.8 + req.radius * 2)
    required_shelter_slots = int(estimated_affected * 0.15)
    
    # Calculate gaps
    responder_gap = required_responders - req.responders
    shelter_gap = required_shelter_slots - req.shelter_capacity
    food_gap = int(req.severity * 1.1 - req.food_supply)
    
    # Preparedness Score: starts at 100, drops for each deficit
    score = 100
    deficiencies = []
    
    if responder_gap > 0:
        score -= min(30, responder_gap * 3)
        deficiencies.append(f"Responders deficit: Need {responder_gap} more teams pre-positioned.")
    if shelter_gap > 0:
        score -= min(40, int(shelter_gap / 10))
        deficiencies.append(f"Shelter capacity deficit: Short by {shelter_gap} emergency beds.")
    if food_gap > 0:
        score -= min(30, food_gap)
        deficiencies.append(f"Food/Water supply level index is low by {food_gap} units.")
        
    score = max(5, min(100, score))
    
    if score >= 85:
        status = "Ready / Fully Prepared"
    elif score >= 60:
        status = "Adequate / Action Recommended"
    else:
        status = "Critical Action Required"
        
    # Generate tasks
    tasks = []
    scen_lower = req.scenario.lower()
    if "flood" in scen_lower:
        tasks = [
            {"id": "t1", "text": "Deploy high-volume water pumps to the lowest-lying sectors"},
            {"id": "t2", "text": "Establish boat rescue muster stations at designated flood lines"},
            {"id": "t3", "text": "Pre-stage clean drinking water tankers at central shelters"}
        ]
    elif "earthquake" in scen_lower:
        tasks = [
            {"id": "t1", "text": "Dispatch heavy search & rescue equipment to structural failure zones"},
            {"id": "t2", "text": "Set up triaged field hospitals in designated open park areas"},
            {"id": "t3", "text": "Conduct seismic stability checks on critical supply-route bridges"}
        ]
    elif "cyclone" in scen_lower:
        tasks = [
            {"id": "t1", "text": "Reinforce shelter roofs and window shutters against high wind gusts"},
            {"id": "t2", "text": "Clear primary arterial evacuation pathways of anticipated debris"},
            {"id": "t3", "text": "Deploy satellite communication fallback kits to anticipated blackout zones"}
        ]
    elif "wildfire" in scen_lower:
        tasks = [
            {"id": "t1", "text": "Establish dynamic firebreaks around vulnerable residential boundaries"},
            {"id": "t2", "text": "Issue respiratory mask guidelines and dispatch breathing supplies"},
            {"id": "t3", "text": "Pre-position fire suppression tankers near critical power grid substations"}
        ]
    else:  # chemical
        tasks = [
            {"id": "t1", "text": "Activate public warning sirens and issue shelter-in-place instructions"},
            {"id": "t2", "text": "Deploy hazmat monitoring drones to map toxic plume shift vector"},
            {"id": "t3", "text": "Flush chemical filtration systems and shut intake valves in risk zones"}
        ]
            
    # timeline
    timeline = [
        {"hour": "Hour 0", "event": "Disaster Impact Trigger", "desc": f"{req.scenario} simulation starts at severity {req.severity}."},
        {"hour": "Hour 3", "event": "Evacuation Surge Peak", "desc": f"Evacuation flow peaks; estimated {int(estimated_affected*0.7)} citizens seeking shelter."},
        {"hour": "Hour 6", "event": "Resource Stress Point", "desc": "Assessing food and medical supply replenishment rates at active centers."},
        {"hour": "Hour 12", "event": "Triage & Stabilization", "desc": "Responders containing secondary hazards (grid sparks, water lines, plumes)."},
        {"hour": "Hour 24", "event": "Recovery Operations", "desc": "Transition to relief phase, clearing blockages, damage validation."}
    ]
    
    # chart data (hourly demand vs capacity)
    charts = []
    for h in range(0, 25, 4):
        demand_factor = np.sin(h / 8.0) * 0.4 + 0.6
        charts.append({
            "hour": f"H+{h}",
            "Capacity": req.shelter_capacity,
            "Demand": int(required_shelter_slots * demand_factor),
            "Responders": req.responders,
            "RequiredResponders": int(required_responders * (0.5 + 0.5 * np.cos(h / 12.0)))
        })
        
    return {
        "preparedness_score": score,
        "preparedness_status": status,
        "deficiencies": deficiencies,
        "tasks": tasks,
        "timeline": timeline,
        "charts": charts,
        "metrics": {
            "estimated_affected": estimated_affected,
            "required_responders": required_responders,
            "required_shelters": required_shelter_slots
        }
    }

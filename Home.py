import streamlit as st
import folium
from streamlit_folium import st_folium
import pandas as pd
import random
from PIL import Image, ImageDraw
import base64
from io import BytesIO
import numpy as np
import requests
from datetime import datetime, timedelta
import re
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import json
import networkx as nx
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import xml.etree.ElementTree as ET

# Download NLTK resources
try:
    nltk.download('punkt')
    nltk.download('stopwords')
    # Ensure punkt tokenizer is properly loaded
    from nltk.tokenize import PunktSentenceTokenizer
    tokenizer = PunktSentenceTokenizer()
    print("NLTK resources successfully loaded")
except Exception as e:
    print(f"Error loading NLTK resources: {str(e)}")
    # We'll show the warning in the Streamlit app if it loads
    # st.warning is only available after Streamlit has started

# ---- Page Config ----
st.set_page_config(page_title="AI Humanitarian Coordination MVP", layout="wide")

# ---- Sidebar ----
st.sidebar.title("Disaster Scenario")
scenario = st.sidebar.selectbox("Select Scenario", ["Simulated Flood", "Simulated Earthquake"])

# Satellite imagery source selection
st.sidebar.subheader("Satellite Imagery Source")
satellite_source = st.sidebar.selectbox(
    "Select Source", 
    ["Upload Custom", "Sentinel-2", "NASA GIBS", "Maxar Open Data"]
)

if satellite_source == "Upload Custom":
    uploaded_image = st.sidebar.file_uploader("Upload Satellite Image", type=["jpg", "png", "jpeg"])
else:
    # Date selection for satellite imagery
    imagery_date = st.sidebar.date_input(
        "Select Date", 
        datetime.now() - timedelta(days=5),
        max_value=datetime.now()
    )
    
    # Location input for satellite imagery
    location_input = st.sidebar.text_input("Location (Lat, Lon)", "26.85, 80.95")
    
    # Simulated satellite imagery fetch button
    fetch_imagery = st.sidebar.button("Fetch Satellite Imagery")

# AI analysis options
st.sidebar.subheader("AI Analysis Options")
run_damage_detection = st.sidebar.checkbox("Run Damage Detection", value=True)
run_social_analysis = st.sidebar.checkbox("Run Social Media Analysis", value=True)

# Run allocation button
run_allocation = st.sidebar.button("Run Complete Analysis")

# ---- Main Title ----
st.title("AI-Powered Humanitarian Coordination Dashboard")
st.write(f"Scenario: **{scenario}**")

# ---- Tabs for different features ----
tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs(["Crisis Map", "Damage Detection", "Social Media Analysis", "SMS Fallback", "CAP Alerts", "Routing Optimization", "Evacuation Routes", "Shelter Locator"])

# ---- Simulated Severity Data ----
random.seed(42)  # For reproducibility
df_zones = pd.DataFrame({
    "lat": [26.9 + random.uniform(-0.1, 0.1) for _ in range(5)],
    "lon": [80.95 + random.uniform(-0.1, 0.1) for _ in range(5)],
    "severity": [random.randint(70, 100) for _ in range(5)]
})
priority_df = df_zones.sort_values("severity", ascending=False).reset_index(drop=True)
priority_df.index += 1

# ---- Functions for CAP integration ----
def parse_cap_alerts(scenario):
    """Parse Common Alerting Protocol (CAP) alerts based on the selected scenario"""
    # In a real implementation, this would parse actual CAP feeds from IMD/NDMA or GDACS
    # For this demo, we'll simulate the alerts
    
    # Get simulated alerts
    simulated_alerts = fetch_cap_alerts(scenario)
    
    # Process alerts for display
    processed_alerts = []
    for alert in simulated_alerts:
        # Process polygon coordinates if present
        polygon = None
        if 'polygon' in alert['info']['area']:
            # Convert string polygon to list of coordinates
            polygon_str = alert['info']['area']['polygon']
            # Format: "lat1,lon1 lat2,lon2 lat3,lon3 ..."
            coords = []
            for point in polygon_str.split():
                lat, lon = point.split(',')
                coords.append([float(lat), float(lon)])
            polygon = coords
        
        # Process circle if present
        circle = None
        if 'circle' in alert['info']['area']:
            # Format: "lat,lon radius"
            circle_str = alert['info']['area']['circle']
            center_str, radius_str = circle_str.split()
            lat, lon = center_str.split(',')
            circle = [[float(lat), float(lon)], float(radius_str)]
        
        processed_alert = {
            'event': alert['info']['event'],
            'sender': alert['sender'],
            'sent': alert['sent'],
            'status': alert['status'],
            'severity': alert['info']['severity'],
            'description': alert['info']['description'],
            'instruction': alert['info']['instruction'],
            'area': alert['info']['area']['areaDesc'],
            'polygon': polygon,
            'circle': circle
        }
        processed_alerts.append(processed_alert)
    
    return processed_alerts

def fetch_cap_alerts(scenario):
    """Fetch Common Alerting Protocol (CAP) alerts from official sources"""
    # In a real implementation, this would connect to actual CAP feeds from IMD/NDMA or GDACS
    # For this demo, we'll simulate the alerts
    
    # Simulated CAP alerts in XML format
    simulated_alerts = [
        {
            "identifier": "CAP-1234567890",
            "sender": "NDMA.GOV.IN",
            "sent": datetime.now().strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "status": "Actual",
            "msgType": "Alert",
            "scope": "Public",
            "info": {
                "category": "Met",
                "event": "Flood",
                "urgency": "Immediate",
                "severity": "Severe",
                "certainty": "Observed",
                "headline": "Severe Flooding in Lucknow District",
                "description": "Heavy rainfall has caused severe flooding in parts of Lucknow district. Rivers are above danger level.",
                "instruction": "Evacuate low-lying areas immediately. Move to designated shelters.",
                "area": {
                    "areaDesc": "Lucknow District",
                    "polygon": "26.7,80.8 26.7,81.1 27.0,81.1 27.0,80.8 26.7,80.8",
                    "geocode": {
                        "valueName": "HASC",
                        "value": "IN.UP.LU"
                    }
                }
            }
        },
        {
            "identifier": "CAP-0987654321",
            "sender": "IMD.GOV.IN",
            "sent": (datetime.now() - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "status": "Actual",
            "msgType": "Alert",
            "scope": "Public",
            "info": {
                "category": "Met",
                "event": "Heavy Rainfall",
                "urgency": "Expected",
                "severity": "Moderate",
                "certainty": "Likely",
                "headline": "Heavy Rainfall Warning for Lucknow",
                "description": "Heavy rainfall (7-11 cm) expected in the next 24 hours in Lucknow and surrounding areas.",
                "instruction": "Avoid unnecessary travel. Stay away from flood-prone areas.",
                "area": {
                    "areaDesc": "Lucknow and surrounding districts",
                    "polygon": "26.6,80.7 26.6,81.2 27.1,81.2 27.1,80.7 26.6,80.7",
                    "geocode": {
                        "valueName": "HASC",
                        "value": "IN.UP"
                    }
                }
            }
        }
    ]
    
    return simulated_alerts

# ---- Functions for predictive resource allocation ----
def calculate_resource_allocation(severity_scores, population_density, accessibility):
    """Calculate optimal resource allocation based on multiple factors"""
    # In a real implementation, this would use more sophisticated algorithms
    # For this demo, we'll use a simple weighted formula
    
    # Normalize inputs to 0-1 scale
    max_severity = max(severity_scores)
    max_population = max(population_density)
    max_accessibility = max(accessibility)  # Higher value means more accessible
    
    normalized_severity = [s/max_severity for s in severity_scores]
    normalized_population = [p/max_population for p in population_density]
    normalized_accessibility = [a/max_accessibility for a in accessibility]
    
    # Calculate allocation scores with weights
    # Severity: 50%, Population: 30%, Accessibility: 20%
    allocation_scores = []
    for i in range(len(severity_scores)):
        score = (0.5 * normalized_severity[i] + 
                 0.3 * normalized_population[i] + 
                 0.2 * normalized_accessibility[i])
        allocation_scores.append(score)
    
    # Convert to percentages for resource allocation
    total_score = sum(allocation_scores)
    resource_allocation = [round((s/total_score) * 100, 1) for s in allocation_scores]
    
    return resource_allocation

# ---- Functions for evacuation routes and shelter location ----
def generate_evacuation_routes(user_location, hazard_areas, shelter_locations):
    """Generate safe evacuation routes that avoid hazard areas"""
    # In a real implementation, this would use actual road network data
    # For this demo, we'll create a simulated road network using NetworkX
    
    # Create a graph
    G = nx.Graph()
    
    # Add user location as node
    G.add_node("user", pos=(user_location[1], user_location[0]))  # NetworkX uses (x,y) = (lon,lat)
    
    # Add shelter locations as nodes
    for i, shelter in enumerate(shelter_locations):
        G.add_node(f"shelter_{i}", pos=(shelter[1], shelter[0]))
    
    # Create a grid of points to represent the road network
    grid_size = 10
    min_lat = min([user_location[0]] + [h[0] for h in hazard_areas] + [s[0] for s in shelter_locations]) - 0.05
    max_lat = max([user_location[0]] + [h[0] for h in hazard_areas] + [s[0] for s in shelter_locations]) + 0.05
    min_lon = min([user_location[1]] + [h[1] for h in hazard_areas] + [s[1] for s in shelter_locations]) - 0.05
    max_lon = max([user_location[1]] + [h[1] for h in hazard_areas] + [s[1] for s in shelter_locations]) + 0.05
    
    # Add grid points as nodes
    for i, lat in enumerate(np.linspace(min_lat, max_lat, grid_size)):
        for j, lon in enumerate(np.linspace(min_lon, max_lon, grid_size)):
            node_id = f"grid_{i}_{j}"
            G.add_node(node_id, pos=(lon, lat))
    
    # Connect nodes with edges (roads)
    for node1 in G.nodes():
        pos1 = G.nodes[node1]["pos"]
        for node2 in G.nodes():
            if node1 != node2:
                pos2 = G.nodes[node2]["pos"]
                
                # Calculate distance
                distance = ((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)**0.5
                
                # Only connect nearby nodes (simulating a road network)
                if distance < 0.02:  # Approximately 2km
                    # Check if the road passes through any hazard areas
                    road_is_safe = True
                    for hazard in hazard_areas:
                        hazard_lat, hazard_lon, hazard_radius = hazard
                        
                        # Check if either endpoint is in the hazard area
                        dist1 = ((pos1[1] - hazard_lat)**2 + (pos1[0] - hazard_lon)**2)**0.5
                        dist2 = ((pos2[1] - hazard_lat)**2 + (pos2[0] - hazard_lon)**2)**0.5
                        
                        # Check if the road passes through the hazard area
                        # Using a simplified approach - checking if the closest point on the line to the hazard center is within the radius
                        if dist1 < hazard_radius or dist2 < hazard_radius:
                            road_is_safe = False
                            break
                    
                    if road_is_safe:
                        G.add_edge(node1, node2, weight=distance)
    
    # Find routes to each shelter
    routes = []
    for i, shelter in enumerate(shelter_locations):
        try:
            # Find shortest path using Dijkstra's algorithm
            path = nx.shortest_path(G, source="user", target=f"shelter_{i}", weight="weight")
            
            # Convert node IDs to coordinates
            route_coords = []
            for node_id in path:
                pos = G.nodes[node_id]["pos"]
                route_coords.append([pos[1], pos[0]])  # Convert back to [lat, lon]
            
            # Calculate route length
            length = 0
            for j in range(len(route_coords) - 1):
                lat1, lon1 = route_coords[j]
                lat2, lon2 = route_coords[j+1]
                segment_length = ((lat1 - lat2)**2 + (lon1 - lon2)**2)**0.5 * 111  # Rough conversion to km
                length += segment_length
            
            routes.append({
                "shelter_id": i,
                "path": route_coords,
                "length": round(length, 2),
                "estimated_time": round(length / 4 * 60, 1)  # Assuming 4 km/h walking speed, convert to minutes
            })
        except nx.NetworkXNoPath:
            # No path exists
            continue
    
    return routes

def get_shelter_information():
    """Get information about available shelters and camps"""
    # In a real implementation, this would fetch data from a database or API
    # For this demo, we'll simulate shelter data
    
    shelters = [
        {
            "id": 1,
            "name": "City Hall Shelter",
            "location": [26.87, 80.92],
            "capacity": 500,
            "current_occupancy": 320,
            "resources": {
                "food": "Adequate",
                "water": "Adequate",
                "medical": "Limited",
                "bedding": "Adequate"
            },
            "accessibility": "Wheelchair accessible",
            "contact": "+91-9876543210"
        },
        {
            "id": 2,
            "name": "School Complex Shelter",
            "location": [26.83, 80.97],
            "capacity": 800,
            "current_occupancy": 450,
            "resources": {
                "food": "Limited",
                "water": "Adequate",
                "medical": "Adequate",
                "bedding": "Limited"
            },
            "accessibility": "Ground floor only",
            "contact": "+91-9876543211"
        },
        {
            "id": 3,
            "name": "Sports Stadium Camp",
            "location": [26.81, 80.93],
            "capacity": 1200,
            "current_occupancy": 890,
            "resources": {
                "food": "Adequate",
                "water": "Limited",
                "medical": "Adequate",
                "bedding": "Adequate"
            },
            "accessibility": "Fully accessible",
            "contact": "+91-9876543212"
        },
        {
            "id": 4,
            "name": "Community Center Shelter",
            "location": [26.88, 80.96],
            "capacity": 300,
            "current_occupancy": 120,
            "resources": {
                "food": "Limited",
                "water": "Limited",
                "medical": "Limited",
                "bedding": "Adequate"
            },
            "accessibility": "Partially accessible",
            "contact": "+91-9876543213"
        }
    ]
    
    return shelters

# ---- Functions for routing optimization ----
def optimize_routes(scenario):
    """Generate optimized routes based on the scenario"""
    # In a real implementation, this would use actual road network data and real-time updates
    # For this demo, we'll create simulated routes
    
    # Define start points (aid distribution centers)
    if scenario == "Simulated Flood":
        start_points = [
            [26.85, 80.95],  # Main distribution center
            [26.83, 80.92],  # Secondary center
            [26.87, 80.98]   # Tertiary center
        ]
        
        # Define end points (affected areas)
        end_points = [
            [26.82, 80.99],  # Heavily affected area 1
            [26.89, 80.93],  # Heavily affected area 2
            [26.86, 80.90],  # Moderately affected area
            [26.80, 80.96]   # Moderately affected area
        ]
        
        # Define hazard areas to avoid
        hazard_areas = [
            [26.84, 80.94, 0.5],  # [lat, lon, radius_km] - Flooded area
            [26.86, 80.97, 0.3]   # [lat, lon, radius_km] - Flooded area
        ]
    else:  # Earthquake scenario
        start_points = [
            [26.85, 80.95],  # Main distribution center
            [26.88, 80.91]   # Secondary center
        ]
        
        # Define end points (affected areas)
        end_points = [
            [26.83, 80.98],  # Heavily damaged area 1
            [26.87, 80.93],  # Heavily damaged area 2
            [26.81, 80.94],  # Moderately damaged area
            [26.84, 80.90]   # Moderately damaged area
        ]
        
        # Define hazard areas to avoid
        hazard_areas = [
            [26.85, 80.93, 0.4],  # [lat, lon, radius_km] - Building collapse risk
            [26.82, 80.96, 0.3]   # [lat, lon, radius_km] - Aftershock risk area
        ]
    
    # Generate routes using the optimize_aid_routes function
    road_status = generate_road_status(start_points, end_points, hazard_areas)
    routes = []
    
    # For each start point, find routes to all end points
    for i, start in enumerate(start_points):
        for j, end in enumerate(end_points):
            # Get the optimized path
            path, distance, estimated_time = optimize_aid_route(start, end, hazard_areas, road_status)
            
            # Create a route object
            route = {
                'id': f"route_{i}_{j}",
                'start_point': f"Distribution Center {i+1}",
                'end_point': f"Affected Area {j+1}",
                'path': path,
                'distance': distance,
                'estimated_time': estimated_time,
                'status': 'Open' if random.random() > 0.2 else 'Partially Blocked',
                'hazards': [h for h in hazard_areas if is_path_near_hazard(path, h)]
            }
            
            routes.append(route)
    
    return routes

def generate_road_status(start_points, end_points, hazard_areas):
    """Generate simulated road status information"""
    # In a real implementation, this would use actual road status data
    # For this demo, we'll create a simulated road status
    
    # Create a grid of points covering the area
    min_lat = min([p[0] for p in start_points + end_points]) - 0.05
    max_lat = max([p[0] for p in start_points + end_points]) + 0.05
    min_lon = min([p[1] for p in start_points + end_points]) - 0.05
    max_lon = max([p[1] for p in start_points + end_points]) + 0.05
    
    grid_points = []
    for lat in np.linspace(min_lat, max_lat, 10):
        for lon in np.linspace(min_lon, max_lon, 10):
            grid_points.append([lat, lon])
    
    # Generate road status for each grid point
    road_status = {}
    for i, p1 in enumerate(grid_points):
        for j, p2 in enumerate(grid_points):
            if i != j:
                # Check if the road passes near a hazard area
                is_hazardous = False
                for h in hazard_areas:
                    if is_path_near_hazard([p1, p2], h):
                        is_hazardous = True
                        break
                
                # Assign a status based on hazard proximity and random factors
                if is_hazardous:
                    status = random.choice(['Closed', 'Severely Damaged', 'Partially Open'])
                else:
                    status = random.choice(['Open', 'Open', 'Open', 'Minor Delays', 'Partially Open'])
                
                road_status[(tuple(p1), tuple(p2))] = status
    
    return road_status

def is_path_near_hazard(path, hazard):
    """Check if a path passes near a hazard area"""
    hazard_lat, hazard_lon, hazard_radius = hazard
    
    for point in path:
        # Calculate distance from point to hazard center
        lat_diff = point[0] - hazard_lat
        lon_diff = point[1] - hazard_lon
        distance = (lat_diff**2 + lon_diff**2)**0.5
        
        # Convert degrees to approximate kilometers (very rough approximation)
        distance_km = distance * 111
        
        if distance_km < hazard_radius:
            return True
    
    return False

def optimize_aid_route(start_point, end_point, hazard_areas, road_status):
    """Optimize a single route for aid delivery using graph algorithms"""
    # In a real implementation, this would use actual road network data
    # For this demo, we'll create a simulated route
    
    # Create a path that avoids hazard areas
    path = [start_point]
    
    # Check if direct path crosses any hazard areas
    direct_path = [start_point, end_point]
    if any(is_path_near_hazard(direct_path, h) for h in hazard_areas):
        # If direct path crosses hazards, create waypoints to avoid them
        waypoints = []
        for hazard in hazard_areas:
            if is_path_near_hazard(direct_path, hazard):
                # Create a waypoint to go around the hazard
                hazard_lat, hazard_lon, hazard_radius = hazard
                
                # Calculate vector from hazard to midpoint of direct path
                mid_lat = (start_point[0] + end_point[0]) / 2
                mid_lon = (start_point[1] + end_point[1]) / 2
                
                # Direction vector from hazard to midpoint
                dir_lat = mid_lat - hazard_lat
                dir_lon = mid_lon - hazard_lon
                
                # Normalize and scale to create waypoint outside hazard
                mag = (dir_lat**2 + dir_lon**2)**0.5
                if mag > 0:
                    waypoint_lat = hazard_lat + (dir_lat/mag) * (hazard_radius * 1.5 / 111)
                    waypoint_lon = hazard_lon + (dir_lon/mag) * (hazard_radius * 1.5 / 111)
                    waypoints.append([waypoint_lat, waypoint_lon])
        
        # Add waypoints to path
        path.extend(waypoints)
    
    path.append(end_point)
    
    # Calculate approximate distance and time
    distance = 0
    for i in range(len(path)-1):
        lat_diff = path[i+1][0] - path[i][0]
        lon_diff = path[i+1][1] - path[i][1]
        segment_distance = (lat_diff**2 + lon_diff**2)**0.5 * 111  # Rough conversion to km
        distance += segment_distance
    
    # Estimate time based on distance and random factors
    avg_speed = random.uniform(20, 50)  # km/h
    estimated_time = distance / avg_speed * 60  # minutes
    
    return path, round(distance, 2), round(estimated_time, 2)

def optimize_aid_routes(start_points, end_points, road_status):
    """Optimize routes for aid delivery using graph algorithms"""
    # In a real implementation, this would use actual road network data
    # For this demo, we'll create a simulated road network using NetworkX
    
    # Create a directed graph
    G = nx.DiGraph()
    
    # Add nodes (junctions/locations)
    for i, (lat, lon) in enumerate(start_points + end_points):
        G.add_node(i, pos=(lon, lat))  # Note: NetworkX uses (x,y) = (lon,lat) format
    
    # Add edges (roads) with weights based on distance and status
    num_nodes = len(G.nodes)
    for i in range(num_nodes):
        for j in range(i+1, num_nodes):
            # Get node positions
            pos_i = G.nodes[i]['pos']
            pos_j = G.nodes[j]['pos']
            
            # Calculate Euclidean distance as base weight
            distance = ((pos_i[0] - pos_j[0])**2 + (pos_i[1] - pos_j[1])**2)**0.5
            
            # Adjust weight based on road status (if available)
            road_key = f"{i}-{j}"
            status_multiplier = road_status.get(road_key, 1.0)
            
            # Add edges in both directions (it's a directed graph)
            weight = distance * status_multiplier
            G.add_edge(i, j, weight=weight)
            G.add_edge(j, i, weight=weight)
    
    # Find shortest paths from each start point to each end point
    optimal_routes = []
    for i, start in enumerate(start_points):
        start_idx = i
        for j, end in enumerate(end_points):
            end_idx = len(start_points) + j
            
            try:
                # Find shortest path using Dijkstra's algorithm
                path = nx.shortest_path(G, source=start_idx, target=end_idx, weight='weight')
                path_length = nx.shortest_path_length(G, source=start_idx, target=end_idx, weight='weight')
                
                # Convert node indices back to coordinates
                route_coords = [G.nodes[node_idx]['pos'] for node_idx in path]
                route_coords = [(lon, lat) for lon, lat in route_coords]  # Swap back to lat,lon format
                
                optimal_routes.append({
                    'start': start,
                    'end': end,
                    'path': route_coords,
                    'length': path_length
                })
            except nx.NetworkXNoPath:
                # No path exists
                optimal_routes.append({
                    'start': start,
                    'end': end,
                    'path': None,
                    'length': float('inf')
                })
    
    return optimal_routes, G

# ---- Functions for satellite imagery ingestion ----
def get_satellite_imagery(source, date, location):
    """Simulated function to fetch satellite imagery from various sources"""
    # In a real implementation, this would use APIs to fetch actual imagery
    # For this demo, we'll simulate the process
    
    # Parse location
    try:
        lat, lon = map(float, location.split(','))
    except Exception as e:
        st.warning(f"Error parsing location: {str(e)}. Using default location.")
        lat, lon = 26.85, 80.95  # Default location
    
    try:
        # Create a simulated image based on the source
        width, height = 500, 500
        img_array = np.zeros((height, width, 3), dtype=np.uint8)
        
        if source == "Sentinel-2":
            # Simulate Sentinel-2 imagery (bluish tint)
            img_array[:, :, 0] = np.random.randint(0, 100, (height, width))
            img_array[:, :, 1] = np.random.randint(50, 150, (height, width))
            img_array[:, :, 2] = np.random.randint(100, 200, (height, width))
            
            # Add some simulated features
            for i in range(10):
                x, y = np.random.randint(0, width), np.random.randint(0, height)
                size = np.random.randint(10, 50)
                img_array[max(0, y-size):min(height, y+size), max(0, x-size):min(width, x+size), :] = [0, 0, 150]
        
        elif source == "NASA GIBS":
            # Simulate NASA GIBS imagery (more detailed, higher contrast)
            img_array[:, :, 0] = np.random.randint(50, 200, (height, width))
            img_array[:, :, 1] = np.random.randint(50, 200, (height, width))
            img_array[:, :, 2] = np.random.randint(50, 200, (height, width))
            
            # Add grid pattern typical of some NASA products
            for i in range(0, height, 50):
                img_array[i:i+2, :, :] = [200, 200, 200]
            for j in range(0, width, 50):
                img_array[:, j:j+2, :] = [200, 200, 200]
        
        elif source == "Maxar Open Data":
            # Simulate Maxar imagery (higher resolution)
            img_array[:, :, 0] = np.random.randint(100, 200, (height, width))
            img_array[:, :, 1] = np.random.randint(100, 200, (height, width))
            img_array[:, :, 2] = np.random.randint(100, 200, (height, width))
            
            # Add more detailed features
            for i in range(20):
                x, y = np.random.randint(0, width), np.random.randint(0, height)
                size = np.random.randint(5, 20)
                color = np.random.randint(0, 255, 3)
                img_array[max(0, y-size):min(height, y+size), max(0, x-size):min(width, x+size), :] = color
        
        # Convert numpy array to PIL Image and ensure it's RGBA
        img = Image.fromarray(img_array)
        img_rgba = img.convert('RGBA')
        return img_rgba, [lat-0.1, lon-0.1, lat+0.1, lon+0.1]  # Return image and bounds
    except Exception as e:
        st.error(f"Error generating satellite imagery: {str(e)}")
        # Create a fallback image with error message
        img = Image.new('RGBA', (500, 500), (255, 255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((50, 250), f"Error: {str(e)}", fill=(255, 0, 0, 255))
        return img, [lat-0.1, lon-0.1, lat+0.1, lon+0.1]

# ---- Functions for AI-based damage detection ----
def detect_damage(image, scenario_type):
    """Simulated function for AI-based damage detection"""
    # In a real implementation, this would use pre-trained models
    # For this demo, we'll simulate the detection process
    
    # Convert PIL image to numpy array if it's not already
    if isinstance(image, Image.Image):
        img_array = np.array(image)
    else:
        img_array = image
    
    height, width = img_array.shape[:2]
    
    # Create a mask for detected damage
    damage_mask = np.zeros((height, width), dtype=np.uint8)
    
    # Simulate different damage patterns based on scenario
    if scenario_type == "Simulated Flood":
        # Simulate flooded areas (larger, more connected regions)
        for i in range(5):
            x, y = np.random.randint(0, width), np.random.randint(0, height)
            size = np.random.randint(30, 100)
            damage_mask[max(0, y-size):min(height, y+size), max(0, x-size):min(width, x+size)] = 1
            
        # Simulate flooded roads (linear patterns)
        for i in range(3):
            x1, y1 = np.random.randint(0, width), np.random.randint(0, height)
            x2, y2 = np.random.randint(0, width), np.random.randint(0, height)
            # Draw a line between (x1,y1) and (x2,y2)
            for t in range(100):
                x = int(x1 + (x2-x1) * t/100)
                y = int(y1 + (y2-y1) * t/100)
                if 0 <= x < width and 0 <= y < height:
                    damage_mask[y-5:y+5, x-5:x+5] = 1
    
    elif scenario_type == "Simulated Earthquake":
        # Simulate collapsed buildings (smaller, more scattered regions)
        for i in range(15):
            x, y = np.random.randint(0, width), np.random.randint(0, height)
            size = np.random.randint(10, 40)
            damage_mask[max(0, y-size):min(height, y+size), max(0, x-size):min(width, x+size)] = 1
    
    # Create a colored visualization of the damage
    damage_vis = np.zeros((height, width, 4), dtype=np.uint8)
    if scenario_type == "Simulated Flood":
        damage_vis[damage_mask == 1] = [0, 0, 255, 150]  # Blue for flood
    else:
        damage_vis[damage_mask == 1] = [255, 0, 0, 150]  # Red for earthquake damage
    
    # Generate damage statistics
    damage_percentage = (np.sum(damage_mask) / (height * width)) * 100
    damage_locations = []
    
    # Find distinct damage locations
    for i in range(5):
        y, x = np.unravel_index(np.argmax(damage_mask), damage_mask.shape)
        if damage_mask[y, x] > 0:
            damage_locations.append((y, x))
            # Clear the area around this maximum to find the next one
            y_min, y_max = max(0, y-20), min(height, y+20)
            x_min, x_max = max(0, x-20), min(width, x+20)
            damage_mask[y_min:y_max, x_min:x_max] = 0
    
    return Image.fromarray(damage_vis), damage_percentage, damage_locations

# ---- Functions for dynamic evacuation routes ----
def generate_evacuation_routes(current_location, hazard_areas, shelter_locations):
    """Generate safe evacuation routes that avoid hazard areas"""
    # In a real implementation, this would use actual road network data and real-time hazard information
    # For this demo, we'll simulate evacuation routes
    
    # Extract coordinates
    start_lat, start_lon = current_location
    
    # Create a graph excluding hazard areas
    G = nx.DiGraph()
    
    # Add nodes for current location and shelters
    G.add_node(0, pos=(start_lon, start_lat))  # Current location
    for i, (lat, lon) in enumerate(shelter_locations):
        G.add_node(i+1, pos=(lon, lat))
    
    # Add edges (roads) avoiding hazard areas
    num_nodes = len(G.nodes)
    for i in range(num_nodes):
        for j in range(i+1, num_nodes):
            # Get node positions
            pos_i = G.nodes[i]['pos']
            pos_j = G.nodes[j]['pos']
            
            # Check if edge crosses any hazard area (simplified check)
            crosses_hazard = False
            for hazard_lat, hazard_lon, radius in hazard_areas:
                # Check if midpoint of edge is in hazard area
                mid_lon = (pos_i[0] + pos_j[0]) / 2
                mid_lat = (pos_i[1] + pos_j[1]) / 2
                distance = ((mid_lon - hazard_lon)**2 + (mid_lat - hazard_lat)**2)**0.5
                if distance < radius:
                    crosses_hazard = True
                    break
            
            if not crosses_hazard:
                # Calculate Euclidean distance as weight
                distance = ((pos_i[0] - pos_j[0])**2 + (pos_i[1] - pos_j[1])**2)**0.5
                G.add_edge(i, j, weight=distance)
                G.add_edge(j, i, weight=distance)
    
    # Find shortest paths to each shelter
    evacuation_routes = []
    for i in range(1, num_nodes):  # Skip the first node (current location)
        try:
            # Find shortest path using Dijkstra's algorithm
            path = nx.shortest_path(G, source=0, target=i, weight='weight')
            path_length = nx.shortest_path_length(G, source=0, target=i, weight='weight')
            
            # Convert node indices back to coordinates
            route_coords = [G.nodes[node_idx]['pos'] for node_idx in path]
            route_coords = [(pos[1], pos[0]) for pos in route_coords]  # Swap back to lat,lon format
            
            evacuation_routes.append({
                'shelter_id': i-1,
                'path': route_coords,
                'length': path_length
            })
        except nx.NetworkXNoPath:
            # No path exists to this shelter
            pass
    
    return evacuation_routes

# ---- Functions for shelter/camp locator ----
def get_shelter_information():
    """Get information about available shelters and their capacity"""
    # In a real implementation, this would connect to a database of shelters
    # For this demo, we'll simulate shelter information
    
    shelters = [
        {
            "id": 1,
            "name": "City College Shelter",
            "location": [26.86, 80.92],
            "capacity": 500,
            "current_occupancy": 320,
            "resources": {
                "food": "Adequate",
                "water": "Adequate",
                "medical": "Limited",
                "sanitation": "Adequate"
            },
            "accessibility": "Wheelchair accessible",
            "status": "Open"
        },
        {
            "id": 2,
            "name": "Gandhi Stadium Camp",
            "location": [26.83, 80.94],
            "capacity": 1000,
            "current_occupancy": 750,
            "resources": {
                "food": "Limited",
                "water": "Adequate",
                "medical": "Adequate",
                "sanitation": "Limited"
            },
            "accessibility": "Partially accessible",
            "status": "Open"
        },
        {
            "id": 3,
            "name": "Central School Relief Camp",
            "location": [26.88, 80.97],
            "capacity": 300,
            "current_occupancy": 120,
            "resources": {
                "food": "Adequate",
                "water": "Limited",
                "medical": "Limited",
                "sanitation": "Adequate"
            },
            "accessibility": "Fully accessible",
            "status": "Open"
        },
        {
            "id": 4,
            "name": "Community Center Shelter",
            "location": [26.81, 80.91],
            "capacity": 200,
            "current_occupancy": 180,
            "resources": {
                "food": "Limited",
                "water": "Limited",
                "medical": "None",
                "sanitation": "Limited"
            },
            "accessibility": "Not accessible",
            "status": "Full"
        },
        {
            "id": 5,
            "name": "University Campus Shelter",
            "location": [26.87, 80.89],
            "capacity": 800,
            "current_occupancy": 400,
            "resources": {
                "food": "Adequate",
                "water": "Adequate",
                "medical": "Adequate",
                "sanitation": "Adequate"
            },
            "accessibility": "Fully accessible",
            "status": "Open"
        }
    ]
    
    return shelters

# ---- Functions for social media/NLP analysis ----
def analyze_social_media(scenario_type):
    """Simulated function for social media and NLP analysis"""
    # In a real implementation, this would connect to social media APIs
    # For this demo, we'll simulate social media posts
    
    # Generate simulated social media posts based on scenario
    posts = []
    locations = []
    needs = []
    
    if scenario_type == "Simulated Flood":
        sample_posts = [
            "Water is rising quickly in #Lucknow near Gandhi Bridge. Need rescue ASAP! #SOSFlood",
            "Our building is surrounded by water, no way to get out. Location: Indira Nagar, Lucknow",
            "Roads completely flooded in Gomti Nagar. No electricity for 24 hours. Need drinking water and food.",
            "#Emergency Flood waters entered ground floor. Family of 5 on roof. Hazratganj area.",
            "Can't reach emergency services. Water level rising. We're at Aliganj sector K. #Lucknow #FloodHelp",
            "School building flooded with 30+ children trapped. Urgent help needed at City Montessori School.",
            "Elderly parents stranded at home in Vikas Nagar. Need medical assistance and evacuation.",
            "Bridge collapsed near river bank. Multiple vehicles affected. Coordinates: 26.83, 80.92",
            "No clean water available in Jankipuram Extension. Children getting sick. #FloodRelief",
            "Hospital generator failing. Critical patients at risk. Sanjay Gandhi Hospital needs immediate help."
        ]
    else:  # Earthquake
        sample_posts = [
            "Building collapsed in central Lucknow. People trapped under debris. #EarthquakeEmergency",
            "We're stuck on 4th floor, building has cracks. Scared to move. Location: Kapoorthala, Lucknow",
            "Gas leak after earthquake in Indira Nagar. Strong smell. Evacuated but others might be affected.",
            "#SOS Multiple buildings damaged in Gomti Nagar. Need search and rescue teams urgently.",
            "Can't contact family in Aliganj sector G. Phone lines down. Anyone with info please help.",
            "School wall collapsed during class hours. Injuries reported. Butler Palace colony.",
            "Need medical help - many injured at Charbagh Railway Station after earthquake.",
            "Road blocked by debris near High Court. Emergency vehicles can't get through. Coordinates: 26.86, 80.94",
            "No electricity or water in Jankipuram. Several houses damaged. Need tents and supplies.",
            "Hospital evacuated due to structural damage. Patients in parking lot. KGMU Hospital needs support."
        ]
    
    # Randomly select posts and extract information
    selected_posts = random.sample(sample_posts, 5)
    
    for post in selected_posts:
        posts.append(post)
        
        # Extract location using improved regex patterns
        location_patterns = [
            r"in ([A-Za-z\s]+), Lucknow",
            r"in ([A-Za-z\s]+)",
            r"at ([A-Za-z\s]+)",
            r"near ([A-Za-z\s]+)",
            r"Location: ([A-Za-z\s]+)",
            r"([A-Za-z\s]+) area",
            r"Coordinates: ([0-9.]+), ([0-9.]+)"
        ]
        
        location = "Unknown"
        for pattern in location_patterns:
            match = re.search(pattern, post)
            if match:
                if pattern == r"Coordinates: ([0-9.]+), ([0-9.]+)" and len(match.groups()) == 2:  # Coordinates
                    location = f"{match.group(1)}, {match.group(2)}"
                else:
                    location = match.group(1)
                break
        locations.append(location)
        
        # Extract needs using simple tokenization instead of NLTK
        # This avoids the punkt_tab dependency issue
        tokens = post.lower().split()
        try:
            stop_words = set(stopwords.words('english'))
        except:
            # Fallback if stopwords aren't available
            stop_words = set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'])
        filtered_tokens = [w for w in tokens if w not in stop_words]
        
        need_keywords = {
            "water": "Drinking Water",
            "food": "Food Supplies",
            "medical": "Medical Assistance",
            "medicine": "Medical Supplies",
            "rescue": "Rescue Team",
            "evacuate": "Evacuation",
            "electricity": "Power Supply",
            "shelter": "Temporary Shelter",
            "trapped": "Search & Rescue",
            "injured": "Medical Assistance"
        }
        
        post_needs = []
        for token in filtered_tokens:
            if token in need_keywords:
                post_needs.append(need_keywords[token])
        
        if not post_needs:
            post_needs = ["General Assistance"]
            
        needs.append(", ".join(set(post_needs)))
    
    return posts, locations, needs

# ---- Functions for SMS fallback ----
def simulate_sms_messages(scenario_type):
    """Simulate SMS messages for areas without internet"""
    # In a real implementation, this would connect to SMS gateway
    # For this demo, we'll simulate SMS messages
    
    if scenario_type == "Simulated Flood":
        sms_messages = [
            "SOS. Flood in village Manaknagar. 20 families on rooftops. Send boats.",
            "No food or water since yesterday. Village Arjunganj completely flooded.",
            "Bridge broken at Bijnor road. Cannot leave area. Need help.",
            "Medical emergency. Elderly person needs insulin. Mohanlalganj area.",
            "Children trapped in school. Water rising. Bakshi Ka Talab area."
        ]
    else:  # Earthquake
        sms_messages = [
            "Houses collapsed in Kakori village. Many trapped. Urgent help needed.",
            "No shelter after earthquake. 15 families sleeping outside. Malihabad.",
            "Road to hospital blocked. Injured people waiting. Sarojini Nagar.",
            "School building unsafe after quake. Need tents for classes. Itaunja.",
            "Water pipeline broken. No clean water. Chinhat area needs water tankers."
        ]
    
    # Randomly select 3 messages
    selected_messages = random.sample(sms_messages, 3)
    
    # Extract locations and needs similar to social media analysis
    locations = []
    needs = []
    
    for message in selected_messages:
        # Improved location extraction for SMS using similar patterns to social media
        location_patterns = [
            r"in ([A-Za-z\s]+)",
            r"at ([A-Za-z\s]+)",
            r"near ([A-Za-z\s]+)",
            r"([A-Za-z\s]+) area",
            r"([A-Za-z\s]+) village",
            r"([A-Za-z\s]+) road"
        ]
        
        location = "Unknown"
        for pattern in location_patterns:
            match = re.search(pattern, message)
            if match:
                location = match.group(1)
                break
                
        # Fallback to last word before period if no match found
        if location == "Unknown":
            location = message.split(".")[0].split()[-1]
            
        locations.append(location)
        
        # Simple needs extraction
        if "food" in message.lower() or "water" in message.lower():
            needs.append("Food & Water")
        elif "medical" in message.lower() or "hospital" in message.lower() or "injured" in message.lower():
            needs.append("Medical Assistance")
        elif "trapped" in message.lower() or "collapsed" in message.lower():
            needs.append("Search & Rescue")
        elif "shelter" in message.lower() or "sleeping outside" in message.lower():
            needs.append("Temporary Shelter")
        else:
            needs.append("General Assistance")
    
    return selected_messages, locations, needs

# ---- Map Tab ----
with tab1:
    # ---- Map ----
    m = folium.Map(location=[26.85, 80.95], zoom_start=8)

    # Add severity markers
    for idx, row in priority_df.iterrows():
        folium.CircleMarker(
            location=[row["lat"], row["lon"]],
            radius=8,
            popup=f"Zone {idx} | Severity: {row['severity']}",
            color="red" if row['severity'] > 85 else "orange",
            fill=True
        ).add_to(m)

    # ---- Satellite Image Overlay ----
    satellite_img = None
    bounds = [[26.80, 80.90], [26.95, 81.05]]  # Default bounds

    if satellite_source == "Upload Custom" and uploaded_image is not None:
        try:
            # Convert image to base64 for overlay
            img = Image.open(uploaded_image).convert("RGBA")
            satellite_img = img
            st.success("Successfully loaded custom satellite image")
        except Exception as e:
            st.error(f"Error loading custom image: {str(e)}")
    elif satellite_source != "Upload Custom" and fetch_imagery:
        # Get satellite imagery from selected source
        try:
            lat, lon = map(float, location_input.split(','))
            img, img_bounds = get_satellite_imagery(satellite_source, imagery_date, location_input)
            satellite_img = img
            bounds = [[img_bounds[0], img_bounds[1]], [img_bounds[2], img_bounds[3]]]
            st.success(f"Successfully fetched {satellite_source} imagery for {imagery_date}")
        except Exception as e:
            st.error(f"Error fetching satellite imagery: {str(e)}")

    if satellite_img is not None:
        # Ensure image is in RGBA mode before saving
        if satellite_img.mode != 'RGBA':
            satellite_img = satellite_img.convert('RGBA')
            
        # Convert image to base64 for overlay
        buffered = BytesIO()
        satellite_img.save(buffered, format="PNG")
        img_b64 = base64.b64encode(buffered.getvalue()).decode()

        # Add the image overlay to the map
        folium.raster_layers.ImageOverlay(
            image=f"data:image/png;base64,{img_b64}",
            bounds=bounds,
            opacity=0.6
        ).add_to(m)

    # ---- Display Map ----
    st.subheader("Crisis Map")
    map_data = st_folium(m, width=700, height=500)

    # ---- Priority Table with Zone Selection ----
    st.subheader("Top Priority Zones")
    selected_zone = st.radio("Select a Zone to Highlight:", priority_df.index)

    if selected_zone:
        zone_row = priority_df.loc[selected_zone]
        st.success(f"Zone {selected_zone} selected: Severity {zone_row['severity']} — ({zone_row['lat']}, {zone_row['lon']})")
        # Create a zoomed map for the selected zone
        highlight_map = folium.Map(location=[zone_row["lat"], zone_row["lon"]], zoom_start=12)
        folium.Marker(
            location=[zone_row["lat"], zone_row["lon"]],
            popup=f"Zone {selected_zone} | Severity: {zone_row['severity']}",
            icon=folium.Icon(color="red" if zone_row['severity'] > 85 else "orange")
        ).add_to(highlight_map)
        st_folium(highlight_map, width=700, height=400)

# ---- Damage Detection Tab ----
with tab2:
    st.subheader("AI-Based Damage Detection")
    
    # Check if satellite image is available
    if 'satellite_img' not in locals() or satellite_img is None:
        st.warning("No satellite image available. Please fetch satellite imagery from the Crisis Map tab first.")
    elif run_damage_detection:
        try:
            # Run damage detection on the satellite image
            # Ensure satellite_img is in RGBA mode
            if satellite_img.mode != 'RGBA':
                satellite_img = satellite_img.convert('RGBA')
            damage_img, damage_percentage, damage_locations = detect_damage(satellite_img, scenario)
        except Exception as e:
            st.error(f"Error in damage detection: {str(e)}")
            st.info("Please try fetching the satellite imagery again from the Crisis Map tab.")
        
        # Display the original and damage detection images side by side
        col1, col2 = st.columns(2)
        with col1:
            st.write("Original Satellite Image")
            st.image(satellite_img, use_container_width=True)
        
        with col2:
            st.write("Damage Detection Overlay")
            # Ensure both images are in RGBA mode
            satellite_rgba = satellite_img.convert("RGBA") if satellite_img.mode != "RGBA" else satellite_img
            # Combine original and damage overlay
            combined_img = Image.alpha_composite(satellite_rgba, damage_img)
            st.image(combined_img, use_container_width=True)
        
        # Display damage statistics
        st.metric("Estimated Damage Coverage", f"{damage_percentage:.1f}%")
        
        # Display damage type information based on scenario
        if scenario == "Simulated Flood":
            st.write("**Detected Damage Types:**")
            col1, col2 = st.columns(2)
            with col1:
                st.info("Flooded Areas: Detected in multiple regions")
                st.info("Flooded Roads: Major transportation routes affected")
            with col2:
                st.info("Water-Damaged Buildings: Potential structural issues")
                st.info("Compromised Infrastructure: Bridges and utilities affected")
        else:  # Earthquake
            st.write("**Detected Damage Types:**")
            col1, col2 = st.columns(2)
            with col1:
                st.info("Collapsed Buildings: Multiple structures affected")
                st.info("Road Damage: Access routes compromised")
            with col2:
                st.info("Fire Outbreaks: Secondary damage from ruptured gas lines")
                st.info("Bridge Failures: Critical infrastructure damage")
    else:
        if satellite_source == "Upload Custom":
            st.info("Please upload a satellite image and enable damage detection to see AI analysis")
        else:
            st.info("Please fetch satellite imagery and enable damage detection to see AI analysis")

# ---- Social Media Analysis Tab ----
with tab3:
    st.subheader("Social Media & NLP Analysis")
    
    if run_social_analysis:
        # Run social media analysis
        posts, locations, needs = analyze_social_media(scenario)
        
        # Display the analysis results
        st.write("**Detected Distress Calls from Social Media:**")
        
        for i, (post, location, need) in enumerate(zip(posts, locations, needs)):
            with st.expander(f"Distress Call #{i+1} - {location}"):
                st.write(post)
                col1, col2 = st.columns(2)
                with col1:
                    st.write("**Extracted Location:**")
                    st.code(location)
                with col2:
                    st.write("**Identified Needs:**")
                    st.code(need)
        
        # Display a summary of needs
        all_needs = []
        for need_str in needs:
            all_needs.extend(need_str.split(", "))
        
        need_counts = {}
        for need in all_needs:
            if need in need_counts:
                need_counts[need] += 1
            else:
                need_counts[need] = 1
        
        st.write("**Summary of Identified Needs:**")
        for need, count in sorted(need_counts.items(), key=lambda x: x[1], reverse=True):
            st.progress(count / len(posts))
            st.write(f"{need}: {count} mentions")
    else:
        st.info("Enable social media analysis to see distress calls and needs assessment")

# ---- SMS Fallback Tab ----
with tab4:
    st.subheader("SMS Fallback System")
    st.write("For areas without smartphones or internet connectivity")
    
    # Run SMS fallback analysis
    sms_messages, sms_locations, sms_needs = simulate_sms_messages(scenario)
    
    # Display the SMS messages
    st.write("**Received SMS Messages:**")
    
    for i, (message, location, need) in enumerate(zip(sms_messages, sms_locations, sms_needs)):
        with st.expander(f"SMS #{i+1} - {location}"):
            st.write(message)
            col1, col2 = st.columns(2)
            with col1:
                st.write("**Extracted Location:**")
                st.code(location)
            with col2:
                st.write("**Identified Needs:**")
                st.code(need)
    
    # Display SMS coverage information
    st.write("**SMS Coverage Information:**")
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Active Cell Towers", f"{random.randint(5, 15)}/{random.randint(20, 30)}")
        st.metric("SMS Processing Rate", f"{random.randint(80, 99)}%")
    with col2:
        st.metric("Areas Without Internet", f"{random.randint(3, 8)}")
        st.metric("SMS-Only Communications", f"{random.randint(100, 500)} messages")

# ---- CAP Alerts Tab ----
with tab5:
    st.subheader("Common Alerting Protocol (CAP) Feeds")
    st.write("Displaying official alerts from disaster management authorities.")
    
    # Fetch CAP alerts
    cap_alerts = parse_cap_alerts(scenario)
    
    # Display alerts
    st.write("**Active Alerts:**")
    
    if cap_alerts:
        for i, alert in enumerate(cap_alerts):
            with st.expander(f"Alert #{i+1} - {alert['event']}"):
                st.write(f"**Sender:** {alert['sender']}")
                st.write(f"**Sent:** {alert['sent']}")
                st.write(f"**Status:** {alert['status']}")
                st.write(f"**Severity:** {alert['severity']}")
                st.write(f"**Description:** {alert['description']}")
                st.write(f"**Instructions:** {alert['instruction']}")
                st.write(f"**Area:** {alert['area']}")
        
        # Display alert areas on map
        st.write("**Alert Areas:**")
        cap_map = folium.Map(location=[26.85, 80.95], zoom_start=11)
        
        for alert in cap_alerts:
            # Set color based on severity
            color = 'red' if alert['severity'] == 'Extreme' else 'orange' if alert['severity'] == 'Severe' else 'yellow'
            
            # Add polygon if available
            if alert['polygon']:
                folium.Polygon(
                    locations=alert['polygon'],
                    color=color,
                    fill=True,
                    fill_color=color,
                    fill_opacity=0.4,
                    tooltip=f"{alert['event']} - {alert['severity']}"
                ).add_to(cap_map)
            
            # Add circle if available
            if alert['circle']:
                center = alert['circle'][0]  # [lat, lon]
                radius = alert['circle'][1] * 1000  # Convert km to m
                
                folium.Circle(
                    location=center,
                    radius=radius,
                    color=color,
                    fill=True,
                    fill_color=color,
                    fill_opacity=0.4,
                    tooltip=f"{alert['event']} - {alert['severity']}"
                ).add_to(cap_map)
        
        # Display the map
        cap_map_html = folium.Figure().add_child(cap_map).render()
        st.components.v1.html(cap_map_html, height=500)
    else:
        st.warning("No active CAP alerts for this scenario.")

# ---- Routing Optimization Tab ----
with tab6:
    st.subheader("Routing & Dispatch Optimization")
    st.write("Finding safe and efficient routes for aid delivery using graph algorithms.")
    
    # Get optimized routes
    routes = optimize_routes(scenario)
    
    if routes:
        # Display routes on map
        st.write("**Optimized Routes Map:**")
        route_map = folium.Map(location=[26.85, 80.95], zoom_start=11)
        
        # Add routes to map with different colors
        colors = ['blue', 'green', 'purple', 'orange', 'darkred', 'cadetblue', 'darkgreen', 'darkpurple']
        
        for i, route in enumerate(routes):
            color = colors[i % len(colors)]
            
            # Add route line
            folium.PolyLine(
                locations=route['path'],
                color=color,
                weight=4,
                opacity=0.8,
                tooltip=f"Route {i+1}: {route['start_point']} to {route['end_point']}"
            ).add_to(route_map)
            
            # Add start marker
            folium.Marker(
                location=route['path'][0],
                icon=folium.Icon(color='green', icon='play', prefix='fa'),
                tooltip=f"Start: {route['start_point']}"
            ).add_to(route_map)
            
            # Add end marker
            folium.Marker(
                location=route['path'][-1],
                icon=folium.Icon(color='red', icon='flag-checkered', prefix='fa'),
                tooltip=f"End: {route['end_point']}"
            ).add_to(route_map)
            
            # Add hazard markers if any
            for hazard in route.get('hazards', []):
                folium.Circle(
                    location=hazard['location'],
                    radius=hazard['radius']*1000,  # Convert km to m
                    color='red',
                    fill=True,
                    fill_opacity=0.4,
                    tooltip=f"Hazard: {hazard['type']}"
                ).add_to(route_map)
        
        # Display the map
        route_map_html = folium.Figure().add_child(route_map).render()
        st.components.v1.html(route_map_html, height=500)
        
        # Display route details
        st.write("**Route Details:**")
        route_df = pd.DataFrame([
            {
                'Route': f"Route {i+1}",
                'Start': route['start_point'],
                'End': route['end_point'],
                'Distance (km)': f"{route['distance']:.1f}",
                'Estimated Time': route['estimated_time'],
                'Status': route['status']
            } for i, route in enumerate(routes)
        ])
        st.dataframe(route_df, use_container_width=True)
        
        # Dynamic re-routing option
        st.subheader("Dynamic Re-routing")
        col1, col2 = st.columns(2)
        with col1:
            selected_route = st.selectbox("Select route to re-route", [f"Route {i+1}" for i in range(len(routes))])
        with col2:
            hazard_type = st.selectbox("New hazard type", ["Road blockage", "Flooding", "Bridge collapse", "Landslide"])
        
        if st.button("Simulate new hazard and re-route"):
            st.info(f"Re-routing {selected_route} to avoid new {hazard_type.lower()}...")
            st.success("Alternative route found. Updated map with new route.")
    else:
        st.warning("Route optimization data not available for this scenario.")

# ---- Evacuation Routes Tab ----
with tab7:
    st.subheader("Dynamic Evacuation Routes")
    st.write("Safe evacuation routes that avoid hazard areas.")
    
    # Get user location
    st.write("**Your Location:**")
    col1, col2 = st.columns(2)
    with col1:
        user_lat = st.number_input("Latitude", value=26.85, format="%.4f")
    with col2:
        user_lon = st.number_input("Longitude", value=80.95, format="%.4f")
    
    # Define hazard areas based on scenario
    hazard_areas = []
    if scenario == "Simulated Flood":
        hazard_areas = [
            (26.86, 80.93, 0.02),  # lat, lon, radius
            (26.84, 80.96, 0.015),
            (26.83, 80.92, 0.01)
        ]
    else:  # Earthquake
        hazard_areas = [
            (26.85, 80.94, 0.01),
            (26.87, 80.96, 0.02),
            (26.82, 80.93, 0.015)
        ]
    
    # Get shelter locations
    shelters = get_shelter_information()
    shelter_locations = [shelter["location"] for shelter in shelters]
    
    # Generate evacuation routes
    routes = generate_evacuation_routes((user_lat, user_lon), hazard_areas, shelter_locations)
    
    # Display routes on map
    st.write("**Evacuation Routes:**")
    evac_map = folium.Map(location=[user_lat, user_lon], zoom_start=12)
    
    # Add user location marker
    folium.Marker(
        location=[user_lat, user_lon],
        popup="Your Location",
        icon=folium.Icon(color="blue", icon="user", prefix="fa")
    ).add_to(evac_map)
    
    # Add hazard areas
    for lat, lon, radius in hazard_areas:
        folium.Circle(
            location=[lat, lon],
            radius=radius*111000,  # Convert degrees to meters (approx)
            color="red",
            fill=True,
            fill_opacity=0.4,
            popup="Hazard Area"
        ).add_to(evac_map)
    
    # Add shelter markers
    for i, shelter in enumerate(shelters):
        folium.Marker(
            location=shelter["location"],
            popup=shelter["name"],
            icon=folium.Icon(color="green", icon="home", prefix="fa")
        ).add_to(evac_map)
    
    # Add route lines
    colors = ["blue", "green", "purple", "orange", "darkred"]
    for i, route in enumerate(routes):
        folium.PolyLine(
            locations=route["path"],
            color=colors[i % len(colors)],
            weight=4,
            opacity=0.8,
            popup=f"Route to Shelter {route['shelter_id']+1}"
        ).add_to(evac_map)
    
    # Display the map
    evac_map_html = folium.Figure().add_child(evac_map).render()
    st.components.v1.html(evac_map_html, height=500)
    
    # Display route details
    if routes:
        st.write("**Route Details:**")
        for i, route in enumerate(routes):
            shelter = shelters[route["shelter_id"]]
            st.info(f"**Route {i+1}:** To {shelter['name']} - Distance: {route['length']*111:.1f} km - Available Capacity: {shelter['capacity']-shelter['current_occupancy']}")
    else:
        st.warning("No safe evacuation routes available from your location.")

# ---- Shelter Locator Tab ----
with tab8:
    st.subheader("Shelter Locator")
    st.write("Find nearby shelters with capacity and resource information.")
    
    # Get shelter information
    shelters = get_shelter_information()
    
    # Display shelters on map
    st.write("**Available Shelters:**")
    shelter_map = folium.Map(location=[26.85, 80.95], zoom_start=11)
    
    for shelter in shelters:
        # Determine color based on capacity
        capacity_pct = shelter["current_occupancy"] / shelter["capacity"] * 100
        if capacity_pct >= 90:
            color = "red"
        elif capacity_pct >= 70:
            color = "orange"
        else:
            color = "green"
        
        # Create popup content
        popup_html = f"""
        <b>{shelter['name']}</b><br>
        Capacity: {shelter['current_occupancy']}/{shelter['capacity']}<br>
        Status: {shelter['status']}<br>
        Resources: {', '.join([k for k, v in shelter['resources'].items() if v == 'Adequate'])}
        """
        
        folium.Marker(
            location=shelter["location"],
            popup=folium.Popup(popup_html),
            icon=folium.Icon(color=color, icon="home", prefix="fa")
        ).add_to(shelter_map)
    
    # Display the map
    shelter_map_html = folium.Figure().add_child(shelter_map).render()
    st.components.v1.html(shelter_map_html, height=500)
    
    # Display shelter details
    st.write("**Shelter Details:**")
    for shelter in shelters:
        with st.expander(f"{shelter['name']} ({shelter['current_occupancy']}/{shelter['capacity']})"):
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Location:** {shelter['location'][0]}, {shelter['location'][1]}")
                st.write(f"**Status:** {shelter['status']}")
                st.write(f"**Accessibility:** {shelter['accessibility']}")
            with col2:
                st.write("**Resources:**")
                for resource, status in shelter['resources'].items():
                    st.write(f"- {resource}: {status}")
    
    # Filter shelters by needs
    st.write("**Filter Shelters by Needs:**")
    col1, col2, col3 = st.columns(3)
    with col1:
        need_food = st.checkbox("Need Food")
    with col2:
        need_medical = st.checkbox("Need Medical")
    with col3:
        need_accessible = st.checkbox("Need Accessibility")
    
    if need_food or need_medical or need_accessible:
        filtered = shelters.copy()
        if need_food:
            filtered = [s for s in filtered if s['resources']['food'] == 'Adequate']
        if need_medical:
            filtered = [s for s in filtered if s['resources']['medical'] == 'Adequate']
        if need_accessible:
            filtered = [s for s in filtered if 'accessible' in s['accessibility'].lower()]
        
        if filtered:
            st.success(f"Found {len(filtered)} shelters matching your criteria.")
            for shelter in filtered:
                st.info(f"{shelter['name']} - {shelter['status']} - Available: {shelter['capacity']-shelter['current_occupancy']}")
        else:
            st.warning("No shelters match all selected criteria.")


# ---- AI Decision Explanations ----
with st.expander("AI Decision Explanations", expanded=True):
    st.header("AI Decision Explanations")
    
    st.subheader("Resource Allocation Reasoning")
    st.write("The AI system has analyzed all available data to make resource allocation decisions.")
    
    # Explanation boxes
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Damage Assessment Factors")
        st.info(
            "**Severity:** High damage concentration in northern districts\n\n"
            "**Pattern Analysis:** Damage follows river path indicating flood-related damage\n\n"
            "**Infrastructure Impact:** 3 major bridges affected, 2 hospitals with partial damage"
        )
        
        st.markdown("### Social Media Analysis Factors")
        st.info(
            "**Volume:** 230+ distress messages from central districts\n\n"
            "**Needs Analysis:** Medical assistance and water are most requested resources\n\n"
            "**Temporal Trends:** Increasing mentions of waterborne illness in last 6 hours"
        )
    
    with col2:
        st.markdown("### SMS Fallback Factors")
        st.info(
            "**Coverage Gaps:** Northwestern districts relying primarily on SMS\n\n"
            "**Critical Needs:** Food and shelter requests dominant in SMS communications\n\n"
            "**Accessibility:** 40% of SMS locations have limited road access"
        )
        
        st.markdown("### Decision Confidence")
        st.info(
            "**Overall Confidence:** 87% based on multi-source correlation\n\n"
            "**Uncertainty Factors:** Limited data from southwestern region\n\n"
            "**Recommendation Strength:** High confidence in northeastern resource allocation"
        )
    
    # Scenario-specific recommendations
    st.subheader("Scenario-Specific Recommendations")
    if scenario == "Simulated Flood":
        st.success(
            "### Flood Response Priorities\n\n"
            "1. **Deploy water pumps** to northern residential districts\n\n"
            "2. **Establish water purification stations** at identified gathering points\n\n"
            "3. **Prioritize medical teams** to areas reporting waterborne illness\n\n"
            "4. **Reinforce temporary shelters** against ongoing rainfall"
        )
    else:  # Earthquake
        st.success(
            "### Earthquake Response Priorities\n\n"
            "1. **Deploy search & rescue teams** to building collapse sites in urban center\n\n"
            "2. **Establish field hospitals** in 3 identified safe zones\n\n"
            "3. **Conduct structural assessment** of critical infrastructure\n\n"
            "4. **Create helicopter landing zones** for areas with road blockages"
        )
    
    # Show original allocation data if available
    if run_allocation:
        st.subheader("Zone-by-Zone Analysis")
        for idx, row in priority_df.iterrows():
            # Create more detailed explanations that incorporate all data sources
            damage_factor = random.randint(50, 100) if idx <= 2 else random.randint(20, 70)
            social_factor = random.randint(5, 20) if idx <= 3 else random.randint(1, 10)
            sms_factor = random.randint(3, 15) if idx <= 2 else random.randint(0, 5)
            
            st.markdown(
                f"**Zone {idx}:** Severity {row['severity']} — "
                f"Detected via satellite imagery ({damage_factor}% damage) + "
                f"{social_factor} social media reports + "
                f"{sms_factor} SMS messages."
            )
            
            # Add specific recommendations based on the scenario
            if scenario == "Simulated Flood" and idx == 1:
                st.info("**Critical Recommendation:** Deploy water rescue teams and boats immediately. Establish temporary shelters on higher ground.")
            elif scenario == "Simulated Earthquake" and idx == 1:
                st.info("**Critical Recommendation:** Deploy search and rescue teams with specialized equipment. Set up field medical stations.")
            
            if idx <= 2:
                st.success("**Resources Allocated:** Emergency response teams, medical supplies, and food/water dispatched.")
    else:
        st.info("Click 'Run Complete Analysis' in the sidebar to see detailed zone-by-zone analysis.")

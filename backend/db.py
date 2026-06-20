import sqlite3
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "cms.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)
    
    # 2. Incidents Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        scenario TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        severity INTEGER NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)
    
    # 3. Shelters Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS shelters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        capacity INTEGER NOT NULL,
        current_occupancy INTEGER NOT NULL,
        food_status TEXT NOT NULL,
        water_status TEXT NOT NULL,
        medical_status TEXT NOT NULL,
        sanitation_status TEXT NOT NULL,
        accessibility TEXT NOT NULL,
        status TEXT NOT NULL,
        contact TEXT NOT NULL,
        scenario TEXT NOT NULL
    )
    """)
    
    # 4. Social Media Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS social_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        need TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        scenario TEXT NOT NULL,
        platform TEXT,
        sentiment TEXT
    )
    """)
    
    # 5. SMS Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sms_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        location TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        priority TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        scenario TEXT NOT NULL
    )
    """)
    
    # 6. CAP Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cap_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL,
        sender TEXT NOT NULL,
        sent TEXT NOT NULL,
        status TEXT NOT NULL,
        msg_type TEXT NOT NULL,
        scope TEXT NOT NULL,
        category TEXT NOT NULL,
        event TEXT NOT NULL,
        urgency TEXT NOT NULL,
        severity TEXT NOT NULL,
        certainty TEXT NOT NULL,
        headline TEXT NOT NULL,
        description TEXT NOT NULL,
        instruction TEXT NOT NULL,
        area_desc TEXT NOT NULL,
        polygon_data TEXT NOT NULL,
        scenario TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

def seed_db_if_empty(force=False):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if database is already seeded with dense multi-disaster data
    if not force:
        try:
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(DISTINCT scenario) FROM incidents")
            scen_count = cursor.fetchone()[0]
        except Exception:
            user_count = 0
            scen_count = 0
            
        if user_count >= 150 and scen_count >= 5:
            print("Database already seeded with dense multi-disaster data.")
            conn.close()
            return
        
    print("Clearing old tables and seeding database with 150+ unique records per table for 5 scenarios...")
    cursor.execute("DELETE FROM users")
    cursor.execute("DELETE FROM incidents")
    cursor.execute("DELETE FROM shelters")
    cursor.execute("DELETE FROM social_media")
    cursor.execute("DELETE FROM sms_messages")
    cursor.execute("DELETE FROM cap_alerts")
    try:
        cursor.execute("DELETE FROM sqlite_sequence")
    except Exception:
        pass
    
    random.seed(42)
    
    # Common helper: Mumbai landmarks
    landmarks = [
        {"name": "Marine Drive", "lat": 18.9430, "lon": 72.8227},
        {"name": "Colaba", "lat": 18.9067, "lon": 72.8147},
        {"name": "Bandra", "lat": 19.0596, "lon": 72.8295},
        {"name": "Juhu", "lat": 19.1023, "lon": 72.8267},
        {"name": "Andheri", "lat": 19.1204, "lon": 72.8481},
        {"name": "Dadar", "lat": 19.0178, "lon": 72.8478},
        {"name": "Dharavi", "lat": 19.0380, "lon": 72.8538},
        {"name": "Kurla", "lat": 19.0726, "lon": 72.8846},
        {"name": "Chembur", "lat": 19.0622, "lon": 72.9024},
        {"name": "Borivali", "lat": 19.2294, "lon": 72.8573},
        {"name": "Powai", "lat": 19.1176, "lon": 72.9060},
        {"name": "Ghatkopar", "lat": 19.0864, "lon": 72.9082},
        {"name": "Worli", "lat": 19.0118, "lon": 72.8184},
        {"name": "Malad", "lat": 19.1874, "lon": 72.8484},
        {"name": "Kandivali", "lat": 19.2045, "lon": 72.8522},
        {"name": "Sion", "lat": 19.0371, "lon": 72.8634},
        {"name": "Byculla", "lat": 18.9750, "lon": 72.8336},
        {"name": "Fort", "lat": 18.9322, "lon": 72.8354},
        {"name": "Lower Parel", "lat": 18.9953, "lon": 72.8299},
        {"name": "Vashi", "lat": 19.0748, "lon": 72.9978}
    ]

    scenarios = [
        "Simulated Flood", 
        "Simulated Earthquake", 
        "Simulated Cyclone", 
        "Simulated Wildfire", 
        "Simulated Chemical Leak"
    ]
    
    # 1. Seed 150 Users
    roles = ["Admin", "Responder", "NGO", "Citizen"]
    users_data = []
    for i in range(1, 151):
        username = f"user_{i:03d}"
        password = f"pass_{i:03d}"
        role = roles[i % len(roles)]
        users_data.append((username, password, role))
    cursor.executemany("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", users_data)
    
    # 2. Seed 150 Incidents
    incidents_data = []
    flood_titles = [
        "River Overflows bank", "Residential area flooded", "Water logging on highway", 
        "Bridge under water", "Drainage failure causing flood", "Sewerage overflow",
        "Water treatment plant shut", "Low-lying area evacuation needed", "Stranded citizens on roof",
        "Submerged electricity grid"
    ]
    earthquake_titles = [
        "Building structural cracks", "Building partial collapse", "Wall collapse blocking street", 
        "Gas pipeline leak", "Metro line structural warning", "Fallen electrical poles", 
        "Fissure on main road", "Suspended bridge damage", "Water tank burst", 
        "Responders trapped in narrow alley"
    ]
    cyclone_titles = [
        "High wind structural damage", "Coastal storm surge flooding", "Fallen trees blocking major highway",
        "Mobile tower collapse", "Warehouse roof blown off", "Port operations suspended",
        "Debris blocking arterial roads", "Power transmission line failure", "Flying debris hazard",
        "Temporary shelter roof failure"
    ]
    wildfire_titles = [
        "Forest fire advancing rapidly", "Thick smoke hazard on highway", "Residential evacuation ordered",
        "Power substation in fire path", "Wildlife sanctuary boundary breached", "Spot fires in local park",
        "Dry timber yard fire", "Water reservoir pump smoke shutoff", "Fire crew access route blocked",
        "Air quality index critical warnings"
    ]
    chemical_titles = [
        "Gas plume released from industrial area", "Toxic chemical odor spreading", "Water supply chemical warning",
        "Hospital decontamination unit active", "Chemical warehouse fire", "Pipeline valve rupture",
        "Acid spill on cargo terminal", "Chemical tanker truck overturned", "Evacuation zone around factory",
        "Ventilation shutoff advisories"
    ]
    
    for i in range(1, 151):
        scen = scenarios[i % len(scenarios)]
        lm = landmarks[i % len(landmarks)]
        lat = lm["lat"] + random.uniform(-0.02, 0.02)
        lon = lm["lon"] + random.uniform(-0.02, 0.02)
        severity = random.randint(30, 99) if i % 10 != 0 else 100
        status = random.choice(["Active", "Mitigated", "Monitoring"])
        timestamp = (datetime.now() - timedelta(hours=i)).strftime("%Y-%m-%d %H:%M:%S")
        
        if scen == "Simulated Flood":
            title = f"{random.choice(flood_titles)} at {lm['name']}"
            desc = f"Heavy water accumulation reported at {lm['name']}. Level has reached critical limit. Resident support requested."
        elif scen == "Simulated Earthquake":
            title = f"{random.choice(earthquake_titles)} at {lm['name']}"
            desc = f"Moderate aftershocks have caused structural vulnerabilities at {lm['name']}. Citizens are advised to maintain distance."
        elif scen == "Simulated Cyclone":
            title = f"{random.choice(cyclone_titles)} at {lm['name']}"
            desc = f"High-velocity wind gusts have caused structural damage near {lm['name']}. Flying debris and storm surge hazards active."
        elif scen == "Simulated Wildfire":
            title = f"{random.choice(wildfire_titles)} at {lm['name']}"
            desc = f"Brush fire spreading near {lm['name']}. Smoke density is highly severe. Immediate containment operations underway."
        else:
            title = f"{random.choice(chemical_titles)} at {lm['name']}"
            desc = f"A critical chemical vapor release occurred near {lm['name']}. Local inhabitants must shelter in place with closed ventilation."
            
        incidents_data.append((title, desc, scen, lat, lon, severity, status, timestamp))
        
    cursor.executemany("""
        INSERT INTO incidents (title, description, scenario, latitude, longitude, severity, status, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, incidents_data)

    # 3. Seed 150 Shelters
    shelters_data = []
    shelter_types = ["Community Hall", "Government School", "Indoor Sports Stadium", "Coliseum Ground", "Relief Tent Camp"]
    accessibility_options = ["Fully accessible", "Wheelchair accessible", "Partially accessible", "Not accessible"]
    statuses = ["Open", "Open", "Full", "Closed"]
    
    for i in range(1, 151):
        lm = landmarks[i % len(landmarks)]
        name = f"{lm['name']} {random.choice(shelter_types)} {i}"
        lat = lm["lat"] + random.uniform(-0.015, 0.015)
        lon = lm["lon"] + random.uniform(-0.015, 0.015)
        capacity = random.randint(100, 1500)
        current_occupancy = random.randint(0, capacity)
        
        status = statuses[i % len(statuses)]
        if status == "Full":
            current_occupancy = capacity
        elif status == "Closed":
            current_occupancy = 0
            
        food = random.choice(["Adequate", "Limited", "Adequate", "None"])
        water = random.choice(["Adequate", "Adequate", "Limited", "None"])
        medical = random.choice(["Adequate", "Limited", "None"])
        sanitation = random.choice(["Adequate", "Limited", "Adequate"])
        accessibility = accessibility_options[i % len(accessibility_options)]
        contact = f"+91-98765{i:05d}"
        scen = scenarios[i % len(scenarios)]
        
        shelters_data.append((name, lat, lon, capacity, current_occupancy, food, water, medical, sanitation, accessibility, status, contact, scen))
    cursor.executemany("""
        INSERT INTO shelters (name, latitude, longitude, capacity, current_occupancy, food_status, water_status, medical_status, sanitation_status, accessibility, status, contact, scenario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, shelters_data)

    # 4. Seed 150 Social Media Distress Posts
    social_media_data = []
    needs = ["Drinking Water", "Food Supplies", "Medical Assistance", "Search & Rescue", "Temporary Shelter"]
    flood_templates = [
        "Water has entered the ground floor. Trapped inside near {landmark}. Need boat rescue immediately! #SOSFlood",
        "Heavy flooding in {landmark}. No clean drinking water available. Help us! #LucknowFloods",
        "Seniors trapped on the terrace without food or medicine at {landmark}. Please share and help.",
        "Gomti river level rising. Low lying areas of {landmark} completely cut off. Need evacuation support.",
        "Urgent: Medical support needed for a child with high fever at {landmark}. Roads are flooded.",
        "Relief camp at {landmark} is running out of food packets. Need urgent delivery.",
        "Power outage for last 48 hours and water rising near {landmark}. High emergency.",
        "Boat teams needed near {landmark}. Many families waiting on rooftops.",
        "Drinking water packets urgently required in {landmark}. Supply line broken.",
        "Roads are completely waterlogged near {landmark}. Avoid routing through here."
    ]
    eq_templates = [
        "Just felt a massive aftershock at {landmark}. Building wall collapsed. People trapped under rubble! #SOS",
        "Gas line leak reported at {landmark} post earthquake. Safe assembly point needed.",
        "Wall collapsed and blocked the main intersection near {landmark}. Ambulances cannot cross.",
        "Need blankets and temporary tents at {landmark} shelter. Weather is cold and people are scared.",
        "Injured citizens need first aid and medical transport near {landmark}. Emergency lines busy.",
        "Old structure partially collapsed at {landmark}. Search and rescue teams requested.",
        "Massive road crack / fissure near {landmark}. Do not drive this way.",
        "Water pipeline burst after earthquake in {landmark}. High water scarcity.",
        "Looking for volunteers to clear debris and help evacuees near {landmark}.",
        "Emergency shelter at {landmark} has run out of medical supplies. Please route donations."
    ]
    cyclone_templates = [
        "Severe winds blowing roofs off here in {landmark}. Stranded without power. #SOSCyclone",
        "Huge tree fell on our house near {landmark}. Need search and rescue assistance!",
        "Storm surge flooded our block in {landmark}. Water level up to waist. Help us!",
        "Debris blocking all paths near {landmark}. Evacuation vans cannot enter.",
        "No network or power at the relief camp in {landmark}. Short on water packets.",
        "Emergency roof damaged at {landmark} school shelter. Need plastic sheets and food.",
        "Windows shattered by wind at {landmark}, rain flooding inside. Anyone nearby?",
        "High wind warnings near {landmark}. Port warehouses damaged.",
        "Looking for missing family members who were near the harbor at {landmark}.",
        "Need emergency medical support for elderly relative cut off in {landmark}."
    ]
    wildfire_templates = [
        "Smoke is so thick near {landmark} we can't breathe! Need evacuation support. #SOSWildfire",
        "Fire has reached the outer boundary of the residential block near {landmark}. Help!",
        "Freeway completely blocked by smoke near {landmark}. Trapped in cars.",
        "Need clean air filters and water at the {landmark} community shelter. urgent.",
        "Active fire front moving towards {landmark} power substation. Evacuating now.",
        "Looking for volunteers to clear dry brush near {landmark} assembly park.",
        "Seniors trapped inside home with fire advancing down the road at {landmark}.",
        "Substation sparks flying near {landmark}. Entire sector has lost electricity.",
        "My dog is missing post fire alarm near {landmark}. Please watch out.",
        "Relief camp at {landmark} needs ice, water, and breathing masks."
    ]
    chemical_templates = [
        "Smelling a very strong chlorine gas odor near {landmark}. Eyes burning! #SOSChemical",
        "Industrial gas plume visible from the chemical plant near {landmark}. Inhaling fumes.",
        "Told to shelter in place at {landmark} government hall. Need bottled water.",
        "Water supply has a chemical taste in {landmark}. Do not drink!",
        "Emergency response team in hazmat suits active near {landmark}. Seek shelter.",
        "Ventilation shut down in our building near {landmark}. Getting suffocated.",
        "Tannery pipeline leak reported near {landmark}. Toxic sludge on streets.",
        "First aid kits and oxygen canisters required at {landmark} clinic.",
        "Ambulance blocked from entering {landmark} chemical zone. Need clear path.",
        "Commander: Toxic plume shifting direction towards {landmark}. Update route."
    ]
    
    for i in range(1, 151):
        scen = scenarios[i % len(scenarios)]
        lm = landmarks[i % len(landmarks)]
        lat = lm["lat"] + random.uniform(-0.01, 0.01)
        lon = lm["lon"] + random.uniform(-0.01, 0.01)
        need = needs[i % len(needs)]
        timestamp = (datetime.now() - timedelta(minutes=i*15)).strftime("%H:%M")
        
        if scen == "Simulated Flood":
            text = random.choice(flood_templates).format(landmark=lm["name"])
        elif scen == "Simulated Earthquake":
            text = random.choice(eq_templates).format(landmark=lm["name"])
        elif scen == "Simulated Cyclone":
            text = random.choice(cyclone_templates).format(landmark=lm["name"])
        elif scen == "Simulated Wildfire":
            text = random.choice(wildfire_templates).format(landmark=lm["name"])
        else:
            text = random.choice(chemical_templates).format(landmark=lm["name"])
            
        platform = random.choice(["Twitter/X", "Facebook", "Instagram", "Reddit"])
        if need in ["Search & Rescue", "Medical Assistance"]:
            sentiment = "Critical/SOS"
        elif need in ["Drinking Water", "Food Supplies"]:
            sentiment = "Actionable"
        else:
            sentiment = "Informational"
            
        social_media_data.append((text, lm["name"], lat, lon, need, timestamp, scen, platform, sentiment))
    cursor.executemany("""
        INSERT INTO social_media (text, location, latitude, longitude, need, timestamp, scenario, platform, sentiment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, social_media_data)

    # 5. Seed 150 SMS Fallback Reports
    sms_data = []
    sms_flood_templates = [
        "SOS. Water knee-deep at {landmark} sector {sector}. 15 people trapped on terrace. Need help.",
        "Need water and food at {landmark} school camp. 200 citizens here. Help.",
        "Flood level rising at {landmark}. Medical emergency. Dialysis patient needs transport.",
        "Main bridge closed near {landmark}. Alternate route needed to evacuate.",
        "Heavy rain, landslide risk at {landmark} area. Requesting NDRF team.",
        "Electricity pole down in water near {landmark}. Danger of electrocution.",
        "Need baby milk and diapers at {landmark} temporary shelter. urgent.",
        "Pregnant lady in labor at {landmark} block {sector}. No vehicles can reach due to flood.",
        "Water entered hospital basement at {landmark}. Need emergency generator support.",
        "Drinking water line contaminated at {landmark}. Safe water needed."
    ]
    sms_eq_templates = [
        "House collapsed at {landmark} street {sector}. 3 people trapped in debris. Send rescue team.",
        "Need medical aid immediately. Several injured after wall collapse at {landmark}.",
        "Strong aftershocks at {landmark}. Building showing large cracks. Scared to stay inside.",
        "Gas leak in kitchen after earthquake at {landmark}. Fire hazard.",
        "Road blocked by fallen trees and rubble at {landmark}. Access closed.",
        "Looking for missing family members last seen near {landmark} market.",
        "No power and water in {landmark} sector {sector} since the tremor. Send supplies.",
        "First aid kits and blankets needed at {landmark} open park assembly.",
        "Building tilted to side at {landmark}. Urgent evacuation of neighbors required.",
        "Heavy machinery needed to clear debris on Main Road near {landmark}."
    ]
    sms_cyclone_templates = [
        "SOS. Wind took the tin roof off our house at {landmark}. Trapped inside. Send rescue.",
        "Tree blocking our driveway at {landmark} block {sector}. Ambulance cannot leave.",
        "Storm surge flooding at {landmark}. Power lines snapped in water. Extremely dangerous.",
        "Relief camp at {landmark} sector {sector} is running out of food and water. Help.",
        "Flying debris injured citizen near {landmark}. Need first aid or transport.",
        "Mobile signal failing at {landmark}. Send satellite comms unit.",
        "No clean water since cyclone landfall at {landmark}. Children falling sick.",
        "Heavy rain and gale force winds near {landmark}. Road visibility zero.",
        "Evacuated to {landmark} hall, but the windows are breaking. Urgent.",
        "NDRF team required to clear fallen steel poles at {landmark} road."
    ]
    sms_wildfire_templates = [
        "SOS. Smoke too thick at {landmark} sector {sector}. Can't breathe, trapped in house.",
        "Substation fire at {landmark} has cut all power. Triage center has no lights.",
        "Fire approaching {landmark} park boundary. We need immediate evacuation routes.",
        "Water tankers needed at {landmark} to assist local firefighters.",
        "Road blocked by burning branches near {landmark}. Re-route rescue units.",
        "Volunteers evacuating horse shelter near {landmark}. Need trucks.",
        "Elderly neighbor refused to leave at {landmark} block {sector}. Send police help.",
        "Visibility zero on bypass highway near {landmark}. Multiple car accidents.",
        "Relief center at {landmark} school needs oxygen masks and drinking water.",
        "Dry scrub fire moving rapidly toward {landmark} neighborhood."
    ]
    sms_chemical_templates = [
        "SOS. Yellow cloud approaching {landmark}. Eyes and throat burning badly. Send help.",
        "Chemical leak at factory near {landmark}. Shelter-in-place instructions unclear.",
        "Water contamination reported at {landmark}. Send fresh water tank immediately.",
        "Need respirators and oxygen tanks at {landmark} clinic. Many asthma cases.",
        "Hazmat team needed at {landmark} block {sector} to contain tank valve leak.",
        "Overturned chemical tanker near {landmark}. Liquid spilling onto street.",
        "Commander: Toxic cloud shifting towards {landmark}. Need evacuation route advice.",
        "Wet towels placed on doors, but fumes entering our room in {landmark}.",
        "Industrial park fire involving toxic plastic barrels near {landmark}.",
        "Water supply shut down in {landmark} sector {sector} due to run-off risk."
    ]
    
    priorities = ["High", "High", "Medium", "High", "Medium", "Low"]
    
    for i in range(1, 151):
        scen = scenarios[i % len(scenarios)]
        lm = landmarks[i % len(landmarks)]
        lat = lm["lat"] + random.uniform(-0.012, 0.012)
        lon = lm["lon"] + random.uniform(-0.012, 0.012)
        priority = priorities[i % len(priorities)]
        timestamp = (datetime.now() - timedelta(minutes=i*12)).strftime("%H:%M")
        
        if scen == "Simulated Flood":
            message = random.choice(sms_flood_templates).format(landmark=lm["name"], sector=chr(65 + (i % 6)))
        elif scen == "Simulated Earthquake":
            message = random.choice(sms_eq_templates).format(landmark=lm["name"], sector=chr(65 + (i % 6)))
        elif scen == "Simulated Cyclone":
            message = random.choice(sms_cyclone_templates).format(landmark=lm["name"], sector=chr(65 + (i % 6)))
        elif scen == "Simulated Wildfire":
            message = random.choice(sms_wildfire_templates).format(landmark=lm["name"], sector=chr(65 + (i % 6)))
        else:
            message = random.choice(sms_chemical_templates).format(landmark=lm["name"], sector=chr(65 + (i % 6)))
            
        sms_data.append((message, lm["name"], lat, lon, priority, timestamp, scen))
    cursor.executemany("""
        INSERT INTO sms_messages (message, location, latitude, longitude, priority, timestamp, scenario)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, sms_data)

    # 6. Seed 150 CAP Alerts
    cap_data = []
    alert_categories = ["Met", "Geo", "Safety", "Rescue"]
    alert_severities = ["Severe", "Extreme", "Moderate", "Minor"]
    alert_urgencies = ["Immediate", "Expected", "Future", "Past"]
    alert_certainties = ["Observed", "Likely", "Possible", "Unlikely"]
    
    for i in range(1, 151):
        scen = scenarios[i % len(scenarios)]
        lm = landmarks[i % len(landmarks)]
        identifier = f"CAP-ALERT-{i:04d}"
        sender = f"NDMA.GOV.IN" if i % 2 == 0 else "IMD.GOV.IN"
        sent = (datetime.now() - timedelta(minutes=i*20)).strftime("%Y-%m-%dT%H:%M:%S+05:30")
        status = "Actual"
        msg_type = "Alert"
        scope = "Public"
        category = alert_categories[i % len(alert_categories)]
        urgency = alert_urgencies[i % len(alert_urgencies)]
        severity = alert_severities[i % len(alert_severities)]
        certainty = alert_certainties[i % len(alert_certainties)]
        
        flood_caps = [
            {
                "event": "Torrential Rain Warning",
                "headline": f"Extreme Cloudburst Alert near {lm['name']}",
                "description": f"Precipitation exceeding 75mm/hour detected. Threat of immediate flash flooding across {lm['name']} drainage basins.",
                "instruction": "Avoid crossing low-lying subways or waterlogged roads. Turn around, don't drown."
            },
            {
                "event": "River Inundation Emergency",
                "headline": f"Critical Reservoir Discharge Warning at {lm['name']}",
                "description": f"Uncontrolled spillway overflow at upstream dam has elevated river levels. Active shoreline flooding initiated in {lm['name']} sectors.",
                "instruction": "Immediately transfer to designated high ground or relief centers. Do not walk or drive through flowing water."
            },
            {
                "event": "Urban Drainage Failure",
                "headline": f"Infrastructure Sewerage Breach near {lm['name']}",
                "description": f"Debris blockages have caused a primary storm sewer failure, pushing backwash flooding into low-lying structures in {lm['name']}.",
                "instruction": "Turn off main electrical connections to avoid electrocution risks. Place sandbags at entryways if possible."
            }
        ]

        eq_caps = [
            {
                "event": "Earthquake Aftershock Advisory",
                "headline": f"Seismic Tremor Detection near {lm['name']}",
                "description": f"Multiple aftershocks ranging from magnitude 4.2 to 4.8 measured in {lm['name']} sector. Secondary wall cracking likely.",
                "instruction": "Relocate to open staging zones. Stand clear of glass panels, masonry chimneys, and overhead utility lines."
            },
            {
                "event": "Structural Integrity Warning",
                "headline": f"Critical Building Vulnerability Notice in {lm['name']}",
                "description": f"Safety engineers have flagged severe structural beam failures in high-rise complexes near {lm['name']} following the main tremor.",
                "instruction": "Immediately evacuate flagged zones. Do not use lifts or stairwells displaying active stress fractures."
            },
            {
                "event": "Gas Pipeline Rupture Alert",
                "headline": f"Combustible Gas Detection in {lm['name']}",
                "description": f"Subterranean seismic shifts have fractured a main high-pressure natural gas feed near {lm['name']}, creating a critical hazard.",
                "instruction": "Extinguish open flames. Do not use electrical switches. Evacuate upwind of the warning radius."
            }
        ]

        cyclone_caps = [
            {
                "event": "Gale Force Wind Alert",
                "headline": f"Extreme Gust Advisory near {lm['name']}",
                "description": f"Wind gusts up to 135 km/h are advancing towards coastal grids in {lm['name']}, threat of flying debris and power outages.",
                "instruction": "Retreat to structural concrete rooms. Keep windows closed and boarded. Stay away from glass exposures."
            },
            {
                "event": "Coastal Storm Inundation",
                "headline": f"Severe Tidal Surge Alert for {lm['name']}",
                "description": f"Cyclone atmospheric drop has triggered an elevated 3-meter surge wave, threatening to breach low coastal boundaries near {lm['name']}.",
                "instruction": "All coastal citizens must immediately retreat inland. Avoid marine terminals, beaches, and harbor structures."
            },
            {
                "event": "Utility Grid Outage Warning",
                "headline": f"Critical Telecommunications Alert near {lm['name']}",
                "description": f"Fallen towers and severe fiber snaps have disrupted over 80% of cell networks in {lm['name']} district. Fallback active.",
                "instruction": "Responders should swap to secondary satellite terminals and VHF hand-held emergency radio networks."
            }
        ]

        fire_caps = [
            {
                "event": "Brush Fire Outbreak",
                "headline": f"Rapid Scrub Fire Front Notice near {lm['name']}",
                "description": f"Low humidity and high wind parameters have fueled a scrub fire moving at 5 km/h towards the {lm['name']} residential zone.",
                "instruction": "Initiate defensive wet-barrier perimeters. Evacuate pets and vulnerable citizens immediately along clear bypass roads."
            },
            {
                "event": "Toxicity Smoke Advisory",
                "headline": f"Critical Air Index Notice in {lm['name']}",
                "description": f"Dense particulate carbon haze from the adjacent forest fire is settled over {lm['name']}, dropping visibility to under 300 meters.",
                "instruction": "Stay indoors. Wear N95 particulate respirators if outdoors. Keep ventilation units on closed recirculation loops."
            },
            {
                "event": "Substation Staging Risk",
                "headline": f"High Voltage Alert near {lm['name']}",
                "description": f"The wildfire front is within 400 meters of the primary regional distribution substation near {lm['name']}, hazard of active snaps.",
                "instruction": "Local grid sectors are temporarily powered down. Maintain a 1-kilometer safe buffer distance from the substation."
            }
        ]

        chem_caps = [
            {
                "event": "Industrial Plume Dispersion",
                "headline": f"Hazardous Chlorine Vapor Alert in {lm['name']}",
                "description": f"An accidental valve rupture at the industrial park has released a toxic chlorine gas plume dispersing towards {lm['name']}.",
                "instruction": "Shelter in place immediately. Seal doors and vents with wet towels. Move to upper floors as chlorine is heavier than air."
            },
            {
                "event": "Potable Water Contamination",
                "headline": f"Water Supply Warning near {lm['name']}",
                "description": f"Industrial chemical run-off has compromised local underground distribution aquifers near {lm['name']}. Toxic traces verified.",
                "instruction": "Do not consume tap water. Avoid boiling as it does not neutralize chemical toxins. Use bottled emergency rations."
            },
            {
                "event": "Corrosive Acid Spill",
                "headline": f"Noxious Chemical Spillage Alert at {lm['name']}",
                "description": f"A transport tanker collision has spilled over 5000 liters of concentrated hydrochloric acid onto the road near {lm['name']}.",
                "instruction": "Hazardous materials response units are active. Avoid the intersection within a 500-meter buffer radius."
            }
        ]

        t_idx = i % 3
        if scen == "Simulated Flood":
            t = flood_caps[t_idx]
        elif scen == "Simulated Earthquake":
            t = eq_caps[t_idx]
        elif scen == "Simulated Cyclone":
            t = cyclone_caps[t_idx]
        elif scen == "Simulated Wildfire":
            t = fire_caps[t_idx]
        else:
            t = chem_caps[t_idx]

        event = t["event"]
        headline = t["headline"]
        description = t["description"]
        instruction = t["instruction"]
            
        area_desc = f"{lm['name']} Sector {i % 5}"
        p_lat = lm["lat"]
        p_lon = lm["lon"]
        polygon = [
            [p_lat - 0.015, p_lon - 0.015],
            [p_lat - 0.015, p_lon + 0.015],
            [p_lat + 0.015, p_lon + 0.015],
            [p_lat + 0.015, p_lon - 0.015],
            [p_lat - 0.015, p_lon - 0.015]
        ]
        polygon_data = str(polygon)
        
        cap_data.append((identifier, sender, sent, status, msg_type, scope, category, event, urgency, severity, certainty, headline, description, instruction, area_desc, polygon_data, scen))
    
    cursor.executemany("""
        INSERT INTO cap_alerts (
            identifier, sender, sent, status, msg_type, scope, category, event, urgency, severity, certainty, headline, description, instruction, area_desc, polygon_data, scenario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, cap_data)
    
    conn.commit()
    conn.close()
    print("Database seeding completed. 150 records generated per table for 5 scenarios.")

if __name__ == "__main__":
    init_db()
    seed_db_if_empty(force=True)

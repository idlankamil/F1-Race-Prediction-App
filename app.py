import pandas as pd
import numpy as np
import joblib
import os
import json
import warnings
import requests
import xml.etree.ElementTree as ET
import re
import traceback
from fastapi import FastAPI, File, UploadFile, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio

# 🟢 1. IMPORT FACE RECOGNITION
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
    print("✅ Face recognition library loaded")
except ImportError:
    print("⚠️ 'face_recognition' not found. Install it to enable AI Identification.")
    FACE_REC_AVAILABLE = False

# 🟢 2. IMPORT NEWS LOGIC
try:
    from news_logic import update_f1_news_cache, query_f1_news
    print("✅ News logic loaded")
except ImportError:
    print("⚠️ News logic not found. Using fallback.")
    def update_f1_news_cache(): 
        print("📰 Fake news cache update")
        return True
    def query_f1_news(msg): 
        return f"News system offline. You asked: {msg}"

warnings.filterwarnings('ignore')

print("🔥🔥🔥 ELDHO: LOADING FIXED BACKEND V17 (RESTORED ENDPOINTS + XGBOOST) 🔥🔥🔥")
print(f"📂 Current directory: {os.getcwd()}")

app = FastAPI(title="F1 Backend API", version="1.7.0")

# 🟢 CRITICAL: Enhanced CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*", "ngrok-skip-browser-warning"],
    expose_headers=["*"]
)

# 🟢 CONSTANTS
DRIVERS_DIR = "driver_faces"
NEWS_FILE = 'f1_news_tagged.csv'
RATINGS_FILE = "fan_ratings.json"
MODELS_DIR = "saved_models"

# Check if driver_faces directory exists
if not os.path.exists(DRIVERS_DIR):
    os.makedirs(DRIVERS_DIR, exist_ok=True)

# ==========================================
# 🟢 GLOBAL VARIABLES
# ==========================================
known_face_encodings: List[Any] = []
known_face_ids: List[str] = []
CSV_DRIVERS: Dict[str, Dict] = {}

# 🔵 NEW PREDICTION GLOBALS
PREDICTION_DRIVERS = []
PREDICTION_TEAMS = {}
XGB_MODELS = {}
MODELS_AVAILABLE = False


# Maps Full Names (from CSV/Backend) to IDs (from your data.ts)
DRIVER_MAPPING = {
    "Lando Norris": "NOR",
    "Max Verstappen": "VER",
    "Oscar Piastri": "PIA",
    "George Russell": "RUS",
    "Charles Leclerc": "LEC",
    "Lewis Hamilton": "HAM",
    "Kimi Antonelli": "ANT",
    "Alexander Albon": "ALB",
    "Carlos Sainz": "SAI",
    "Fernando Alonso": "ALO",
    "Lance Stroll": "STR",
    "Nico Hulkenberg": "HUL",
    "Nico Hülkenberg": "HUL", # Handle special char
    "Gabriel Bortoleto": "BOR",
    "Yuki Tsunoda": "TSU",
    "Liam Lawson": "LAW",
    "Isack Hadjar": "HAD",
    "Esteban Ocon": "OCO",
    "Oliver Bearman": "BEA",
    "Pierre Gasly": "GAS",
    "Franco Colapinto": "COL"
}

# Maps CSV Team Names to data.ts Team IDs/Names if needed
TEAM_MAPPING = {
    "Red Bull": "Red Bull Racing",
    "RB": "Racing Bulls",
    "Sauber": "Kick Sauber",
    "Haas": "Haas F1 Team",
    "Mercedes": "Mercedes",
    "Ferrari": "Ferrari",
    "McLaren": "McLaren",
    "Aston Martin": "Aston Martin",
    "Alpine": "Alpine",
    "Williams": "Williams"
}

# ============================================================================
# 3. LOAD MODELS & DATA
# ============================================================================

# Global Data Containers
drivers_2025 = []
teams_2025 = {}
models = {}
MODELS_AVAILABLE = False

# Load Models
try:
    print("🤖 Loading XGBoost Intelligence...")
    models['win'] = joblib.load('XGBoost_target_win_model.pkl')
    models['podium'] = joblib.load('XGBoost_target_podium_model.pkl')
    # models['top10'] = joblib.load('XGBoost_target_top10_model.pkl') # Optional
    MODELS_AVAILABLE = True
    print("✅ XGBoost Models Loaded Successfully")
except Exception as e:
    print(f"⚠️  Model Load Failed: {e}")
    MODELS_AVAILABLE = False

# Load Data (Strict Logic)
def load_data():
    global drivers_2025, teams_2025
    try:
        # Load CSVs
        if os.path.exists('f1_driver_ratings.csv'):
            driver_df = pd.read_csv('f1_driver_ratings.csv')
        else:
            driver_df = pd.DataFrame(columns=['Driver_Name', 'Team', 'User_Skill_Rating'])

        if os.path.exists('team_ratings.csv'):
            team_df = pd.read_csv('team_ratings.csv')
        else:
            team_df = pd.DataFrame(columns=['Team', 'Car_Performance'])

        # Process Drivers
        if not driver_df.empty:
            driver_avg_df = driver_df.groupby('Driver_Name').agg({'User_Skill_Rating': 'mean'}).reset_index()
            # Get Team
            driver_teams = driver_df.groupby('Driver_Name')['Team'].agg(
                lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[0]
            )
            driver_avg_df['Team'] = driver_avg_df['Driver_Name'].map(driver_teams)
            
            # Normalize Skill
            min_s, max_s = driver_avg_df['User_Skill_Rating'].min(), driver_avg_df['User_Skill_Rating'].max()
            driver_avg_df['Skill_Norm'] = 5 + 4.8 * (driver_avg_df['User_Skill_Rating'] - min_s) / (max_s - min_s) if max_s > min_s else 7.5

            drivers_2025 = []
            for _, row in driver_avg_df.iterrows():
                # Correct Team Name
                team_name = TEAM_MAPPING.get(row['Team'], row['Team'])
                
                drivers_2025.append({
                    'name': row['Driver_Name'],
                    'team': team_name,
                    'skill': float(row['Skill_Norm']),
                    'id': DRIVER_MAPPING.get(row['Driver_Name'], row['Driver_Name'][:3].upper())
                })

        # Process Teams
        if not team_df.empty:
            team_avg_df = team_df.groupby('Team').agg({'Car_Performance': 'mean'}).reset_index()
            min_c, max_c = team_avg_df['Car_Performance'].min(), team_avg_df['Car_Performance'].max()
            team_avg_df['Car_Norm'] = 5 + 5 * (team_avg_df['Car_Performance'] - min_c) / (max_c - min_c) if max_c > min_c else 7.5

            teams_2025 = {}
            for _, row in team_avg_df.iterrows():
                # Map CSV team name to standardize
                std_name = TEAM_MAPPING.get(row['Team'], row['Team'])
                teams_2025[std_name] = {
                    'car': float(row['Car_Norm']),
                    'reliability': 8.5
                }

        print(f"📊 Data Loaded: {len(drivers_2025)} drivers, {len(teams_2025)} teams")

    except Exception as e:
        print(f"❌ Data Load Error: {e}")

load_data()

def load_prediction_data():
    """Loads specific data for the XGBoost Prediction Engine"""
    global PREDICTION_DRIVERS, PREDICTION_TEAMS
    
    print("\n📋 Loading Prediction Data (Ratings)...")
    try:
        if not os.path.exists('f1_driver_ratings.csv') or not os.path.exists('team_ratings.csv'):
            print("⚠️ Prediction CSVs not found. Predictions will be generic.")
            return

        driver_df = pd.read_csv('f1_driver_ratings.csv')
        team_df = pd.read_csv('team_ratings.csv')

        # 1. Process Drivers (Average Duplicates)
        driver_avg_df = driver_df.groupby('Driver_Name').agg({
            'User_Skill_Rating': 'mean',
        }).reset_index()

        # Map teams (mode)
        driver_teams = driver_df.groupby('Driver_Name')['Team'].agg(
            lambda x: x.mode().iloc[0] if not x.mode().empty else x.iloc[0]
        )
        driver_avg_df['Team'] = driver_avg_df['Driver_Name'].map(driver_teams)

        # 2. Process Teams
        team_avg_df = team_df.groupby('Team').agg({
            'Car_Performance': 'mean',
        }).reset_index()

        # 3. Normalize & Store
        driver_avg_df['Skill_Normalized'] = 5 + 4.8 * (driver_avg_df['User_Skill_Rating'] - driver_avg_df['User_Skill_Rating'].min()) / (driver_avg_df['User_Skill_Rating'].max() - driver_avg_df['User_Skill_Rating'].min())
        team_avg_df['Car_Normalized'] = 5 + 5 * (team_avg_df['Car_Performance'] - team_avg_df['Car_Performance'].min()) / (team_avg_df['Car_Performance'].max() - team_avg_df['Car_Performance'].min())

        PREDICTION_DRIVERS = []
        for _, row in driver_avg_df.iterrows():
            PREDICTION_DRIVERS.append({
                'name': row['Driver_Name'],
                'team': row['Team'],
                'skill': float(row['Skill_Normalized']),
                'consistency': 7.0
            })

        PREDICTION_TEAMS = {}
        for _, row in team_avg_df.iterrows():
            PREDICTION_TEAMS[row['Team']] = {
                'car': float(row['Car_Normalized']),
                'reliability': 8.5
            }
            
        print(f"✅ Prediction Data Loaded: {len(PREDICTION_DRIVERS)} drivers, {len(PREDICTION_TEAMS)} teams")

    except Exception as e:
        print(f"❌ Error loading prediction data: {e}")

def load_xgboost_models():
    """Loads XGBoost models if available"""
    global XGB_MODELS, MODELS_AVAILABLE
    print("\n🤖 Loading XGBoost models...")
    try:
        XGB_MODELS['win'] = joblib.load(os.path.join(MODELS_DIR, 'XGBoost_target_win_model.pkl'))
        XGB_MODELS['podium'] = joblib.load(os.path.join(MODELS_DIR, 'XGBoost_target_podium_model.pkl'))
        MODELS_AVAILABLE = True
        print("✅ XGBoost Models loaded successfully")
    except Exception as e:
        print(f"⚠️ Could not load XGBoost models: {e}")
        print("⚠️ Using realistic simulation fallback.")
        MODELS_AVAILABLE = False

def load_driver_csv() -> bool:
    """Load driver information with ROBUST stats parsing and Encoding Handling"""
    global CSV_DRIVERS
    csv_path = "F125_Roster.csv"
    
    if not os.path.exists(csv_path):
        print(f"❌ CSV file not found: {csv_path}")
        load_fallback_drivers()
        return False
    
    # 🟢 FIX: Try multiple encodings to handle special chars like 'é'
    encodings_to_try = ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']
    df = None
    
    for encoding in encodings_to_try:
        try:
            print(f"🔄 Trying to load CSV with encoding: {encoding}...")
            df = pd.read_csv(csv_path, encoding=encoding)
            print(f"✅ Success with encoding: {encoding}")
            break
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"⚠️ Error with {encoding}: {e}")
            continue
            
    if df is None:
        print("❌ Failed to read CSV with any encoding.")
        load_fallback_drivers()
        return False
    
    try:
        # Clean numeric data (handle blanks or errors)
        numeric_cols = ['Wins', 'Podiums', 'Poles', 'World_Champs', 'Race_Starts', 'F1_Debut', 'Age']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

        CSV_DRIVERS = {}
        loaded_count = 0
        
        for _, row in df.iterrows():
            try:
                driver_id = str(row.get('Abbr', '')).strip().upper()
                if not driver_id or len(driver_id) != 3: continue
                
                # 🟢 Extract ALL Stats
                CSV_DRIVERS[driver_id] = {
                    'name': str(row.get('Full_Name', 'Unknown')).strip(),
                    'team': str(row.get('Team', 'Unknown')).strip(),
                    'country': str(row.get('Nationality', 'Unknown')).strip(),
                    'id': driver_id,
                    'number': str(row.get('No.', '')).strip(),
                    'wins': int(row.get('Wins', 0)),
                    'podiums': int(row.get('Podiums', 0)),
                    'poles': int(row.get('Poles', 0)),
                    'world_champs': int(row.get('World_Champs', 0)),
                    'starts': int(row.get('Race_Starts', 0)),
                    'age': int(row.get('Age', 0)),
                    'f1_debut': int(row.get('F1_Debut', 0)),
                    'active': str(row.get('F1_Retired', 'Active')).strip().upper() == 'ACTIVE'
                }
                loaded_count += 1
            except: continue
            
        print(f"✅ Loaded {loaded_count} drivers with FULL STATS from CSV")
        return True
    except Exception as e:
        print(f"❌ CSV Processing Error: {e}")
        load_fallback_drivers()
        return False

def load_fallback_drivers():
    global CSV_DRIVERS
    CSV_DRIVERS = {
        'VER': {'name': 'Max Verstappen', 'team': 'Red Bull', 'id': 'VER', 'number': '1'},
        'HAM': {'name': 'Lewis Hamilton', 'team': 'Ferrari', 'id': 'HAM', 'number': '44'}
    }

def load_known_faces() -> int:
    if not FACE_REC_AVAILABLE or not os.path.exists(DRIVERS_DIR): return 0
    if not CSV_DRIVERS: load_driver_csv()
    
    print(f"📸 Loading faces from {DRIVERS_DIR}...")
    files = os.listdir(DRIVERS_DIR)
    loaded_count = 0
    known_face_encodings.clear()
    known_face_ids.clear()
    
    for filename in files:
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png')): continue
        try:
            base_name = os.path.splitext(filename)[0]
            match = re.match(r'^([A-Za-z]{3})', base_name, re.IGNORECASE)
            if match:
                driver_id = match.group(1).upper()
                filepath = os.path.join(DRIVERS_DIR, filename)
                image = face_recognition.load_image_file(filepath)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    known_face_encodings.append(encodings[0])
                    known_face_ids.append(driver_id)
                    loaded_count += 1
        except: continue
    return loaded_count

# ==========================================
# 🟢 MODELS
# ==========================================
class ChatRequest(BaseModel):
    message: str

class RacePredictionRequest(BaseModel):
    circuit_name: str

class RatingSubmission(BaseModel):
    driver_name: str
    rating: int      
    comment: str
    username: str = "Anonymous"

# ==========================================
# 🟢 ROOT & IMAGE ENDPOINTS
# ==========================================
@app.get("/")
async def root(request: Request):
    return {
        "status": "online",
        "service": "F1 Backend API",
        "version": "1.7.0 (Restored)",
        "dynamic_base_url": str(request.base_url).rstrip("/")
    }

@app.get("/driver-faces/{filename}")
async def get_driver_face(filename: str):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "ngrok-skip-browser-warning": "true",
        "Cache-Control": "public, max-age=3600"
    }
    file_path = os.path.join(DRIVERS_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, headers=headers)
    
    # Smart match
    base_name = os.path.splitext(filename)[0]
    match = re.match(r'^([A-Za-z]{3})', base_name)
    if match:
        driver_id = match.group(1).upper()
        for f in os.listdir(DRIVERS_DIR):
            if f.upper().startswith(driver_id) and f.lower().endswith(('.png', '.jpg')):
                return FileResponse(os.path.join(DRIVERS_DIR, f), headers=headers)
    
    return JSONResponse({"error": "Not found"}, status_code=404, headers=headers)

@app.get("/drivers")
async def get_drivers(request: Request):
    headers = {"ngrok-skip-browser-warning": "true"}
    if not CSV_DRIVERS: load_driver_csv()
    
    base_url = str(request.base_url).rstrip("/")
    drivers_out = []
    
    for did, dinfo in CSV_DRIVERS.items():
        drivers_out.append({
            "id": did,
            "name": dinfo['name'],
            "team": dinfo['team'],
            "country": dinfo.get('country', ''),
            "number": dinfo.get('number', ''),
            "image_url": f"{base_url}/driver-faces/{did}.png"
        })
    return JSONResponse({"drivers": drivers_out}, headers=headers)

# ==========================================
# 🟢 2. ALL DRIVERS ENDPOINT (FIXED: NOW RETURNS STATS)
# ==========================================
# 🟢 ALL DRIVERS ENDPOINT (WITH STATS)
@app.get("/drivers/all")
async def get_all_drivers():
    headers = {"ngrok-skip-browser-warning": "true"}
    if not CSV_DRIVERS: load_driver_csv()
    
    all_drivers_list = []
    for driver_id, driver_info in CSV_DRIVERS.items():
        all_drivers_list.append({
            "id": driver_id,
            "number": driver_info.get('number', '0'),
            "name": driver_info.get('name', 'Unknown'),
            "team": driver_info.get('team', 'Unknown'),
            "country": driver_info.get('country', 'Unknown'), # 🟢 Safe Access
            "status": "Active" if driver_info.get('active', True) else "Retired",
            "wins": driver_info.get('wins', 0),
            "podiums": driver_info.get('podiums', 0),
            "poles": driver_info.get('poles', 0),
            "world_champs": driver_info.get('world_champs', 0),
            "age": driver_info.get('age', 0),
            "starts": driver_info.get('starts', 0),
            "f1_debut": driver_info.get('f1_debut', 0)
        })
    return JSONResponse({"drivers": all_drivers_list}, headers=headers)

def prepare_features(driver, team, circuit, grid_pos):
    """
    Translates simple data into the EXACT 70 features expected by the .pkl model.
    CRITICAL: The order here matches the 'Expected' list from the error log.
    """
    team_stats = team if team else {'car': 5.0}
    
    # 1. Base Variables
    skill = driver['skill']
    car = team_stats['car']
    
    # 2. Build the ordered dictionary
    # NOTE: The order of keys here matters for the dataframe columns
    data = {
        # --- Grid ---
        'grid': grid_pos,
        'grid_advantage': 0,
        'is_front_row': 1 if grid_pos <= 2 else 0,
        'is_top10_grid': 1 if grid_pos <= 10 else 0,
        'is_pole': 1 if grid_pos == 1 else 0,
        
        # --- Driver Career ---
        'driver_career_wins': int(skill * 2),
        'driver_career_podiums': int(skill * 5),
        'driver_career_races': 50,
        'driver_win_rate': (skill / 10) * 0.15,
        'driver_career_avg_position': max(1, 14 - skill),
        
        # --- Driver Recent ---
        'driver_recent_wins': 0,
        'driver_recent_podiums': 0,
        'driver_recent_avg_position': max(1, 14 - skill),
        'driver_recent_points': skill * 10,
        
        # --- Team Career ---
        'team_career_wins': int(car * 2),
        'team_career_podiums': int(car * 5),
        'team_career_races': 100,
        'team_win_rate': (car / 10) * 0.15,
        'team_career_avg_position': max(1, 14 - car),
        
        # --- Team Recent ---
        'team_recent_wins': 0,
        'team_recent_podiums': 0,
        'team_recent_avg_position': max(1, 14 - car),

        # --- Circuit Stats (MOVED UP TO MATCH MODEL) ---
        'driver_circuit_wins': 0,
        'driver_circuit_avg_position': 10,
        'driver_circuit_experience': 5,
        'team_circuit_wins': 0,
        'team_circuit_avg_position': 10,
        
        # --- Season Context ---
        'season_races_completed': 5,
        'season_wins': 0,
        'season_podiums': 0,
        'season_points': 50,
        'season_progress': 0.2,
        'is_mid_season': 0,
        'is_end_season': 0,
        'races_remaining': 15,
        'back_to_back': 0,
        
        # --- Advanced Metrics ---
        'career_stage': 2,
        'career_momentum': 5.0,
        'peak_performance': skill,
        'consistency': 8.0,
        'performance_trend': 0.0,
        'team_development_index': 5.0,
        'team_resource_score': 8.0,
        'team_driver_experience': 10,
        
        # --- Circuit Types ---
        'is_power_circuit': 1 if circuit['type'] == 'power' else 0,
        'is_downforce_circuit': 1 if circuit['type'] == 'technical' else 0,
        'is_street_circuit': 1 if circuit['type'] == 'street' else 0,
        'circuit_complexity': circuit['difficulty'],
        'circuit_rain_probability': 0.1,
        'circuit_affinity': 0.5,
        
        # --- Weather ---
        'air_temp': 25,
        'track_temp': 35,
        'rainfall': 0,
        'humidity': 60,
        'weather_impact': 0,
        'temp_preference': 0,
        
        # --- Strategy & Misc ---
        'strategy_score': 7.0,
        'overtaking_difficulty': circuit['difficulty'] / 2,
        'grid_penalty_risk': 0,
        'winning_streak': 0,
        'points_streak': 0,
        'bad_luck_counter': 0,
        
        # --- Comparisons ---
        'performance_rating': skill + car,
        'teammate_avg_position': 10,
        'teammate_avg_rating': 7.0,
        'beat_teammate_position': 0,
        'beat_teammate_rating': 0,
        
        # --- Scores ---
        'win_probability_score': 0,
        'podium_score': 0,
        'points_score': 0
    }
    
    # 3. CRITICAL: Reorder columns to match model exactly
    expected_cols = [
        'grid', 'grid_advantage', 'is_front_row', 'is_top10_grid', 'is_pole', 
        'driver_career_wins', 'driver_career_podiums', 'driver_career_races', 'driver_win_rate', 'driver_career_avg_position', 
        'driver_recent_wins', 'driver_recent_podiums', 'driver_recent_avg_position', 'driver_recent_points', 
        'team_career_wins', 'team_career_podiums', 'team_career_races', 'team_win_rate', 'team_career_avg_position', 
        'team_recent_wins', 'team_recent_podiums', 'team_recent_avg_position', 
        'driver_circuit_wins', 'driver_circuit_avg_position', 'driver_circuit_experience', 'team_circuit_wins', 'team_circuit_avg_position', 
        'season_races_completed', 'season_wins', 'season_podiums', 'season_points', 'season_progress', 'is_mid_season', 'is_end_season', 'races_remaining', 'back_to_back', 
        'career_stage', 'career_momentum', 'peak_performance', 'consistency', 'performance_trend', 
        'team_development_index', 'team_resource_score', 'team_driver_experience', 
        'is_power_circuit', 'is_downforce_circuit', 'is_street_circuit', 'circuit_complexity', 'circuit_rain_probability', 'circuit_affinity', 
        'air_temp', 'track_temp', 'rainfall', 'humidity', 'weather_impact', 'temp_preference', 
        'strategy_score', 'overtaking_difficulty', 'grid_penalty_risk', 'winning_streak', 'points_streak', 'bad_luck_counter', 
        'performance_rating', 'teammate_avg_position', 'teammate_avg_rating', 'beat_teammate_position', 'beat_teammate_rating', 
        'win_probability_score', 'podium_score', 'points_score'
    ]
    
    df = pd.DataFrame([data])
    return df[expected_cols]
# ==========================================
# 🟢 PREDICTION LOGIC (INTEGRATED)
# ===========# ============================================================================
# 5. API ROUTES
# ============================================================================

class RacePredictionRequest(BaseModel):
    circuit_name: str

class RatingSubmission(BaseModel):
    driver_name: str
    team: str
    rating: float

@app.get("/")
def home():
    return {"status": "online", "model": "XGBoost v22", "drivers": len(drivers_2025)}

@app.post("/submit-rating")
async def submit_rating(sub: RatingSubmission):
    try:
        new_data = pd.DataFrame([{'Driver_Name': sub.driver_name, 'Team': sub.team, 'User_Skill_Rating': sub.rating}])
        header = not os.path.exists('f1_driver_ratings.csv')
        new_data.to_csv('f1_driver_ratings.csv', mode='a', header=header, index=False)
        load_data() # Reload immediately
        return {"message": "Rating saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict_race(data: RacePredictionRequest):
    input_name = data.circuit_name
    
    # 1. Identify Circuit
    circuits_db = {
        # Round 1: Melbourne
        'melbourne': {'name': 'Australia', 'type': 'street', 'difficulty': 5},
        'australia': {'name': 'Australia', 'type': 'street', 'difficulty': 5},
        
        # Round 2: Shanghai
        'shanghai': {'name': 'China', 'type': 'balanced', 'difficulty': 7},
        'china': {'name': 'China', 'type': 'balanced', 'difficulty': 7},
        
        # Round 3: Suzuka
        'suzuka': {'name': 'Japan', 'type': 'technical', 'difficulty': 9},
        'japan': {'name': 'Japan', 'type': 'technical', 'difficulty': 9},
        
        # Round 4: Bahrain
        'bahrain': {'name': 'Bahrain', 'type': 'power', 'difficulty': 6},
        
        # Round 5: Jeddah
        'jeddah': {'name': 'Jeddah', 'type': 'street', 'difficulty': 8},
        'saudi': {'name': 'Jeddah', 'type': 'street', 'difficulty': 8},
        
        # Round 6: Miami
        'miami': {'name': 'Miami', 'type': 'street', 'difficulty': 6},
        
        # Round 7: Imola
        'imola': {'name': 'Imola', 'type': 'technical', 'difficulty': 8},
        'emilia': {'name': 'Imola', 'type': 'technical', 'difficulty': 8},
        
        # Round 8: Monaco
        'monaco': {'name': 'Monaco', 'type': 'street', 'difficulty': 10},
        
        # Round 9: Barcelona
        'barcelona': {'name': 'Spain', 'type': 'technical', 'difficulty': 7},
        'spain': {'name': 'Spain', 'type': 'technical', 'difficulty': 7},
        
        # Round 10: Montreal
        'montreal': {'name': 'Canada', 'type': 'power', 'difficulty': 6},
        'canada': {'name': 'Canada', 'type': 'power', 'difficulty': 6},
        
        # Round 11: Spielberg
        'spielberg': {'name': 'Austria', 'type': 'power', 'difficulty': 5},
        'austria': {'name': 'Austria', 'type': 'power', 'difficulty': 5},
        
        # Round 12: Silverstone
        'silverstone': {'name': 'Great Britain', 'type': 'balanced', 'difficulty': 8},
        'britain': {'name': 'Great Britain', 'type': 'balanced', 'difficulty': 8},
        'uk': {'name': 'Great Britain', 'type': 'balanced', 'difficulty': 8},
        
        # Round 13: Hungaroring
        'hungaroring': {'name': 'Hungary', 'type': 'technical', 'difficulty': 8},
        'hungary': {'name': 'Hungary', 'type': 'technical', 'difficulty': 8},
        
        # Round 14: Spa
        'spa': {'name': 'Belgium', 'type': 'power', 'difficulty': 9},
        'belgium': {'name': 'Belgium', 'type': 'power', 'difficulty': 9},
        
        # Round 15: Zandvoort
        'zandvoort': {'name': 'Netherlands', 'type': 'technical', 'difficulty': 7},
        'netherlands': {'name': 'Netherlands', 'type': 'technical', 'difficulty': 7},
        
        # Round 16: Monza
        'monza': {'name': 'Italy', 'type': 'power', 'difficulty': 4},
        'italy': {'name': 'Italy', 'type': 'power', 'difficulty': 4},
        
        # Round 17: Baku
        'baku': {'name': 'Azerbaijan', 'type': 'street', 'difficulty': 7},
        'azerbaijan': {'name': 'Azerbaijan', 'type': 'street', 'difficulty': 7},
        
        # Round 18: Singapore
        'singapore': {'name': 'Singapore', 'type': 'street', 'difficulty': 9},
        'marina bay': {'name': 'Singapore', 'type': 'street', 'difficulty': 9},
        
        # Round 19: Austin
        'austin': {'name': 'USA', 'type': 'balanced', 'difficulty': 6},
        'usa': {'name': 'USA', 'type': 'balanced', 'difficulty': 6},
        'americas': {'name': 'USA', 'type': 'balanced', 'difficulty': 6},
        
        # Round 20: Mexico City
        'mexico': {'name': 'Mexico', 'type': 'power', 'difficulty': 5},
        
        # Round 21: Interlagos
        'interlagos': {'name': 'Brazil', 'type': 'balanced', 'difficulty': 7},
        'brazil': {'name': 'Brazil', 'type': 'balanced', 'difficulty': 7},
        'são paulo': {'name': 'Brazil', 'type': 'balanced', 'difficulty': 7},
        
        # Round 22: Las Vegas
        'vegas': {'name': 'Las Vegas', 'type': 'street', 'difficulty': 6},
        
        # Round 23: Qatar
        'qatar': {'name': 'Qatar', 'type': 'power', 'difficulty': 5},
        'lusail': {'name': 'Qatar', 'type': 'power', 'difficulty': 5},
        
        # Round 24: Abu Dhabi
        'abu dhabi': {'name': 'Abu Dhabi', 'type': 'balanced', 'difficulty': 5},
        'yas marina': {'name': 'Abu Dhabi', 'type': 'balanced', 'difficulty': 5},
        'uae': {'name': 'Abu Dhabi', 'type': 'balanced', 'difficulty': 5}
    }
    
    # Fuzzy match
    circuit = {'name': input_name, 'type': 'balanced', 'difficulty': 5} # Default
    for key, val in circuits_db.items():
        if key.lower() in input_name.lower():
            circuit = val
            break
    
    print(f"🎯 Predicting: {circuit['name']}")
    print(f"📊 Circuit Type: {circuit['type'].upper()} | Difficulty: {circuit['difficulty']}/10")
    
    # 2. Calculate driver performances for this specific circuit (OLD CODE LOGIC)
    driver_performances = []
    for driver in drivers_2025:
        team = teams_2025.get(driver['team'], {'car': 6.0})
        
        # OLD CODE LOGIC: Calculate circuit-specific performance
        if circuit['type'] == 'street':
            performance = driver['skill'] * 0.7 + team['car'] * 0.3
        elif circuit['type'] == 'power':
            performance = driver['skill'] * 0.3 + team['car'] * 0.7
        else:  # technical, balanced
            performance = driver['skill'] * 0.5 + team['car'] * 0.5
        
        driver_performances.append((driver, team, performance))
    
    # Sort by performance (higher is better)
    driver_performances.sort(key=lambda x: x[2], reverse=True)
    
    predictions = []
    
    # 3. Generate Predictions using OLD CODE LOGIC
    for i, (driver, team, perf) in enumerate(driver_performances):
        position = i + 1  # Performance ranking
        
        # OLD CODE WIN PROBABILITY CALCULATION
        if position == 1:
            # Race winner probabilities
            win_prob = 25.0 + (perf - 10) * 5
            win_prob = max(15, min(45, win_prob))
            
            # Podium probability
            podium_prob = 85.0 + (perf - 10) * 3
            podium_prob = max(70, min(98, podium_prob))
            
            # Points probability
            points_prob = 99.0
            
        elif position <= 3:
            # Podium contenders
            win_prob = 8.0 + (perf - 10) * 3
            win_prob = max(3, min(20, win_prob))
            
            podium_prob = 65.0 + (perf - 10) * 5
            podium_prob = max(40, min(90, podium_prob))
            
            points_prob = 95.0 + (perf - 10) * 1
            points_prob = max(85, min(99, points_prob))
            
        elif position <= 7:
            # Front runners
            win_prob = 2.0 + (perf - 10) * 1
            win_prob = max(0.5, min(8, win_prob))
            
            podium_prob = 25.0 + (perf - 10) * 4
            podium_prob = max(10, min(60, podium_prob))
            
            points_prob = 80.0 + (perf - 10) * 3
            points_prob = max(60, min(95, points_prob))
            
        elif position <= 10:
            # Points scorers
            win_prob = 0.5 + (perf - 10) * 0.3
            win_prob = max(0.1, min(3, win_prob))
            
            podium_prob = 8.0 + (perf - 10) * 2
            podium_prob = max(2, min(25, podium_prob))
            
            points_prob = 65.0 + (perf - 10) * 4
            points_prob = max(40, min(85, points_prob))
            
        elif position <= 15:
            # Midfield
            win_prob = 0.1
            podium_prob = 2.0 + (perf - 10) * 1
            podium_prob = max(0.5, min(10, podium_prob))
            points_prob = 25.0 + (perf - 10) * 5
            points_prob = max(10, min(50, points_prob))
        else:
            # Backmarkers
            win_prob = 0.05
            podium_prob = 0.5
            points_prob = 8.0 + (perf - 10) * 3
            points_prob = max(2, min(25, points_prob))
        
        # Adjust for circuit difficulty (OLD CODE LOGIC)
        difficulty_factor = circuit['difficulty'] / 10.0
        win_prob *= (1.0 - (difficulty_factor - 0.5) * 0.2)
        podium_prob *= (1.0 - (difficulty_factor - 0.5) * 0.1)
        
        # Ensure reasonable probabilities
        win_prob = max(0.1, min(50, win_prob))
        podium_prob = max(0.5, min(99, podium_prob))
        points_prob = max(2, min(99, points_prob))
        
        # OLD CODE REASONS SYSTEM
        reasons = {"positive": [], "negative": []}
        
        # Positive reasons
        if position == 1:
            reasons['positive'].append("Top Performance Ranking")
        elif position <= 3:
            reasons['positive'].append("High Performance Ranking")
        
        if driver['skill'] > 8.0:
            reasons['positive'].append("Elite Driver")
        
        if team['car'] > 8.0:
            reasons['positive'].append("Strong Car")
        
        if circuit['type'] == 'street' and driver['skill'] > 7.5:
            reasons['positive'].append("Street Circuit Specialist")
        elif circuit['type'] == 'power' and team['car'] > 8.0:
            reasons['positive'].append("Power Circuit Advantage")
        
        # Negative reasons
        if position > 10:
            reasons['negative'].append("Below Average Performance")
        
        if team['car'] < 6.0:
            reasons['negative'].append("Car Performance Deficit")
        
        if circuit['difficulty'] > 8 and driver['skill'] < 7.0:
            reasons['negative'].append("Challenging Circuit")
        
        # Build Frontend-Compatible Object with ALL probabilities
        predictions.append({
            "position": position,  # Performance ranking position
            "driver": {
                "id": driver['id'],  # Matches data.ts (e.g., 'NOR')
                "name": driver['name'],
                "team": driver['team'],
                "shortName": driver['id'],  # Matches data.ts
                "nationality": "Unknown",  # Optional fill
                "number": 0,  # Optional fill
                "status": "active"
            },
            "probability": round(win_prob, 1),  # Win probability
            "podium_probability": round(podium_prob, 1),  # Podium probability
            "points_probability": round(points_prob, 1),  # Top 10/Points probability
            "performance_score": round(perf, 2),  # For debugging/display
            "reasons": reasons
        })
    
    # 4. Sort by win probability for final ranking
    predictions.sort(key=lambda x: x['probability'], reverse=True)
    
    # Reassign positions based on win probability ranking
    for i, p in enumerate(predictions):
        p['position'] = i + 1
    
    # Debug output
    print(f"📊 Top 5 predictions:")
    for i, pred in enumerate(predictions[:5]):
        print(f"  P{pred['position']}. {pred['driver']['name']}: Win={pred['probability']}%, Podium={pred['podium_probability']}%, Points={pred['points_probability']}%")
    
    return {
        "circuit": circuit['name'],
        "type": circuit['type'],
        "difficulty": circuit['difficulty'],
        "predictions": predictions
    }
    
def simulate_race_realistic(drivers, teams, circuit):
    """Fallback simulation when XGBoost is unavailable"""
    results = []
    for driver in drivers:
        team = teams.get(driver['team'], {'car': 6.0, 'reliability': 8.0})
        
        # Calculate performance score
        base_score = driver['skill'] * 0.6 + team['car'] * 0.4
        
        # Circuit adjustments
        if circuit['type'] == 'street':
            circuit_factor = 1.0 + (driver['skill'] - 7.0) * 0.05
        elif circuit['type'] == 'power':
            circuit_factor = 1.0 + (team['car'] - 7.0) * 0.05
        else:
            circuit_factor = 1.0
            
        final_score = base_score * circuit_factor + np.random.normal(0, 0.5)
        
        results.append({
            'driver': driver,
            'team_data': team,
            'score': final_score
        })
    
    results.sort(key=lambda x: x['score'], reverse=True)
    
    predictions = []
    for i, res in enumerate(results):
        pos = i + 1
        d = res['driver']
        t = res['team_data']
        
        # Simplified probability math for fallback
        if pos == 1: win_prob = max(5, min(50, 25.0 + (d['skill'] + t['car'] - 12) * 5))
        elif pos <= 3: win_prob = max(1, min(20, 5.0 + (d['skill'] + t['car'] - 12) * 2))
        else: win_prob = 0.1
        
        predictions.append({
            "position": pos,
            "driver": {"name": d['name'], "team": d['team'], "id": d['name'][:3].upper()},
            "probability": win_prob, # Win probability
            "stats": {
                "skill": d['skill'],
                "car": t['car'],
                "podium_prob": win_prob * 2.5 # Rough estimate
            },
            "reasons": {"positive": ["Strong simulation score"], "negative": []}
        })
    return predictions
    headers = {"ngrok-skip-browser-warning": "true"}
    input_name = data.circuit_name
    
    # Circuit Database from the new script
    circuits_db = {
        'Bahrain': {'name': 'Bahrain', 'type': 'power', 'difficulty': 6},
        'Jeddah': {'name': 'Jeddah', 'type': 'street', 'difficulty': 8},
        'Melbourne': {'name': 'Australia', 'type': 'street', 'difficulty': 5},
        'Suzuka': {'name': 'Japan', 'type': 'technical', 'difficulty': 9},
        'Shanghai': {'name': 'China', 'type': 'balanced', 'difficulty': 7},
        'Miami': {'name': 'Miami', 'type': 'street', 'difficulty': 6},
        'Monaco': {'name': 'Monaco', 'type': 'street', 'difficulty': 10},
        'Silverstone': {'name': 'Great Britain', 'type': 'balanced', 'difficulty': 8},
        'Spa': {'name': 'Belgium', 'type': 'power', 'difficulty': 9},
        'Monza': {'name': 'Italy', 'type': 'power', 'difficulty': 4},
        'Singapore': {'name': 'Singapore', 'type': 'street', 'difficulty': 9},
        'Las Vegas': {'name': 'Las Vegas', 'type': 'street', 'difficulty': 6}
    }

    # Find best match for circuit
    circuit_key = None
    for key in circuits_db:
        if key.lower() in input_name.lower():
            circuit_key = key
            break
            
    if not circuit_key:
        # Default fallback
        circuit = {'name': input_name, 'type': 'balanced', 'difficulty': 5}
    else:
        circuit = circuits_db[circuit_key]

    # Ensure data is loaded
    if not PREDICTION_DRIVERS:
        load_prediction_data()

    # LOGIC SWITCH: XGBoost vs Realistic Simulation
    if MODELS_AVAILABLE:
        # 🟢 XGBOOST LOGIC
        print(f"🤖 Using XGBoost Logic for {circuit['name']}")
        driver_performances = []
        for driver in PREDICTION_DRIVERS:
            team = PREDICTION_TEAMS.get(driver['team'], {'car': 6.0})
            
            # Circuit specific calculation
            if circuit['type'] == 'street':
                perf = driver['skill'] * 0.7 + team['car'] * 0.3
            elif circuit['type'] == 'power':
                perf = driver['skill'] * 0.3 + team['car'] * 0.7
            else:
                perf = driver['skill'] * 0.5 + team['car'] * 0.5
            
            driver_performances.append((driver, team, perf))
        
        driver_performances.sort(key=lambda x: x[2], reverse=True)
        
        predictions = []
        for i, (driver, team, perf) in enumerate(driver_performances):
            pos = i + 1
            
            # Detailed Probability Math
            if pos == 1:
                win_prob = max(15, min(45, 25.0 + (perf - 10) * 5))
            elif pos <= 3:
                win_prob = max(3, min(20, 8.0 + (perf - 10) * 3))
            elif pos <= 10:
                win_prob = max(0.1, min(3, 0.5 + (perf - 10) * 0.3))
            else:
                win_prob = 0.05
                
            # Circuit difficulty adjustment
            diff_factor = circuit['difficulty'] / 10.0
            win_prob *= (1.0 - (diff_factor - 0.5) * 0.2)
            
            predictions.append({
                "position": pos,
                "driver": {
                    "name": driver['name'], 
                    "team": driver['team'], 
                    "id": driver['name'][:3].upper() # Fallback ID
                },
                "probability": round(win_prob, 1),
                "reasons": {
                    "positive": ["High circuit suitability" if perf > 10 else "Consistent pace"],
                    "negative": []
                }
            })
    else:
        # 🟡 REALISTIC SIMULATION FALLBACK
        print(f"🔄 Using Realistic Simulation for {circuit['name']}")
        predictions = simulate_race_realistic(PREDICTION_DRIVERS, PREDICTION_TEAMS, circuit)

    return JSONResponse({
        "circuit": circuit['name'],
        "type": circuit['type'],
        "predictions": predictions
    }, headers=headers)

# ==========================================
# 🟢 RESTORED RACE DATA ENDPOINTS
# ==========================================

@app.get("/races/{year}")
async def get_races(year: str):
    headers = {"ngrok-skip-browser-warning": "true"}
    print(f"🔍 Fetching races for {year}")
    try:
        if year == '2026':
            filename = "f1_2026_schedule.csv"
            if not os.path.exists(filename): return JSONResponse([], headers=headers)
            df = pd.read_csv(filename)
            races = []
            for _, row in df.iterrows():
                races.append({
                    "id": f"2026-round-{row.get('RoundNumber', 0)}",
                    "round": int(row.get('RoundNumber', 0)),
                    "name": row.get('EventName', 'Unknown GP'),
                    "circuit": f"{row.get('Location', '')}, {row.get('Country', '')}",
                    "date": row.get('EventDate', '2026-01-01'),
                    "flag": "🏳️",
                    "status": "upcoming"
                })
            return JSONResponse(races, headers=headers)
        elif year == '2025':
            return JSONResponse([{
                "id": "2025-summary", "round": 1, "name": "2025 Summary", 
                "circuit": "Season Standings", "date": "2025-12-31", 
                "flag": "🏆", "status": "finished"
            }], headers=headers)
        else:
            filename = f"f1_{year}_results.csv"
            if not os.path.exists(filename): return JSONResponse([], headers=headers)
            df = pd.read_csv(filename)
            races = []
            if 'RoundNumber' in df.columns and 'EventName' in df.columns:
                races_df = df[['RoundNumber', 'EventName']].drop_duplicates().sort_values('RoundNumber')
                for _, row in races_df.iterrows():
                    races.append({
                        "id": f"{year}-round-{row['RoundNumber']}",
                        "round": int(row['RoundNumber']),
                        "name": row['EventName'],
                        "circuit": "Circuit Data",
                        "date": f"{year}-01-01",
                        "flag": "🏁",
                        "status": "finished"
                    })
            return JSONResponse(races, headers=headers)
    except Exception as e:
        return JSONResponse({"error": str(e), "races": []}, status_code=500, headers=headers)

@app.get("/race_results")
async def get_race_results(year: str, round: str):
    headers = {"ngrok-skip-browser-warning": "true"}
    try:
        filename = f"f1_{year}_results.csv"
        if year == '2025': filename = "f1_2025_result.csv"
        
        if not os.path.exists(filename): return JSONResponse([], headers=headers)
        
        df = pd.read_csv(filename)
        results = []
        
        if year == '2025':
            for _, row in df.iterrows():
                results.append({
                    "position": int(row.get('#', 0)),
                    "driver": row.get('Full_Name', 'Unknown'),
                    "team": row.get('Team', 'Unknown'),
                    "points": 0,
                    "wins": int(row.get('Wins', 0)),
                    "status": "Active"
                })
        else:
            round_col = next((c for c in df.columns if 'round' in c.lower()), None)
            pos_col = next((c for c in df.columns if 'pos' in c.lower()), None)
            if round_col and pos_col:
                round_df = df[df[round_col].astype(str) == str(round)].sort_values(by=pos_col)
                for _, row in round_df.iterrows():
                    results.append({
                        "position": int(row[pos_col]) if pd.notna(row[pos_col]) else 0,
                        "driver": row.get('FullName', row.get('Driver', 'Unknown')),
                        "team": row.get('TeamName', row.get('Team', 'Unknown')),
                        "points": float(row.get('Points', 0)),
                        "status": row.get('Status', 'Finished')
                    })
        return JSONResponse(results, headers=headers)
    except Exception as e:
        return JSONResponse([], headers=headers)

# ==========================================
# 🟢 RESTORED CHAT & NEWS ENDPOINTS
# ==========================================

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    headers = {"ngrok-skip-browser-warning": "true"}
    user_msg = request.message.strip().lower()
    if "update news" in user_msg:
        update_f1_news_cache()
        return JSONResponse({"reply": "✅ News cache refreshed."}, headers=headers)
    reply = query_f1_news(user_msg)
    return JSONResponse({"reply": reply}, headers=headers)

def extract_keywords(self, query):
        """Extract meaningful keywords from a natural language query"""
        # 🟢 ADDED 'stats', 'statistics', 'history' to stopwords
        stopwords = {
            'what', 'whats', 'where', 'who', 'how', 'when', 'why', 'which',
            'is', 'are', 'was', 'were', 'do', 'does', 'did',
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'tell', 'me', 'about', 'news', 'latest', 'update', 'updates',
            'show', 'find', 'search', 'give', 'get',
            'stats', 'statistics', 'record', 'history', 'results' 
        }
        
        # Remove punctuation and split
        clean_query = re.sub(r'[^\w\s]', '', query.lower())
        words = clean_query.split()
        
        # Keep only meaningful words
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        
        return keywords

def respond_to_query(self, query):
        """Generate response to user query with SPECIFIC summaries"""
        try:
            # Load data
            data = self.load_data()
            if data is None or len(data) == 0:
                return "❌ Couldn't load news data. Check your CSV file."

            query_lower = query.lower()

            # Handle greetings
            if any(word in query_lower for word in ['hello', 'hi', 'hey', 'greetings']):
                return random.choice(GREETINGS)

            # Handle help
            if 'help' in query_lower:
                return self.get_help_response()

            # 🟢 FIX: Check for DRIVERS/TEAMS FIRST (Before checking 'stats')
            # This ensures "Lando Stats" is treated as a query about Lando, not a DB count.
            
            # Check for driver queries
            driver_results = self.handle_driver_query(query_lower)
            if driver_results:
                return driver_results

            # Check for team queries
            team_results = self.handle_team_query(query_lower)
            if team_results:
                return team_results

            # 🟢 MOVED STATS CHECK HERE (After checking for drivers)
            # Only show DB stats if no driver/team was mentioned
            if any(word in query_lower for word in ['stats', 'statistics', 'count']):
                return self.get_stats_response()

            # Handle refresh
            if any(word in query_lower for word in ['refresh', 'reload', 'update']):
                self.load_data(force_refresh=True)
                return "✅ Database reloaded! What would you like to know?"

            # Check for search
            if query_lower.startswith('search '):
                search_term = query_lower.replace('search ', '').strip()
                return self.handle_search_query(search_term)

            # Default: show latest news
            if any(word in query_lower for word in ['latest', 'news', 'update', 'headline', 'what\'s new']):
                return self.handle_latest_news()

            # Try general search with Smart Keywords
            # (Uses extract_keywords which now ignores 'stats')
            news_items = self.search_news(query, max_results=3)
            if news_items:
                return self.format_search_results(news_items, f"Results for '{query}'")

            # Fallback response
            return self.get_fallback_response()

        except Exception as e:
            print(f"Error: {e}")
            return "Sorry, I encountered an error. Try asking for 'latest news' or 'help'."

@app.get("/news/latest")
async def get_latest_news():
    headers = {"ngrok-skip-browser-warning": "true"}
    if not os.path.exists(NEWS_FILE):
        return JSONResponse([], headers=headers)
    try:
        df = pd.read_csv(NEWS_FILE).fillna("")
        return JSONResponse(df.head(5).to_dict(orient='records'), headers=headers)
    except:
        return JSONResponse([], headers=headers)

    
# ==========================================
# 🟢 RESTORED COMMUNITY RATINGS ENDPOINTS
# ==========================================

@app.get("/community/ratings")
async def get_community_ratings():
    headers = {"ngrok-skip-browser-warning": "true"}
    if not os.path.exists(RATINGS_FILE):
        return JSONResponse([], headers=headers)
    try:
        with open(RATINGS_FILE, "r") as f:
            data = json.load(f)
        summary = []
        for driver, stats in data.items():
            avg = stats["total_score"] / stats["count"] if stats["count"] > 0 else 0
            summary.append({
                "driver_name": driver, "avg_rating": round(avg, 1), 
                "total_votes": stats["count"], "latest_comments": stats.get("comments", [])[-3:]
            })
        return JSONResponse(sorted(summary, key=lambda x: x["avg_rating"], reverse=True), headers=headers)
    except:
        return JSONResponse([], headers=headers)

@app.post("/community/rate")
async def submit_rating(sub: RatingSubmission):
    headers = {"ngrok-skip-browser-warning": "true"}
    data = {}
    if os.path.exists(RATINGS_FILE):
        try:
            with open(RATINGS_FILE, "r") as f: data = json.load(f)
        except: pass
    
    if sub.driver_name not in data:
        data[sub.driver_name] = {"total_score": 0, "count": 0, "comments": []}
    
    data[sub.driver_name]["total_score"] += sub.rating
    data[sub.driver_name]["count"] += 1
    data[sub.driver_name]["comments"].append({
        "user": sub.username, "rating": sub.rating, "text": sub.comment, 
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    with open(RATINGS_FILE, "w") as f:
        json.dump(data, f, indent=4)
        
    return JSONResponse({"message": "Rating saved"}, headers=headers)

# ==========================================
# 🟢 FACE IDENTIFICATION
# ==========================================

@app.post("/identify-driver")
async def identify_driver(request: Request, file: UploadFile = File(...)):
    headers = {"ngrok-skip-browser-warning": "true"}
    if not FACE_REC_AVAILABLE:
        return JSONResponse({"success": False, "message": "Module missing"}, headers=headers)
    
    if not known_face_encodings: load_known_faces()
    
    try:
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as buffer: buffer.write(await file.read())
        
        image = face_recognition.load_image_file(temp_filename)
        encodings = face_recognition.face_encodings(image)
        if os.path.exists(temp_filename): os.remove(temp_filename)
        
        if not encodings:
            return JSONResponse({"success": False, "message": "No face detected"}, headers=headers)
            
        distances = face_recognition.face_distance(known_face_encodings, encodings[0])
        best_idx = np.argmin(distances)
        
        if distances[best_idx] < 0.6:
            mid = known_face_ids[best_idx]
            base_url = str(request.base_url).rstrip("/")
            return JSONResponse({
                "success": True, 
                "driver_id": mid,
                "confidence": f"{(1-distances[best_idx])*100:.1f}%",
                "image_url": f"{base_url}/driver-faces/{mid}.png"
            }, headers=headers)
        return JSONResponse({"success": False, "message": "Unknown driver"}, headers=headers)
    except Exception as e:
        return JSONResponse({"success": False, "message": str(e)}, headers=headers)

# ==========================================
# 🟢 STARTUP
# ==========================================
@app.on_event("startup")
async def startup_event():
    print("🚀 INITIALIZING APP...")
    load_driver_csv()
    load_prediction_data() # Loads ratings for new logic
    load_xgboost_models()  # Loads models for new logic
    if FACE_REC_AVAILABLE:
        load_known_faces()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
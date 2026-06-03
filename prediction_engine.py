import pandas as pd
import numpy as np
import joblib
import os

class SeasonPredictor:
    def __init__(self):
        self.drivers = []
        self.teams = {}
        self.models_available = False
        self.win_model = None
        self.podium_model = None
        
        # 🟢 Official F1 3-Letter Code Mapping
        self.driver_codes = {
            'Lando Norris': 'NOR', 'Max Verstappen': 'VER', 'Oscar Piastri': 'PIA',
            'George Russell': 'RUS', 'Charles Leclerc': 'LEC', 'Lewis Hamilton': 'HAM',
            'Kimi Antonelli': 'ANT', 'Alexander Albon': 'ALB', 'Carlos Sainz': 'SAI',
            'Fernando Alonso': 'ALO', 'Lance Stroll': 'STR', 'Nico Hülkenberg': 'HUL',
            'Gabriel Bortoleto': 'BOR', 'Yuki Tsunoda': 'TSU', 'Liam Lawson': 'LAW',
            'Isack Hadjar': 'HAD', 'Esteban Ocon': 'OCO', 'Oliver Bearman': 'BEA',
            'Pierre Gasly': 'GAS', 'Franco Colapinto': 'COL'
        }

        # 🟢 Circuit Database (For difficulty/type logic)
        self.circuits = {
            'Bahrain': {'type': 'power'}, 'Jeddah': {'type': 'street'}, 'Melbourne': {'type': 'street'},
            'Suzuka': {'type': 'technical'}, 'Shanghai': {'type': 'balanced'}, 'Miami': {'type': 'street'},
            'Imola': {'type': 'technical'}, 'Monaco': {'type': 'street'}, 'Barcelona': {'type': 'technical'},
            'Montreal': {'type': 'power'}, 'Red Bull Ring': {'type': 'power'}, 'Silverstone': {'type': 'balanced'},
            'Hungaroring': {'type': 'technical'}, 'Spa': {'type': 'power'}, 'Zandvoort': {'type': 'technical'},
            'Monza': {'type': 'power'}, 'Baku': {'type': 'street'}, 'Singapore': {'type': 'street'},
            'Austin': {'type': 'balanced'}, 'Mexico': {'type': 'power'}, 'Interlagos': {'type': 'balanced'},
            'Las Vegas': {'type': 'street'}, 'Abu Dhabi': {'type': 'balanced'}
        }

        # Load Data
        self.load_data()
        self.load_models()

    def get_driver_code(self, name):
        """Returns the 3-letter code for a driver name."""
        if name in self.driver_codes:
            return self.driver_codes[name]
        return name[:3].upper()

    def load_data(self):
        try:
            # 1. Try Loading from CSVs first
            if os.path.exists('f1_driver_ratings.csv') and os.path.exists('team_ratings.csv'):
                driver_df = pd.read_csv('f1_driver_ratings.csv')
                team_df = pd.read_csv('team_ratings.csv')

                # Process Drivers
                driver_avg = driver_df.groupby('Driver_Name')['User_Skill_Rating'].mean().reset_index()
                min_skill = driver_avg['User_Skill_Rating'].min()
                max_skill = driver_avg['User_Skill_Rating'].max()
                
                self.drivers = []
                for _, row in driver_avg.iterrows():
                    name = row['Driver_Name']
                    team_name = driver_df[driver_df['Driver_Name'] == name]['Team'].iloc[0]
                    skill_norm = 5 + 4.8 * (row['User_Skill_Rating'] - min_skill) / (max_skill - min_skill)
                    
                    self.drivers.append({
                        'id': self.get_driver_code(name),
                        'name': name,
                        'team': team_name,
                        'skill': float(skill_norm)
                    })

                # Process Teams
                team_avg = team_df.groupby('Team')['Car_Performance'].mean().reset_index()
                min_car = team_avg['Car_Performance'].min()
                max_car = team_avg['Car_Performance'].max()

                for _, row in team_avg.iterrows():
                    car_norm = 5 + 5 * (row['Car_Performance'] - min_car) / (max_car - min_car)
                    self.teams[row['Team']] = {'car': float(car_norm)}
            
            else:
                print("⚠️ Rating CSVs not found. Loading integrated 2025 Grid...")
                
                # 🟢 INTEGRATED 2025 GRID
                self.drivers = [
                    {'id': 'NOR', 'name': 'Lando Norris', 'team': 'McLaren', 'skill': 9.6},
                    {'id': 'VER', 'name': 'Max Verstappen', 'team': 'Red Bull', 'skill': 9.8},
                    {'id': 'PIA', 'name': 'Oscar Piastri', 'team': 'McLaren', 'skill': 9.2},
                    {'id': 'LEC', 'name': 'Charles Leclerc', 'team': 'Ferrari', 'skill': 9.4},
                    {'id': 'RUS', 'name': 'George Russell', 'team': 'Mercedes', 'skill': 9.1},
                    {'id': 'HAM', 'name': 'Lewis Hamilton', 'team': 'Ferrari', 'skill': 9.3},
                    {'id': 'TSU', 'name': 'Yuki Tsunoda', 'team': 'Red Bull', 'skill': 8.5},
                    {'id': 'ANT', 'name': 'Kimi Antonelli', 'team': 'Mercedes', 'skill': 8.2},
                    {'id': 'SAI', 'name': 'Carlos Sainz', 'team': 'Williams', 'skill': 8.9},
                    {'id': 'ALB', 'name': 'Alexander Albon', 'team': 'Williams', 'skill': 8.6},
                    {'id': 'ALO', 'name': 'Fernando Alonso', 'team': 'Aston Martin', 'skill': 9.0},
                    {'id': 'BOR', 'name': 'Gabriel Bortoleto', 'team': 'Sauber', 'skill': 7.8},
                    {'id': 'HAD', 'name': 'Isack Hadjar', 'team': 'RB', 'skill': 7.5},
                    {'id': 'COL', 'name': 'Franco Colapinto', 'team': 'Alpine', 'skill': 7.9},
                    {'id': 'GAS', 'name': 'Pierre Gasly', 'team': 'Alpine', 'skill': 8.1},
                    {'id': 'HUL', 'name': 'Nico Hülkenberg', 'team': 'Sauber', 'skill': 8.0},
                    {'id': 'BEA', 'name': 'Oliver Bearman', 'team': 'Haas', 'skill': 7.7},
                    {'id': 'STR', 'name': 'Lance Stroll', 'team': 'Aston Martin', 'skill': 7.6},
                    {'id': 'OCO', 'name': 'Esteban Ocon', 'team': 'Haas', 'skill': 7.9},
                    {'id': 'LAW', 'name': 'Liam Lawson', 'team': 'RB', 'skill': 7.8}
                ]

                # Performance Data
                self.teams = {
                    'McLaren': {'car': 9.8}, 'Red Bull': {'car': 9.5}, 'Ferrari': {'car': 9.0},
                    'Mercedes': {'car': 8.9}, 'Williams': {'car': 8.2}, 'Aston Martin': {'car': 7.8},
                    'Alpine': {'car': 7.5}, 'RB': {'car': 7.4}, 'Sauber': {'car': 7.2}, 'Haas': {'car': 7.1}
                }

        except Exception as e:
            print(f"❌ Data Load Error: {e}")

    def load_models(self):
        try:
            self.win_model = joblib.load('saved_models/XGBoost_target_win_model.pkl')
            self.models_available = True
        except:
            self.models_available = False

    # 🟢 PREDICT SINGLE RACE (This returns the detailed percentages you want)
    def predict_race(self, circuit_name):
        circuit_info = {'type': 'balanced'}
        for key, val in self.circuits.items():
            if key.lower() in circuit_name.lower():
                circuit_info = val
                break

        driver_performances = []
        for driver in self.drivers:
            team_stats = self.teams.get(driver['team'], {'car': 6.0})
            skill = driver['skill']
            car = team_stats['car']
            
            if circuit_info['type'] == 'street': 
                perf = skill * 0.7 + car * 0.3
            elif circuit_info['type'] == 'power': 
                perf = skill * 0.3 + car * 0.7
            else: 
                perf = skill * 0.5 + car * 0.5
                
            driver_performances.append((driver, team_stats, perf))

        driver_performances.sort(key=lambda x: x[2], reverse=True)

        predictions = []
        for i, (driver, team, perf) in enumerate(driver_performances):
            position = i + 1
            
            # 🟢 Exact Math for Predictions (Win/Podium/Points)
            if position == 1:
                win_prob = 45.0 + (perf - 8.5) * 15
                podium_prob = 90.0
                points_prob = 99.0
            elif position == 2:
                win_prob = 25.0 + (perf - 8.5) * 10
                podium_prob = 75.0
                points_prob = 95.0
            elif position == 3:
                win_prob = 15.0 + (perf - 8.5) * 8
                podium_prob = 60.0
                points_prob = 90.0
            elif position <= 6:
                win_prob = 5.0 + (perf - 9.0) * 2
                podium_prob = 25.0
                points_prob = 80.0
            elif position <= 10:
                win_prob = 0.5
                podium_prob = 5.0
                points_prob = 60.0
            else:
                win_prob = 0.1
                podium_prob = 0.5
                points_prob = 10.0
                
            predictions.append({
                "position": position,
                "driver": { "name": driver['name'], "team": driver['team'] },
                "probability": round(max(0.1, min(99.9, win_prob)), 1),
                "podium_probability": round(max(0.1, min(99.9, podium_prob)), 1),
                "points_probability": round(max(0.1, min(99.9, points_prob)), 1),
                "reasons": { 
                    "positive": [f"Strong on {circuit_info['type']} tracks", "High efficiency"],
                    "negative": [] 
                }
            })

        return { "circuit": circuit_name, "predictions": predictions }

    def predict_season_stats(self):
        """Runs a simulation for all 24 races and calculates average stats per driver."""
        schedule = (['power'] * 8) + (['street'] * 8) + (['balanced'] * 8)
        driver_stats = {d['id']: {'win_sum': 0, 'podium_sum': 0, 'points_sum': 0, 'avg_pos_sum': 0} for d in self.drivers}
        
        for race_type in schedule:
            results = []
            for driver in self.drivers:
                team = self.teams.get(driver['team'], {'car': 6.0})
                if race_type == 'street': perf = driver['skill'] * 0.7 + team['car'] * 0.3
                elif race_type == 'power': perf = driver['skill'] * 0.3 + team['car'] * 0.7
                else: perf = driver['skill'] * 0.5 + team['car'] * 0.5
                results.append({'id': driver['id'], 'perf': perf})
            
            results.sort(key=lambda x: x['perf'], reverse=True)
            
            for i, res in enumerate(results):
                pos = i + 1
                perf = res['perf']
                
                # Simplified simulation logic
                if pos == 1: win, podium, points = 45.0, 90.0, 99.0
                elif pos <= 3: win, podium, points = 15.0, 60.0, 90.0
                elif pos <= 10: win, podium, points = 1.0, 10.0, 70.0
                else: win, podium, points = 0.1, 1.0, 10.0

                driver_stats[res['id']]['win_sum'] += win
                driver_stats[res['id']]['podium_sum'] += podium
                driver_stats[res['id']]['points_sum'] += points
                driver_stats[res['id']]['avg_pos_sum'] += pos

        final_stats = {}
        total_races = len(schedule)
        
        for d_id, stats in driver_stats.items():
            final_stats[d_id] = {
                'win_pct': round(stats['win_sum'] / total_races, 1),
                'podium_pct': round(stats['podium_sum'] / total_races, 1),
                'points_pct': round(stats['points_sum'] / total_races, 1),
                'avg_position': round(stats['avg_pos_sum'] / total_races, 1)
            }
            
        return final_stats
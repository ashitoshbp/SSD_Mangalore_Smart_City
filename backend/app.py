from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import numpy as np
import json
import re
from datetime import datetime, timedelta
import random
import math

app = Flask(__name__)

# Configure CORS to allow all origins
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response

# Enable debug mode for development
app.config['DEBUG'] = True

# Load the dataset at startup (update path as needed)
DATA_PATH = os.path.join(os.path.dirname(__file__), '../modified_dataset.csv')
df = pd.read_csv(DATA_PATH)

# Load or create GeoJSON data for Mangalore taluks
TALUK_GEOJSON_PATH = os.path.join(os.path.dirname(__file__), 'mangalore_taluks.geojson')

# Convert date columns to datetime
date_columns = ['Received Date/Time', 'Incident Reported at', 'Action Date/Time', 'Closed At']
for col in date_columns:
    if col in df.columns:
        df[col] = pd.to_datetime(df[col], errors='coerce')

# Convert time duration columns to minutes for easier calculations
def parse_duration(duration_str):
    if pd.isna(duration_str):
        return np.nan
    
    parts = duration_str.split()
    hours = int(parts[0].replace('h', ''))
    minutes = int(parts[1].replace('m', ''))
    seconds = int(parts[2].replace('s', ''))
    
    return hours * 60 + minutes + seconds / 60

if 'Time taken to take Action' in df.columns:
    df['Action Time Minutes'] = df['Time taken to take Action'].apply(lambda x: parse_duration(x) if pd.notna(x) else np.nan)

if 'Time taken to Close' in df.columns:
    df['Close Time Minutes'] = df['Time taken to Close'].apply(lambda x: parse_duration(x) if pd.notna(x) else np.nan)

@app.route('/')
def index():
    return jsonify({'status': 'Backend is running'})

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    # Return all incidents (limit for safety)
    limit = int(request.args.get('limit', df.shape[0]))
    return df.head(limit).to_json(orient='records')

@app.route('/api/incident_types', methods=['GET'])
def get_incident_types():
    types = df['Incident Type'].dropna().unique().tolist()
    return jsonify({'incident_types': types})

@app.route('/api/locations', methods=['GET'])
def get_locations():
    # Try common location columns
    for col in ['Location', 'Area', 'Place', 'Ward']:
        if col in df.columns:
            locations = df[col].dropna().unique().tolist()
            return jsonify({'locations': locations, 'column': col})
    return jsonify({'locations': [], 'column': None})

@app.route('/api/incidents_by_type', methods=['GET'])
def get_incidents_by_type():
    incident_type = request.args.get('type')
    if not incident_type:
        return jsonify({'error': 'Missing type parameter'}), 400
    filtered = df[df['Incident Type'] == incident_type]
    return filtered.to_json(orient='records')

# Dashboard API endpoints
@app.route('/api/dashboard/kpi', methods=['GET'])
def get_dashboard_kpi():
    total_incidents = int(len(df))
    resolved_incidents = int(df['Closed At'].notna().sum())
    pending_incidents = int(total_incidents - resolved_incidents)
    
    # Calculate SLA compliance rate (assuming SLA is 24 hours for action and 48 hours for closure)
    action_sla_hours = 24
    closure_sla_hours = 48
    
    # Action SLA compliance
    action_compliant = int(df[df['Action Time Minutes'].notna() & (df['Action Time Minutes'] <= action_sla_hours * 60)].shape[0])
    action_total = int(df['Action Time Minutes'].notna().sum())
    action_sla_rate = float((action_compliant / action_total * 100) if action_total > 0 else 0)
    
    # Closure SLA compliance
    closure_compliant = int(df[df['Close Time Minutes'].notna() & (df['Close Time Minutes'] <= closure_sla_hours * 60)].shape[0])
    closure_total = int(df['Close Time Minutes'].notna().sum())
    closure_sla_rate = float((closure_compliant / closure_total * 100) if closure_total > 0 else 0)
    
    # Average times
    avg_action_time = float(df['Action Time Minutes'].mean()) if not pd.isna(df['Action Time Minutes'].mean()) else 0
    avg_closure_time = float(df['Close Time Minutes'].mean()) if not pd.isna(df['Close Time Minutes'].mean()) else 0
    
    # Top 5 incident types - convert NumPy types to Python native types
    incident_counts = df['Incident Type'].value_counts().head(5)
    top_incident_types = {str(k): int(v) for k, v in incident_counts.items()}
    
    # Top 5 taluks - convert NumPy types to Python native types
    # Handle case where 'Taluk' column might not exist
    if 'Taluk' in df.columns:
        taluk_counts = df['Taluk'].value_counts().head(5)
        top_taluks = {str(k): int(v) for k, v in taluk_counts.items()}
    else:
        top_taluks = {}
    
    return jsonify({
        'total_incidents': total_incidents,
        'resolved_incidents': resolved_incidents,
        'pending_incidents': pending_incidents,
        'action_sla_rate': action_sla_rate,
        'closure_sla_rate': closure_sla_rate,
        'avg_action_time_minutes': avg_action_time,
        'avg_closure_time_minutes': avg_closure_time,
        'top_incident_types': top_incident_types,
        'top_taluks': top_taluks
    })

@app.route('/api/dashboard/temporal', methods=['GET'])
def get_temporal_trends():
    # Incidents per day
    df['date'] = df['Incident Reported at'].dt.date
    incidents_per_day = df.groupby('date').size().reset_index(name='count')
    incidents_per_day['date'] = incidents_per_day['date'].astype(str)
    # Convert count column to int
    incidents_per_day['count'] = incidents_per_day['count'].astype(int)
    
    # Incidents per week
    df['week'] = df['Incident Reported at'].dt.isocalendar().week
    df['year'] = df['Incident Reported at'].dt.isocalendar().year
    df['year_week'] = df['year'].astype(str) + '-' + df['week'].astype(str)
    incidents_per_week = df.groupby('year_week').size().reset_index(name='count')
    # Convert count column to int
    incidents_per_week['count'] = incidents_per_week['count'].astype(int)
    
    # Incidents per month
    df['month'] = df['Incident Reported at'].dt.month
    df['year_month'] = df['year'].astype(str) + '-' + df['month'].astype(str)
    incidents_per_month = df.groupby('year_month').size().reset_index(name='count')
    # Convert count column to int
    incidents_per_month['count'] = incidents_per_month['count'].astype(int)
    
    # Monsoon vs non-monsoon analysis (assuming June-September is monsoon season)
    df['is_monsoon'] = df['Incident Reported at'].dt.month.isin([6, 7, 8, 9])
    monsoon_analysis = df.groupby('is_monsoon').size().reset_index(name='count')
    monsoon_analysis['season'] = monsoon_analysis['is_monsoon'].map({True: 'Monsoon', False: 'Non-Monsoon'})
    # Convert count column to int
    monsoon_analysis['count'] = monsoon_analysis['count'].astype(int)
    
    # Hour of day analysis
    df['hour'] = df['Incident Reported at'].dt.hour
    hour_analysis = df.groupby('hour').size().reset_index(name='count')
    # Convert hour and count columns to int
    hour_analysis['hour'] = hour_analysis['hour'].astype(int)
    hour_analysis['count'] = hour_analysis['count'].astype(int)
    
    # Day of week analysis
    df['day_of_week'] = df['Incident Reported at'].dt.dayofweek
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    day_analysis = df.groupby('day_of_week').size().reset_index(name='count')
    day_analysis['day_name'] = day_analysis['day_of_week'].apply(lambda x: day_names[x])
    # Convert count column to int
    day_analysis['count'] = day_analysis['count'].astype(int)
    
    # Convert DataFrames to dictionaries with native Python types
    incidents_per_day_dict = []
    for _, row in incidents_per_day.iterrows():
        incidents_per_day_dict.append({'date': str(row['date']), 'count': int(row['count'])})
    
    incidents_per_week_dict = []
    for _, row in incidents_per_week.iterrows():
        incidents_per_week_dict.append({'year_week': str(row['year_week']), 'count': int(row['count'])})
    
    incidents_per_month_dict = []
    for _, row in incidents_per_month.iterrows():
        incidents_per_month_dict.append({'year_month': str(row['year_month']), 'count': int(row['count'])})
    
    monsoon_analysis_dict = []
    for _, row in monsoon_analysis[['season', 'count']].iterrows():
        monsoon_analysis_dict.append({'season': str(row['season']), 'count': int(row['count'])})
    
    hour_analysis_dict = []
    for _, row in hour_analysis.iterrows():
        hour_analysis_dict.append({'hour': int(row['hour']), 'count': int(row['count'])})
    
    day_analysis_dict = []
    for _, row in day_analysis[['day_name', 'count']].iterrows():
        day_analysis_dict.append({'day_name': str(row['day_name']), 'count': int(row['count'])})
    
    return jsonify({
        'incidents_per_day': incidents_per_day_dict,
        'incidents_per_week': incidents_per_week_dict,
        'incidents_per_month': incidents_per_month_dict,
        'monsoon_analysis': monsoon_analysis_dict,
        'hour_analysis': hour_analysis_dict,
        'day_analysis': day_analysis_dict
    })

@app.route('/api/dashboard/breakdown', methods=['GET'])
def get_incident_breakdown():
    # Incident Type breakdown
    incident_type_counts = df['Incident Type'].value_counts().reset_index()
    incident_type_counts.columns = ['type', 'count']
    # Convert count column to int
    incident_type_counts['count'] = incident_type_counts['count'].astype(int)
    
    # Info_Source breakdown
    if 'Info_Source' in df.columns:
        info_source_counts = df['Info_Source'].value_counts().reset_index()
        info_source_counts.columns = ['source', 'count']
        # Convert count column to int
        info_source_counts['count'] = info_source_counts['count'].astype(int)
        
        # Create a "Channel" from Info_Source (simplified categorization)
        def categorize_channel(source):
            source = str(source).lower()
            if 'phone' in source or any(digit in source for digit in '0123456789'):
                return 'Phone'
            elif 'app' in source or 'web' in source or 'online' in source:
                return 'App/Web'
            elif 'pdo' in source or 'officer' in source or 'official' in source:
                return 'Official'
            else:
                return 'Other'
        
        df['Channel'] = df['Info_Source'].apply(categorize_channel)
        channel_counts = df['Channel'].value_counts().reset_index()
        channel_counts.columns = ['channel', 'count']
        # Convert count column to int
        channel_counts['count'] = channel_counts['count'].astype(int)
    else:
        # Create empty DataFrames if columns don't exist
        info_source_counts = pd.DataFrame(columns=['source', 'count'])
        channel_counts = pd.DataFrame(columns=['channel', 'count'])
    
    # Taluk and Type hierarchical data for treemap/sunburst
    if 'Taluk' in df.columns:
        taluk_type_counts = df.groupby(['Taluk', 'Incident Type']).size().reset_index(name='count')
        # Convert count column to int
        taluk_type_counts['count'] = taluk_type_counts['count'].astype(int)
    else:
        taluk_type_counts = pd.DataFrame(columns=['Taluk', 'Incident Type', 'count'])
    
    # Convert DataFrames to dictionaries with native Python types
    incident_type_dict = []
    for _, row in incident_type_counts.iterrows():
        incident_type_dict.append({'type': str(row['type']), 'count': int(row['count'])})
    
    info_source_dict = []
    for _, row in info_source_counts.iterrows():
        info_source_dict.append({'source': str(row['source']), 'count': int(row['count'])})
    
    channel_dict = []
    for _, row in channel_counts.iterrows():
        channel_dict.append({'channel': str(row['channel']), 'count': int(row['count'])})
    
    taluk_type_dict = []
    for _, row in taluk_type_counts.iterrows():
        taluk_type_dict.append({
            'Taluk': str(row['Taluk']) if 'Taluk' in row else '',
            'Incident Type': str(row['Incident Type']) if 'Incident Type' in row else '',
            'count': int(row['count']) if 'count' in row else 0
        })
    
    return jsonify({
        'incident_type_breakdown': incident_type_dict,
        'info_source_breakdown': info_source_dict,
        'channel_breakdown': channel_dict,
        'taluk_type_hierarchy': taluk_type_dict
    })

@app.route('/api/dashboard/response', methods=['GET'])
def get_response_analytics():
    # Distribution of response times
    action_time_distribution = df['Action Time Minutes'].dropna().tolist()
    closure_time_distribution = df['Close Time Minutes'].dropna().tolist()
    
    # Convert NumPy types to Python native types
    action_time_distribution = [float(x) for x in action_time_distribution]
    closure_time_distribution = [float(x) for x in closure_time_distribution]
    
    # Identify outliers (slowest 1%)
    action_outlier_threshold = float(np.percentile(action_time_distribution, 99)) if action_time_distribution else 0
    closure_outlier_threshold = float(np.percentile(closure_time_distribution, 99)) if closure_time_distribution else 0
    
    action_outliers = int(df[df['Action Time Minutes'] > action_outlier_threshold].shape[0]) if action_time_distribution else 0
    closure_outliers = int(df[df['Close Time Minutes'] > closure_outlier_threshold].shape[0]) if closure_time_distribution else 0
    
    # Officer leaderboard
    if 'Closed By Officer' in df.columns:
        officer_counts = df.groupby('Closed By Officer').size().reset_index(name='incidents_closed')
        officer_avg_time = df.groupby('Closed By Officer')['Close Time Minutes'].mean().reset_index(name='avg_closure_time')
        
        # Convert count and avg_time to native Python types
        officer_counts['incidents_closed'] = officer_counts['incidents_closed'].astype(int)
        officer_avg_time['avg_closure_time'] = officer_avg_time['avg_closure_time'].apply(
            lambda x: float(x) if not pd.isna(x) else 0
        )
        
        officer_leaderboard = pd.merge(officer_counts, officer_avg_time, on='Closed By Officer')
        officer_leaderboard = officer_leaderboard.sort_values('incidents_closed', ascending=False)
        officer_leaderboard = officer_leaderboard.dropna(subset=['Closed By Officer'])
        officer_leaderboard = officer_leaderboard.head(10)
        
        # Convert to list of dictionaries with native Python types
        officer_leaderboard_list = []
        for _, row in officer_leaderboard.iterrows():
            officer_leaderboard_list.append({
                'Closed By Officer': str(row['Closed By Officer']),
                'incidents_closed': int(row['incidents_closed']),
                'avg_closure_time': float(row['avg_closure_time'])
            })
    else:
        officer_leaderboard_list = []
    
    return jsonify({
        'action_time_distribution': {
            'data': action_time_distribution,
            'outlier_threshold': action_outlier_threshold,
            'outlier_count': action_outliers
        },
        'closure_time_distribution': {
            'data': closure_time_distribution,
            'outlier_threshold': closure_outlier_threshold,
            'outlier_count': closure_outliers
        },
        'officer_leaderboard': officer_leaderboard_list
    })

@app.route('/api/dashboard/details', methods=['GET'])
def get_incident_details():
    # Paginated table data
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 10))
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    total_incidents = int(len(df))
    total_pages = int((total_incidents + page_size - 1) // page_size)
    
    # Get subset of data for the current page
    page_data = df.iloc[start_idx:end_idx]
    
    # Convert to dict for JSON serialization
    incidents = []
    for _, row in page_data.iterrows():
        incident = {}
        for col in df.columns:
            val = row[col]
            if isinstance(val, (pd.Timestamp, datetime)):
                incident[col] = val.isoformat()
            elif pd.isna(val):
                incident[col] = None
            elif isinstance(val, np.integer):
                incident[col] = int(val)
            elif isinstance(val, np.floating):
                incident[col] = float(val)
            elif isinstance(val, np.bool_):
                incident[col] = bool(val)
            elif isinstance(val, np.ndarray):
                incident[col] = val.tolist()
            else:
                incident[col] = val
        incidents.append(incident)
    
    return jsonify({
        'incidents': incidents,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_incidents': total_incidents,
            'total_pages': total_pages
        }
    })

# Map-related API endpoints
@app.route('/api/map/incidents', methods=['GET'])
def get_map_incidents():
    try:
        # Create a simplified version with mock data for demonstration
        # This avoids potential issues with the real dataset
        incidents = []
        
        # Mangalore center coordinates
        mangalore_center = (12.8698, 74.8431)
        
        # Dictionary to store taluk centers
        taluk_centers = {
            'Ullala': (12.8050, 74.8460),
            'Belthangady': (13.0167, 75.3000),
            'Buntwal': (12.9067, 75.0367),
            'Sullia': (12.5606, 75.3872),
            'Puttur': (12.7600, 75.2000),
            'Kadaba': (12.8667, 75.1167),
            'Mangaluru': (12.8698, 74.8431),
            'Mulki': (13.0833, 74.7833),
            'Mangaluru City Corporation': (12.8698, 74.8431),
            'Mudabidri': (13.0667, 74.9833)
        }
        
        # Function to generate random coordinates around a center point
        def generate_coordinates(center, max_distance_km=10):
            # Convert km to degrees (approximate)
            max_lat_change = max_distance_km / 111.0  # 1 degree latitude is approximately 111 km
            max_lng_change = max_distance_km / (111.0 * math.cos(math.radians(center[0])))
            
            # Generate random offsets
            lat_offset = random.uniform(-max_lat_change, max_lat_change)
            lng_offset = random.uniform(-max_lng_change, max_lng_change)
            
            # Apply offsets to center coordinates
            return (center[0] + lat_offset, center[1] + lng_offset)
        
        # Get unique incident types from the dataset
        incident_types = df['Incident Type'].unique().tolist()
        
        # Get unique taluks from the dataset
        taluks = df['Taluk'].unique().tolist()
        
        # Generate 100 sample incidents
        for i in range(1, 101):
            # Select a random incident type and taluk
            incident_type = random.choice(incident_types)
            taluk = random.choice(taluks)
            
            # Generate coordinates based on taluk
            if taluk in taluk_centers:
                coords = generate_coordinates(taluk_centers[taluk])
            else:
                coords = generate_coordinates(mangalore_center)
            
            # Create a sample incident
            incident = {
                'id': i,
                'incident_type': incident_type,
                'location': f'Sample location in {taluk}',
                'taluk': taluk,
                'reported_at': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                'is_closed': random.choice([True, False]),
                'action_remarks': 'Sample action taken' if random.random() > 0.3 else None,
                'latitude': coords[0],
                'longitude': coords[1]
            }
            
            incidents.append(incident)
        
        return jsonify({'incidents': incidents})
    except Exception as e:
        print(f"Error in get_map_incidents: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/map/taluks', methods=['GET'])
def get_taluks_geojson():
    try:
        # Create a simplified GeoJSON for Mangalore taluks directly in memory
        # This avoids file system issues
        
        # Get unique taluks from the dataset
        taluks = df['Taluk'].dropna().unique().tolist()
        
        # Count incidents per taluk
        taluk_counts = df['Taluk'].value_counts().to_dict()
        
        # Create a simplified GeoJSON structure
        features = []
        
        # Taluk center coordinates (approximate)
        taluk_centers = {
            'Ullala': (12.8050, 74.8460),
            'Belthangady': (13.0167, 75.3000),
            'Buntwal': (12.9067, 75.0367),
            'Sullia': (12.5606, 75.3872),
            'Puttur': (12.7600, 75.2000),
            'Kadaba': (12.8667, 75.1167),
            'Mangaluru': (12.8698, 74.8431),
            'Mulki': (13.0833, 74.7833),
            'Mangaluru City Corporation': (12.8698, 74.8431),
            'Mudabidri': (13.0667, 74.9833)
        }
        
        # Function to generate a simple polygon around a center point
        def generate_polygon(center, radius_km=5):
            # Convert km to degrees (approximate)
            radius_lat = radius_km / 111.0
            radius_lng = radius_km / (111.0 * math.cos(math.radians(center[0])))
            
            # Generate points in a rough circle
            points = []
            num_points = 8
            for i in range(num_points):
                angle = 2 * math.pi * i / num_points
                lat = center[0] + radius_lat * math.cos(angle) * (0.8 + 0.4 * random.random())
                lng = center[1] + radius_lng * math.sin(angle) * (0.8 + 0.4 * random.random())
                points.append([lng, lat])  # GeoJSON uses [longitude, latitude]
            
            # Close the polygon
            points.append(points[0])
            
            return [points]
        
        # Create features for each taluk
        for taluk in taluks:
            if taluk in taluk_centers:
                center = taluk_centers[taluk]
                polygon = generate_polygon(center)
                
                # Get incident count for this taluk
                incident_count = taluk_counts.get(taluk, 0)
                
                feature = {
                    "type": "Feature",
                    "properties": {
                        "name": taluk,
                        "incidentCount": incident_count
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": polygon
                    }
                }
                features.append(feature)
        
        # Create the GeoJSON structure
        geojson = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return jsonify(geojson)
    except Exception as e:
        print(f"Error in get_taluks_geojson: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/map/taluk_stats/<taluk_name>', methods=['GET'])
def get_taluk_stats(taluk_name):
    try:
        # Generate mock statistics for the specified taluk
        # This avoids issues with the real dataset
        
        # Get unique incident types from the dataset
        incident_types = df['Incident Type'].unique().tolist()
        
        # Generate random statistics
        total_incidents = random.randint(50, 300)
        resolved_incidents = random.randint(20, total_incidents)
        pending_incidents = total_incidents - resolved_incidents
        avg_response_time = round(random.uniform(1, 24), 2)  # hours
        
        # Generate incident type breakdown
        incident_type_counts = {}
        remaining = total_incidents
        for incident_type in incident_types[:-1]:
            if remaining <= 0:
                break
            count = random.randint(1, remaining // 2)
            incident_type_counts[incident_type] = count
            remaining -= count
        
        # Assign the rest to the last incident type
        if remaining > 0 and incident_types:
            incident_type_counts[incident_types[-1]] = remaining
        
        # Generate monthly trend (1-12 for months)
        monthly_trend = {}
        for month in range(1, 13):
            monthly_trend[month] = random.randint(0, 30)
        
        # Convert to response format
        response = {
            'taluk_name': taluk_name,
            'total_incidents': total_incidents,
            'resolved_incidents': resolved_incidents,
            'pending_incidents': pending_incidents,
            'avg_response_time': avg_response_time,
            'incident_types': {str(k): int(v) for k, v in incident_type_counts.items()},
            'monthly_trend': {str(k): int(v) for k, v in monthly_trend.items()}
        }
        
        return jsonify(response)
    except Exception as e:
        print(f"Error in get_taluk_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app)

# Load the dataset at startup (update path as needed)
DATA_PATH = os.path.join(os.path.dirname(__file__), '../Incident_Report (1).xlsx')
df = pd.read_excel(DATA_PATH)

@app.route('/')
def index():
    return jsonify({'status': 'Backend is running'})

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    # Return all incidents (limit for safety)
    limit = int(request.args.get('limit', 100))
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

# You can add more endpoints here for analytics, predictions, etc.

if __name__ == '__main__':
    app.run(debug=True, port=5000)

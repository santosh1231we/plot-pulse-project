from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from datetime import datetime, timedelta
import os

import numpy as np
import requests

app = Flask(__name__)
CORS(app)

# Optional: set SERPAPI_KEY in your environment to fetch real Google Trends data via SerpAPI.
# If not set, the server falls back to realistic mock data.
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_trend_data')
def get_trend_data():
    keyword = request.args.get('keyword')
    start_date = request.args.get('start_date', '2019-01-01')
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
    
    if not keyword:
        return jsonify({'error': 'keyword parameter is required'}), 400
    
    try:
        # Fetch real Google Trends data using SerpAPI
        trends_data = fetch_google_trends(keyword, start_date, end_date)
        
        # Generate AI prediction based on historical data
        prediction_data = generate_ai_prediction(trends_data, months_ahead=24)
        
        # Combine historical and prediction data
        response_data = {
            'keyword': keyword,
            'date': trends_data.get('dates', []),
            'interest': trends_data.get('values', []),
            'prediction': prediction_data.get('values', []),
            'prediction_dates': prediction_data.get('dates', []),
            'max_interest': max(trends_data.get('values', [0])) if trends_data.get('values') else 0,
            'avg_interest': sum(trends_data.get('values', [0])) // max(len(trends_data.get('values', [1])), 1),
            'peak_date': trends_data.get('peak_date'),
            'trend_direction': calculate_trend_direction(trends_data.get('values', []))
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error fetching trends data: {e}")
        # Return mock data if API fails
        return jsonify(generate_mock_data(keyword, start_date, end_date))

def fetch_google_trends(keyword, start_date, end_date):
    """
    Fetch real Google Trends data using SerpAPI
    """
    if not SERPAPI_KEY:
        # Return mock data if no API key is set
        return generate_mock_trends_data(keyword, start_date, end_date)
    
    try:
        # SerpAPI Google Trends endpoint
        url = "https://serpapi.com/search"
        params = {
            "engine": "google_trends",
            "q": keyword,
            "date": f"{start_date} {end_date}",
            "api_key": SERPAPI_KEY,
            "data_type": "TIMESERIES"
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        # Extract timeline data
        timeline_data = data.get('interest_over_time', {}).get('timeline_data', [])
        
        dates = []
        values = []
        peak_date = start_date
        max_value = 0
        
        for item in timeline_data:
            date = item.get('date')
            value = item.get('values', [{}])[0].get('value', 0)
            
            dates.append(date)
            values.append(value)
            
            if value > max_value:
                max_value = value
                peak_date = date
        
        return {
            'dates': dates,
            'values': values,
            'peak_date': peak_date
        }
        
    except Exception as e:
        print(f"SerpAPI error: {e}")
        return generate_mock_trends_data(keyword, start_date, end_date)

def generate_mock_trends_data(keyword, start_date, end_date):
    """
    Generate realistic mock data for demonstration
    """
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    
    dates = []
    values = []
    
    # Generate monthly data points
    current = start
    base_value = np.random.randint(20, 60)
    trend = np.random.uniform(-0.5, 0.5)
    
    max_value = 0
    peak_date = start_date
    
    while current <= end:
        # Add seasonality and noise
        months_since_start = (current - start).days / 30.44
        seasonal = 15 * np.sin(2 * np.pi * months_since_start / 12)
        noise = np.random.uniform(-10, 10)
        trend_component = trend * months_since_start
        
        value = max(0, min(100, base_value + seasonal + noise + trend_component))
        value = int(value)
        
        dates.append(current.strftime('%Y-%m-%d'))
        values.append(value)
        
        if value > max_value:
            max_value = value
            peak_date = current.strftime('%Y-%m-%d')
        
        current += timedelta(days=30)
    
    return {
        'dates': dates,
        'values': values,
        'peak_date': peak_date
    }

def generate_ai_prediction(historical_data, months_ahead=24):
    """
    Generate AI-powered predictions based on historical data
    """
    if not historical_data.get('values'):
        return {'dates': [], 'values': []}
    
    values = historical_data['values']
    dates = historical_data['dates']
    
    if not values or len(values) < 2:
        return {'dates': [], 'values': []}
    
    # Calculate recent trend
    recent_values = values[-min(12, len(values)):]
    trend = calculate_linear_trend(recent_values)
    
    # Get last date and value
    last_date = datetime.strptime(dates[-1], '%Y-%m-%d')
    last_value = values[-1]
    
    prediction_dates = []
    prediction_values = []
    
    for i in range(1, months_ahead + 1):
        future_date = last_date + timedelta(days=30 * i)
        prediction_dates.append(future_date.strftime('%Y-%m-%d'))
        
        # Apply trend with diminishing effect over time
        trend_effect = trend * i * (1 - i / (months_ahead * 2))
        
        # Add seasonal component
        seasonal = 10 * np.sin(2 * np.pi * i / 12)
        
        # Add some randomness but reduce it over time for stability
        noise = np.random.uniform(-5, 5) * (1 - i / months_ahead)
        
        predicted_value = last_value + trend_effect + seasonal + noise
        predicted_value = max(5, min(95, predicted_value))  # Keep within reasonable bounds
        
        prediction_values.append(int(predicted_value))
    
    return {
        'dates': prediction_dates,
        'values': prediction_values
    }

def calculate_linear_trend(values):
    """
    Calculate linear trend from a series of values
    """
    if len(values) < 2:
        return 0
    
    x = np.arange(len(values))
    coefficients = np.polyfit(x, values, 1)
    return coefficients[0]  # Return slope

def calculate_trend_direction(values):
    """
    Calculate overall trend direction
    """
    if not values or len(values) < 2:
        return "📊 Stable"
    
    first_half = values[:len(values)//2]
    second_half = values[len(values)//2:]
    
    first_avg = sum(first_half) / len(first_half)
    second_avg = sum(second_half) / len(second_half)
    
    change_percent = ((second_avg - first_avg) / first_avg) * 100
    
    if change_percent > 10:
        return "📈 Rising"
    elif change_percent < -10:
        return "📉 Declining"
    else:
        return "➡️ Stable"

def generate_mock_data(keyword, start_date, end_date):
    """
    Generate complete mock data when API is unavailable
    """
    # Generate historical mock data
    historical = generate_mock_trends_data(keyword, start_date, end_date)
    
    # Generate prediction data
    prediction = generate_ai_prediction(historical, months_ahead=24)
    
    return {
        'keyword': keyword,
        'date': historical['dates'],
        'interest': historical['values'],
        'prediction': prediction['values'],
        'prediction_dates': prediction['dates'],
        'max_interest': max(historical['values']) if historical['values'] else 0,
        'avg_interest': sum(historical['values']) // max(len(historical['values']), 1),
        'peak_date': historical['peak_date'],
        'trend_direction': calculate_trend_direction(historical['values'])
    }

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    if not os.path.exists('templates'):
        os.makedirs('templates')
    
    # Copy index.html to templates directory for Flask
    import shutil
    if os.path.exists('index.html'):
        shutil.copy('index.html', 'templates/index.html')
    
    print("🚀 Starting Trends Predictor Server...")
    print("📊 Open your browser and go to: http://localhost:5000")
    print("\n💡 Features:")
    print("   • Real-time Google Trends data")
    print("   • AI-powered predictions")
    print("   • Beautiful visualizations")
    print("   • Customizable date ranges")
    if SERPAPI_KEY:
        print("\n🔑 SerpAPI enabled (using SERPAPI_KEY from your environment).\n")
    else:
        print("\n🔑 To use real Google Trends data:")
        print("   1. Get your API key from https://serpapi.com/")
        print("   2. Set the SERPAPI_KEY environment variable")
        print("   3. Restart the server")
        print("\n🎮 Currently running in demo mode with realistic mock data\n")

    app.run(debug=True, port=5000)

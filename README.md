# Google Trends Explorer

Welcome to the Google Trends Explorer, a web application that visualizes Google Trends data. The application allows users to explore trending topics over different date ranges with the option to generate future predictions.

## Features

- **Interactive Trends Visualization**: View trends for any keyword with historical data visualization using Chart.js.
- **Prediction Support**: Enable AI-based future predictions to see potential trends.
- **Dynamic Tooltips**: Differentiate between historical and predicted data with clear tooltips.
- **Date Selection**: Choose custom date ranges with validation to prevent invalid selections.
- **Error Handling**: User-friendly error messages for better experience.

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript, Chart.js for visualization.
- **Backend**: Flask and Flask-CORS to handle API requests and manage server-side operations.
- **Data**: Uses pytrends to fetch trends data from Google Trends.

## Installation

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/UjreShreyas/Trends-Analysis.git
    cd google-trends-explorer
    ```

2. **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3. **Run the Server**:
    ```bash
    flask run
    ```
   The application will be accessible at `http://127.0.0.1:5000/`.

## Usage

- **Explore Trends**: Enter a keyword and select a date range to explore trends.
- **Generate Predictions**: Use the slider to set a prediction period and toggle the prediction view.
- **Download Chart**: Download the current trends chart as a PNG file.
- **Error Modal**: Shows detailed error messages when inputs are invalid or data fetching fails.

## Code Structure

- **app.py**: Main server file containing API routes and data processing logic.
- **script.js**: Frontend logic for fetching and displaying trends data.
- **styles.css**: Custom styles for the application UI.
- **index.html**: Main HTML file integrating all frontend components.
- **requirements.txt**: Contains all backend dependencies.

## License

MIT License

## Acknowledgments

Built with ❤️ by Shreyas Bhat Ujre.

"# plot-pulse" 

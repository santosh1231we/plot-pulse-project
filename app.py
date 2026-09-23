import os
from flask import send_from_directory
from api.index import app

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')


@app.route('/<path:filename>')
def static_files(filename):
    target_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(target_path) and os.path.isfile(target_path):
        return send_from_directory(BASE_DIR, filename)
    return send_from_directory(BASE_DIR, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Server running at http://localhost:{port}")
    app.run(debug=True, host='0.0.0.0', port=port)

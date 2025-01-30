from flask import Flask
from flask_cors import CORS
from api import api

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

    # Register Blueprint from api.py
    app.register_blueprint(api, url_prefix='/api')
    
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=8080)

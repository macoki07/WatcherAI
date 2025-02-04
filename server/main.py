from flask import Flask
from flask_cors import CORS
from api.batch_apis import batch
from api.single_apis import single

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

    # Register Blueprint from api.py
    app.register_blueprint(single, url_prefix='/api/single')
    app.register_blueprint(batch, url_prefix='/api/batch')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=8080)

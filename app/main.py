# main.py
import os
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
from index_routes import index_bp
from kitchen_routes import kitchen_bp
from admin_routes import admin_bp

# Use an absolute path for the templates folder
app = Flask(__name__, template_folder=os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'templates')))
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Register blueprints
app.register_blueprint(index_bp)
app.register_blueprint(kitchen_bp)
app.register_blueprint(admin_bp)

if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True, debug=True)
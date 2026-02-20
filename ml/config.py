"""
Database configuration for the ML scripts.
Uses env
"""
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'woodmans_carts'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')
}

ML_CONFIG = {
    'days_of_history': 90,  
    'model_path': 'models/corral_model.pkl',  
    'encodings_path': 'models/corral_encodings.json'  
}

if not DB_CONFIG['password']:
    raise ValueError("DB_PASSWORD not found in .env file")

"""
Train the cart prediction model using LightGBM.

- Loads and preprocesses data
- Encodes corral IDs as integers
- Trains regression model
"""

import lightgbm as light
import joblib
import json
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
from preprocess import prepareTrainingData
from config import ML_CONFIG
import os

class CorralPredictor:
    def __init__(self):
        self.model = None
        # Set corral_id to some integer
        self.corralEncodings = {}
        # Maps the integer back to corral id
        self.reverseEncodings = {}
        
    def train(self):
        """
        Train the prediction model on historical data.
        
        Returns: Dictionary with training metrics (MAE, R^2, RMSE)
        """

        X, y, corral_ids = prepareTrainingData()

        uniqueCorrals = corral_ids.unique()
        self.corralEncodings = {corral: i for i, corral in enumerate(uniqueCorrals)}
        self.reverseEncodings = {i: corral for corral, i in self.corralEncodings.items()}

        X['corralEncoded'] = corral_ids.map(self.corralEncodings)

        print(f"Encoded {len(self.corralEncodings)} corrals")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model = light.LGBMRegressor(
            n_estimators=100,        # # of trees
            learning_rate=0.05,      # How fast
            max_depth=5,             # Maximum depth
            num_leaves=31,           # How complex (leaves)
            min_child_samples=20,    # Minimum data points per leaf
            random_state=42,
            verbose=-1 
        )

        self.model.fit(X_train, y_train)
        print("Training complete")
        
        print("\nEvaluating model")
        y_pred = self.model.predict(X_test)
        
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        print(f"  Mean Absolute Error: {mae:.2f} carts")
        print(f"  Root Mean Squared Error: {rmse:.2f} carts")
        print(f"  R^2 Score: {r2:.3f}")

        if r2 > 0.7:
            print("Good model performance!")
        elif r2 > 0.5:
            print("Decent performance, could be improved with more data")
        else:
            print("Poor performance, needs more data or better features")

        # Important features
        print("\nTop 5 important features")
        featureImportance = sorted(
            zip(X.columns, self.model.feature_importances_),
            key=lambda x: x[1],
            reverse=True
        )
        for i, (feature, importance) in enumerate(featureImportance[:5], 1):
            print(f"  {i}. {feature}: {importance:.1f}")

        self.saveModel()

        return {
            'mae': float(mae),
            'rmse': float(rmse),
            'r2': float(r2),
            'samples': len(X_train)
        }
    
    def predict(self, corral_id, hour, day_of_week):
        """
        Predict cart count for a specific corral at a given time.
        
        Args:
            corral_id: Corral identifier
            hour: Hour of day (0-23)
            day_of_week: Day of week (0 would be Monday and 6 would be Sunday)
        
        Returns: Predicted cart count
        """

        if self.model is None:
            raise ValueError("Model not trained, call train() first")
        
        if corral_id not in self.corralEncodings:
            corralEncoded = len(self.corralEncodings) // 2
        else:
            corralEncoded = self.corralEncodings[corral_id]

        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        dow_sin = np.sin(2 * np.pi * day_of_week / 7)
        dow_cos = np.cos(2 * np.pi * day_of_week / 7)
        is_weekend = 1 if day_of_week >= 5 else 0

        features = [[
            hour, day_of_week, is_weekend,
            hour_sin, hour_cos, dow_sin, dow_cos,
            corralEncoded
        ]]

        prediction = self.model.predict(features)[0]
        return max(0, prediction) # not negative
    
    def predictDay(self, corral_id, day_of_week):
        """
        Predict cart counts for all 24 hours of a given day.
        
        Args:
            corral_id: Corral identifier
            day_of_week: Day of week (0=Monday, 6=Sunday)
        
        Returns: List of dicts with 'hour' and 'predicted_count'
        """

        predictions = []
        for hour in range(24):
            count = self.predict(corral_id, hour, day_of_week)
            predictions.append({
                'hour': hour,
                'predicted_count': round(count, 1)
            })
        return predictions
    
    def saveModel(self):
        """
        Save trained model and corral encodings to disk.
        """
        # Create directory if it doesn't exist
        os.makedirs('models', exist_ok=True)

        # Save model
        modelPath = ML_CONFIG['model_path']
        joblib.dump(self.model, modelPath)
        print(f"\nModel saved to {modelPath}")
        
        # Save corral encodings
        encodingsPath = ML_CONFIG['encodings_path']
        with open(encodingsPath, 'w') as f:
            json.dump(self.corralEncodings, f)
        print(f"Encodings saved to {encodingsPath}")

    def loadModel(self):
        """
        Load trained model from disk.
        """

        modelPath = ML_CONFIG['model_path']
        encodingsPath = ML_CONFIG['encodings_path']

        if not os.path.exists(modelPath):
            raise FileNotFoundError(f"Model not found at {modelPath}. Please train the model first")
        
        self.model = joblib.load(modelPath)

        with open(encodingsPath, 'r') as f:
            self.corralEncodings = json.load(f)
        
        self.reverseEncodings = {i: corral for corral, i in self.corralEncodings.items()}
        
        print(f"Model loaded from {modelPath}")
    
if __name__ == "__main__":
    try:
        # Train the model
        predictor = CorralPredictor()
        metrics = predictor.train()
            
        # Test some predictions
            
        # Predict for Corral A on Wednesday (day 2) at 3 PM (hour 15)
        prediction = predictor.predict('A', hour=15, day_of_week=2)
        print(f"Prediction for Corral A on Wednesday at 3 PM: {prediction:.1f} carts")
            
        # Predict full day for Corral A on Saturday
        print("\nSaturday predictions for Corral A:")
        day_predictions = predictor.predict_day('A', day_of_week=5)
        for p in day_predictions[8:20]:  # Show 8am-8pm
            print(f"  {p['hour']:02d}:00 > {p['predicted_count']} carts")
            
        print("\nModel training complete and ready to use")
            
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()   






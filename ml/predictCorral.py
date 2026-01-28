import sys
import json
from trainModel import CorralPredictor


def main():
    # Check command line arguments
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Missing arguments. Usage: predictCorral.py <corral_id> <day_of_week>'}))
        sys.exit(1)
    
    corral_id = sys.argv[1]
    day_of_week = int(sys.argv[2])
    
    try:
        # Load the trained model
        predictor = CorralPredictor()
        predictor.loadModel()
        
        # Generate predictions for all 24 hours
        predictions = predictor.predictDay(corral_id, day_of_week)
        
        # Output as JSON
        print(json.dumps(predictions))
        
    except Exception as e:
        # Output error as JSON
        error_response = {'error': str(e)}
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
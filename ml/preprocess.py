import pandas as pd
import numpy as np
import psycopg2
from config import DB_CONFIG, ML_CONFIG

def loadDataFromDB():
    conn = psycopg2.connect(**DB_CONFIG)

    query = f"""
        SELECT 
            corral_id,
            cart_count,
            timestamp,
            hour,
            day_of_week
        FROM corral_snapshots
        WHERE timestamp >= NOW() - INTERVAL '{ML_CONFIG['days_of_history']} days'
        ORDER BY corral_id, timestamp
    """

    print(f"Loading data from last {ML_CONFIG['days_of_history']} days")
    df = pd.read_sql(query, conn)
    conn.close()

    print(f"Loaded {len(df)} snapshots for {df['corral_id'].nunique()} corrals")
    return df

def engineerFeatures(df):
    """
    Create features for machine learning model
    
    - hour: Hour of day (0-23)
    - day_of_week: Day (0=Monday, 6=Sunday)
    - hour_sin/hour_cos: Cyclical encoding of hour
    - dow_sin/dow_cos: Cyclical encoding of day of week
    - is_weekend: Binary flag for Saturday/Sunday
    
    Args: df: DataFrame with raw snapshot data
    
    Returns: DataFrame with engineered features
    """
    # For the hour
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cod'] = np.cos(2 * np.pi * df['hour'] / 24)
    # For the day of week
    df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week' / 7])
    df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week' / 7])

    # Weekend
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    print(f"Created {len(df.columns)} features")
    return df

def aggregateTraining(df):
    """
    Aggregate snapshots into hourly averages.
    
    Instead of using every individual snapshot (which would overfit),
    we aggregate by corral + day_of_week + hour to get typical patterns.
    
    Args: df: DataFrame with engineered features
    
    Returns: DataFrame with one row per corral-day-hour combination
    """
    # Group and take average
    agg_df = df.groupby(['corral_id', 'day_of_week', 'hour']).agg({
        'cart_count': ['mean', 'std', 'count'],
        'hour_sin': 'first',
        'hour_cos': 'first',
        'dow_sin': 'first',
        'dow_cos': 'first',
        'is_weekend': 'first'
    }).reset_index()

    # Flatten column names
    agg_df.columns = ['_'.join(col).strip('_') for col in agg_df.columns.values]

    agg_df = agg_df.rename(columns={
        'cart_count_mean': 'avg_cart_count',
        'cart_count_std': 'cart_count_std',
        'cart_count_count': 'num_observations'
    })

    # Filter unnecessary low observations
    min_observations = 3
    agg_df = agg_df[agg_df['num_observations'] >= min_observations]
    
    print(f"Aggregated to {len(agg_df)} training examples")
    return agg_df

def prepareTrainingData():
    """
    Returns:
        Tuple of (X, y, corral_ids)
        - X: Feature matrix (DataFrame)
        - y: Target values (Series) - average cart counts
        - corral_ids: Corral identifiers (Series)
    """
    df = loadDataFromDB()

    if len(df) == 0:
        raise ValueError("No data, run that fake generation dumbass")
    
    df = engineerFeatures(df)

    agg_df = aggregateTraining(df)

    feature_cols = [
        'hour', 'day_of_week', 'is_weekend',
        'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos'
    ]

    X = agg_df[feature_cols].copy()
    y = agg_df['avg_cart_count']
    corral_ids = agg_df['corral_id']

    print(f"  Features shape is {X.shape}")
    print(f"  Target shape is {y.shape}")
    print(f"  Corrals: {corral_ids.nunique()}")

    return X, y, corral_ids

if __name__ == "__main__":
    try:
        X, y, corral_ids = prepareTrainingData()
        print("\nPreprocessing successful!")
        print(f"\nSample data:")
        print(X.head())
        print(f"\nTarget values (first 5):")
        print(y.head())
    except Exception as e:
        print(f"\nError: {e}")
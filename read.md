''' This is a program that should be directly impacting the lives of Woodman's cart workers, and possibly sourcing towards other big time grocery stores.

    Idea: Application that contains all the necessary information for a Woodman's cart worker to succeed and hopefully take some physically stressors off.

    Method Ideas:
        FindBestCartPath:
            Using machine learning and AI, there should be a designated route for cart worker's to go depending on the amount of carts in each corral.
        AddAmountToCorral:
            Using RFID's and RFID sensors in each corral, the carts that customers put back should be able to increase the cart count for the global variables of each corral.
        CartDestination:
            Depending on the amount of carts inside the building, the route of the carts should depend on which side of the building needs more carts.
        Weather API Integration:
            Pull weather data periodically using an external API (like OpenWeather).
    UI Ideas:
        Weather App:
            Designed to help workers see the incoming weather.
        Clock:
            Shows the time.
        Shifts:
            Shows the times at which each worker is on shift.
        RouteMapView:
            Shows the route.
        Live Cart Corral Status:
            Shows the intensity as to how many carts are in each corral (based on color).
        Safety Alerts:
            Displays alerts like icy pavement, lightning risk, or other weather-related warnings.
       Performance Metrics:
            Number of carts moved.
            Time efficiency compared to average.
            Weekly goal progress.
    Tech Stack:
        Frontend: React
        Backend: Python(AI) + React(Real-time)
        Weather API: OpenWeatherMap
        ML Framework: Python + scikit-learn / TensorFlow (later)
        Database: Firebase, PostgreSQL, or MongoDB
'''




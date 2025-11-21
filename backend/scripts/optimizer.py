import sys
import json
import math
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# Helper Functions vvv

def euclidean_distance(positionOne, positionTwo):
    #Compute straight line distance between points (x1, y1) and (x2, y2).
    return math.hypot(positionOne[0] - positionTwo[0], positionOne[1] - positionTwo[1])

def create_distance_matrix(locations):
    #Creates a 2D distance matrix used by OR-tools.
    
    size = len(locations)
    matrix = {}
    for from_idx in range(size):
        matrix[from_idx] = {}
        for to_idx in range(size):
            matrix[from_idx][to_idx] = (
                0 if from_idx == to_idx else euclidean_distance(locations[from_idx], locations[to_idx])
            )
    return matrix

# Core Functions vvv

def optimize_cart_route(locations, start_index = 0):
    """
    Solves TSP using the Google OR-Tools

    Args:
        locations: List of (x, y) coordinate tuples
        start_index: Index of starting location (depot)
        
    Returns:
        Dictionary with route and metadata
    """
    
    # Distance matrix
    distance_matrix = create_distance_matrix(locations)
    num_locations = len(locations)
    
    # Create routing index manager
    # Params: number of nodes, number of vehicles, depot index
    manager = pywrapcp.RoutingIndexManager(num_locations, 1, start_index)
    
    #Routing model
    routing = pywrapcp.RoutingModel(manager)
    
    # Distnace callback
    def distance_callback(from_index, to_index):
        # returns Distance between two nodes
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(distance_matrix[from_node][to_node] * 100) # scaled for integer precision
    
    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    
    # Defining the cost of travel
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    # Set search parameters
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 5
    
    # Solve
    
    solution = routing.SolveWithParameters(search_parameters)
    
    if not solution:
        return {
            "success": False,
            "error": "No solution found"
        }
        
    # Extract route
    route_indices = []
    total_distance = 0
    index = routing.Start(0)
    
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        route_indices.append(node)
        previous_index = index
        index = solution.Value(routing.NextVar(index))
        total_distance += routing.GetArcCostForVehicle(previous_index, index, 0)
        
    # Add final return to depot
    route_indices.append(start_index)
    
    return {
        "success": True,
        "route": route_indices,
        "total_distance": total_distance / 100.0 #unscale
    }
    
# MAIN
def main():
    """
    Reads JSON from stdin, solves TSP, writes JSON to stdout.
    
    Expected input format:
    {
        "corrals": {
            "A": {"x": 0, "y": 0, "count": 5},
            "B": {"x": 1, "y": 2, "count": 12},
            ...
        },
        "depot": "A"  # Optional, defaults to first corral
    }
    """
    try:
        # Read input from stdin (js import data)
        input_data = json.load(sys.stdin)
        corrals = input_data.get("corrals", {})
        depot_id = input_data.get("depot", None)
        
        if not corrals:
            raise ValueError("No corrals provided")
        
        # Convert corrals dict to lists
        corral_ids = list(corrals.keys())
        locations = [(corrals[cid]["x"], corrals[cid]["y"]) for cid in corral_ids]
        
        # Determine depot index
        if depot_id and depot_id in corral_ids:
            depot_index = corral_ids.index(depot_id)
        else:
            depot_index = 0  # Default to first corral
        
        # Solve TSP
        result = optimize_cart_route(locations, depot_index)
        
        if not result["success"]:
            print(json.dumps(result))
            sys.exit(1)
        
        # Convert route indices back to corral IDs
        route_ids = [corral_ids[idx] for idx in result["route"]]
        
        # Prepare output
        output = {
            "success": True,
            "optimizedRoute": route_ids,
            "totalDistance": result["total_distance"],
            "method": "or-tools-tsp",
            "corralsCovered": len(set(route_ids)) - 1  # not including depot
        }
        
        # Write to stdout
        print(json.dumps(output))
        
    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()    
    
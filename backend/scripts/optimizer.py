import sys, json, math
from ortools.constraint_solver import pywrapcp, routing_enumb_pb2

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
    
    

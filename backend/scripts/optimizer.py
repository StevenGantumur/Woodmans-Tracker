# optimizer.py
# -----------------
# This module handles route optimization logic for the Woodman's cart collection project.
# It uses Google OR-Tools to compute efficient paths for cart retrievers to move between
# cart corrals and the building, minimizing total distance or travel time.
#
# The data is usually received from the backend REST API as JSON — 
# containing corral coordinates and optionally the collector’s current position.

from ortools.constraint_solver import pywrapcp, routing_enums_pb2
import math


# Helper Methods vvv
def euclidean_distance(positionOne, positionTwo):
    #Computes the straight line distance between the two positions (x1, y1) and (x2, y2).
    return math.hypot(positionOne[0] - positionTwo[0], positionOne[1], positionTwo[1])

def create_distance_matrix(locations):
    #Builds a 2D distance matrix used by the OR-tools extension.
    size = len(locations)
    matrix = {}
    for from_idx in range(size):
        matrix[from_idx] = {}
        for to_idx in range(size):
            matrix[from_idx][to_idx] = (
                0 if from_idx == to_idx else euclidean_distance(locations[from_idx], locations[to_idx])
            )
    return matrix


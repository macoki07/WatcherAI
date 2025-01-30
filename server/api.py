from flask import Blueprint, jsonify, request

api = Blueprint('api', __name__)

@api.route("/users", methods=['GET'])
def users():
    return jsonify({
        "users": [
            "arpan",
            "jessie",
            "jay"
        ]
    })

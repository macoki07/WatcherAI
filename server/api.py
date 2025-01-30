from flask import Blueprint, jsonify, request
from datetime import datetime
import re
import utils
import requests
api = Blueprint("api", __name__)


@api.route("/users", methods=["GET"])
def users():
    return jsonify({"users": ["arpan", "jessie", "jay"]})


@api.route("/single/get_metadata", methods=["GET","POST"])
def get_metadata_route():
    data = request.get_json()
    print(data)
    if not data or "url" not in data:
        return jsonify({"success": False, "message": "No URL provided"}), 400

    url = data["url"]

    youtube_link_pattern = r"(http(s)?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+))"
    link = re.search(youtube_link_pattern, url)

    if not link:
        return jsonify({"success": False, "message": "Invalid YouTube link"}), 400

    youtube_link = link.group(0)
    video_id = utils.get_video_id(youtube_link)  # Ensure this function is correct

    try:
        info_dict = utils.get_metadata(youtube_link)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    res_dict = {
        "Link": youtube_link,
        "Title": info_dict.get("title", ""),
        "Description": info_dict.get("description", ""),
        "Uploader": info_dict.get("uploader", ""),
        "UploadDate": None,
        "Results": None,
        "Processed": False,
    }

    upload_date = info_dict.get("upload_date")
    if upload_date:
        try:
            date_obj = datetime.strptime(upload_date, "%Y%m%d")
            res_dict["UploadDate"] = date_obj.strftime("%d/%m/%y")
        except ValueError:
            res_dict["UploadDate"] = upload_date  # Fallback to raw value

    return jsonify({"success": True, "metadata": res_dict}), 200

@api.route("/api/single/summarise", methods=["POST"])
def summarise_route():
    data = request.get_json()  # This will be a dictionary if JSON is valid
    url = data.get("url")

    youtube_link_pattern = r"(http(s)?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+))(&list=[^&]+)?(&index=[^&]+)?(&t=[^&]+)?(&ab_channel=[^&]+)?"
    link = re.search(youtube_link_pattern, url)

    # Do something with the URL
    # For example, parse the YouTube link, fetch video data, etc.
    # We'll just send a dummy response for now.
    summary_text = f"This is a summary of the video at {url}"

    # Return a JSON response
    return jsonify({"summary": summary_text})

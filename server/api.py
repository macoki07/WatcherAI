from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
import re
import utils
import pandas as pd
import io

api = Blueprint("api", __name__)


@api.route("/users", methods=["GET"])
def users():
    return jsonify({"users": ["arpan", "jessie", "jay"]})


@api.route("/single/get_metadata", methods=["POST"])
def get_metadata_route():
    data = request.get_json()
    print(data)
    if data.get("url") == "":
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
        "VideoId": video_id,
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

@api.route("/single/summarise", methods=["POST"])
def summarise_route():
    data = request.get_json()
    
    if "metadata" not in data:
        return jsonify({"success": False, "message": "Missing metadata in request"}), 400
     
    metadata = data.get("metadata")
    
    if "VideoId" not in metadata:
        return jsonify({"success": False, "message": "Missing VideoId in metadata"}), 400
        
    video_id = metadata["VideoId"]
    
    full_transcript = utils.get_transcript(video_id=video_id)
    chunk_size = utils.set_chunk_size(size=7000)
    
    # Check if the transcript is too long to process in one go
    chunks, total_chunk_num = utils.split_transcript(full_transcript, chunk_size)
    if total_chunk_num > 1:
        for i, chunk in enumerate(chunks, start=1):
            summary = utils.provide_summary_chunk(chunk, i, total_chunk_num)
            metadata["Results"] = (metadata["Results"] or "") + summary

    else:
        final_summary = utils.provide_summary(full_transcript)
        metadata["Results"] = final_summary

    metadata["Processed"] = True
    

    return jsonify({"success": True, "metadata": metadata}), 200

@api.route("/single/download", methods=["POST"])
def download_route():
    data = request.get_json()
    print(data)
    if data["metadata"] is None:
        return jsonify({"success": False, "message": "No file to download"}), 400

    metadata = data["metadata"]

    metadata.pop("videoId", None)  # Remove 'videoId' if it exists
    metadata.pop("processed") # Remove 'processed' if it exists

    # Convert metadata to a pandas DataFrame
    df = pd.DataFrame(metadata, index=[0])


    df.columns = [col.capitalize() for col in df.columns]
    df.insert(0, "S/N", 1)  # Insert S/N column at the beginning with value 1
    df.rename(columns={"Uploaddate": "Upload Date"}, inplace=True)
    print(df.columns)

    file_stream = io.BytesIO()

    with pd.ExcelWriter(file_stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Video Summary")

    # Seek to the beginning of the stream
    file_stream.seek(0)

    # Return the file as a downloadable response
    return send_file(
        file_stream,
        as_attachment=True,
        download_name="video_summary.xlsx",  # Name of the downloaded file
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
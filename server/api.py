from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
import re
import utils
import pandas as pd
import io

api = Blueprint("api", __name__)


def validate_metadata(func):
    def wrapper(*args, **kwargs):
        data = request.get_json()
        print(data)
        if "metadata" not in data:
            return jsonify({"success": False, "message": "Missing metadata in request"}), 400

        metadata_list = data.get("metadata")

        # Ensure metadata is a list
        if not isinstance(metadata_list, list):
            return jsonify({"success": False, "message": "Metadata must be a list"}), 400

        # Validate each item in the list
        for metadata in metadata_list:
            if "VideoId" not in metadata:
                return jsonify({"success": False, "message": "Missing VideoId in metadata item"}), 400

        return func(metadata_list, *args, **kwargs)
    return wrapper

def handle_processing(metadata, processor):
    video_id = metadata["VideoId"]
    full_transcript = utils.get_transcript(video_id=video_id)
    chunk_size = utils.set_chunk_size(size=7000)
    
    chunks, total_chunk_num = utils.split_transcript(full_transcript, chunk_size)
    
    if total_chunk_num > 1:
        for i, chunk in enumerate(chunks, start=1):
            result = processor['chunk'](chunk, i, total_chunk_num)
            metadata["Results"] = (metadata.get("Results") or "") + result
    else:
        metadata["Results"] = processor['func'](full_transcript)

    metadata["Processed"] = True
    return metadata


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

    res_dict = [{
        "VideoId": video_id,
        "Link": youtube_link,
        "Title": info_dict.get("title", ""),
        "Description": info_dict.get("description", ""),
        "Uploader": info_dict.get("uploader", ""),
        "UploadDate": None,
        "Results": None,
        "Processed": False,
    }]

    upload_date = info_dict.get("upload_date")
    if upload_date:
        try:
            date_obj = datetime.strptime(upload_date, "%Y%m%d")
            res_dict[0]["UploadDate"] = date_obj.strftime("%d/%m/%y")
        except ValueError:
            res_dict[0]["UploadDate"] = upload_date  # Fallback to raw value

    return jsonify({"success": True, "metadata": res_dict}), 200


@api.route("/single/<action>", methods=["POST"])
@validate_metadata
def handle_single_action(metadata_list, action):
    processors = {
        "summarise": {
            'chunk': utils.provide_summary_chunk,
            'func': utils.provide_summary
        },
        "generate_ideas": {
            'chunk': utils.generate_idea_chunk,
            'func': utils.generate_idea
        }
    }
    
    processed_metadata_list = []
    for metadata in metadata_list:
        processed_metadata = handle_processing(metadata, processors[action])
        processed_metadata_list.append(processed_metadata)

    return jsonify({"success": True, "metadata": processed_metadata_list}), 200

@api.route("/single/download", methods=["POST"])
def download_route():
    data = request.get_json()
    if not data.get("metadata") or not isinstance(data["metadata"], list):
        return jsonify({"success": False, "message": "Invalid metadata format"}), 400

    metadata_list = data["metadata"]

    rows = []
    for metadata in metadata_list:
        # Start with S/N as the first key
        row = {"S/N": len(rows) + 1}
        # Then add the other keys (excluding "videoId" and "processed")
        row.update({k.capitalize(): v for k, v in metadata.items() if k not in ["videoId", "processed"]})
        rows.append(row)


    df = pd.DataFrame(rows)
    df.rename(columns={"Uploaddate": "Upload Date"}, inplace=True)

    # Generate Excel file
    file_stream = io.BytesIO()
    with pd.ExcelWriter(file_stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Results")
    file_stream.seek(0)

    return send_file(file_stream, as_attachment=True, download_name="output.xlsx")
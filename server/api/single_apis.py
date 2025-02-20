from functools import wraps
import os
import tempfile
import zipfile
from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
import re
import utils
import pandas as pd
import io

single = Blueprint("single", __name__)


def validate_metadata(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        data = request.get_json()
        print(data)
        if "metadata" not in data:
            return (
                jsonify({"success": False, "message": "Missing metadata in request"}),
                400,
            )

        metadata_list = data.get("metadata")

        # Ensure metadata is a list
        if not isinstance(metadata_list, list):
            return (
                jsonify({"success": False, "message": "Metadata must be a list"}),
                400,
            )

        # Validate each item in the list
        for metadata in metadata_list:
            if "VideoId" not in metadata:
                return (
                    jsonify(
                        {
                            "success": False,
                            "message": "Missing VideoId in metadata item",
                        }
                    ),
                    400,
                )

        return func(metadata_list, *args, **kwargs)

    return wrapper


def handle_processing(metadata, processor):
    video_id = metadata["VideoId"]
    full_transcript = utils.get_transcript(video_id=video_id)
    chunk_size = utils.set_chunk_size(size=7000)

    chunks, total_chunk_num = utils.split_transcript(full_transcript, chunk_size)

    if total_chunk_num > 1:
        for i, chunk in enumerate(chunks, start=1):
            result = processor["chunk"](chunk, i, total_chunk_num)
            metadata["Results"] = (metadata.get("Results") or "") + result
    else:
        metadata["Results"] = processor["func"](full_transcript)

    metadata["Processed"] = True
    return metadata


@single.route("/get_metadata", methods=["POST"])
def get_metadata_route():
    data = request.get_json()
    print(data)
    if data.get("url") == "":
        return jsonify({"success": False, "message": "No URL provided"}), 400

    url = data["url"]

    youtube_link_pattern = (
        r"(http(s)?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+))"
    )
    link = re.search(youtube_link_pattern, url)

    if not link:
        return jsonify({"success": False, "message": "Invalid YouTube link"}), 400

    youtube_link = link.group(0)
    video_id = utils.get_video_id(youtube_link)  # Extract video ID

    try:
        info_dict = utils.get_metadata(youtube_link)
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

    res_dict = [
        {
            "VideoId": video_id,
            "Link": youtube_link,
            "Title": info_dict.get("title", ""),
            "Description": info_dict.get("description", ""),
            "Uploader": info_dict.get("uploader", ""),
            "UploadDate": None,
            "Results": None,
            "Processed": False,
        }
    ]

    upload_date = info_dict.get("upload_date")
    if upload_date:
        try:
            date_obj = datetime.strptime(upload_date, "%Y%m%d")
            res_dict[0]["UploadDate"] = date_obj.strftime("%d/%m/%y")
        except ValueError:
            res_dict[0]["UploadDate"] = upload_date  # Fallback to raw value

    return jsonify({"success": True, "metadata": res_dict}), 200


@single.route("/<action>", methods=["POST"])
@validate_metadata
def handle_single_action(metadata_list, action):
    processors = {
        "summarise": {
            "chunk": utils.provide_summary_chunk,
            "func": utils.provide_summary,
        },
        "generate_ideas": {
            "chunk": utils.generate_idea_chunk,
            "func": utils.generate_idea,
        },
    }

    processed_metadata_list = []
    for metadata in metadata_list:
        processed_metadata = handle_processing(metadata, processors[action])
        processed_metadata_list.append(processed_metadata)

    return jsonify({"success": True, "metadata": processed_metadata_list}), 200


@single.route("/download", methods=["POST"])
def download_route():
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"success": False, "message": "Invalid metadata format"}), 400

    transcript_file = utils.get_transcript_file(data[0]["Link"],data[0]["VideoId"])
    if not transcript_file:
        return (
            jsonify({"success": False, "message": "Failed to generate transcript"}),
            500,
        )

    rows = []
    for metadata in data:
        # Start with S/N as the first key
        row = {"S/N": len(rows) + 1}
        # Then add the other keys (excluding "VideoId" and "Processed")
        row.update(
            {
                k.capitalize(): v
                for k, v in metadata.items()
                if k not in ["VideoId", "Processed"]
            }
        )
        rows.append(row)

    df = pd.DataFrame(rows)
    df.rename(columns={"Uploaddate": "Upload Date"}, inplace=True)

    # Create a temporary directory to store files
    with tempfile.TemporaryDirectory() as temp_dir:
        # Move transcript file to temp directory
        transcript_filename = os.path.basename(transcript_file)
        transcript_path = os.path.join(temp_dir, transcript_filename)
        os.rename(transcript_file, transcript_path)

        # Generate and save the Excel file in the temporary directory
        excel_path = os.path.join(temp_dir, "output.xlsx")
        with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Results")

        # Create a temporary ZIP file
        zip_file = tempfile.mktemp(suffix=".zip")
        with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zipf:
            # Walk through the temporary directory and add each file to the ZIP
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    zipf.write(full_path, arcname=file)  # Store with just the filename

        # Send the ZIP file as an attachment
        response = send_file(
            zip_file,
            as_attachment=True,
            download_name="output.zip"
        )

        return response


@single.route("/get_transcript_file", methods=["POST"])
def get_transcript_file_route():
    data = request.get_json()
    print(data)

    if not data.get("url"):
        return jsonify({"success": False, "message": "No URL provided"}), 400

    url = data["url"]

    youtube_link_pattern = (
        r"(http(s)?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+))"
    )
    
    # Validate YouTube link
    link_match = re.search(youtube_link_pattern, url)
    if not link_match:
        return jsonify({"success": False, "message": "Invalid YouTube link"}), 400

    # Extract the valid link
    link = link_match.group(1)

    video_id = utils.get_video_id(link)

    # Call the function to get transcript file 
    transcript_file = utils.get_transcript_file(link,video_id)
    if not transcript_file:
        return (
            jsonify({"success": False, "message": "Failed to generate transcript"}),
            500,
        )

    # Extract filename dynamically
    filename = os.path.basename(transcript_file)
    print(f"Transcript file: {filename}")

    try:
        # Ensure the file exists before sending
        if not os.path.exists(transcript_file):
            return jsonify({"success": False, "message": "File not found"}), 404

         # Copy file contents to a temporary file (prevents file lock issues)
        with open(transcript_file, "r", encoding="utf-8") as original:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as temp_file:
                temp_file.write(original.read().encode("utf-8"))
                temp_file_path = temp_file.name  # Get the path

        # Send temporary file to client
        response = send_file(
            temp_file_path,
            as_attachment=True,
            download_name=f"{filename}"
        )

        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
        
        return utils.schedule_file_removal(response, transcript_file)  # Call external function

    except Exception as e:
        print(f"Error sending file: {e}")
        return jsonify({"success": False, "message": "Error sending file"}), 500

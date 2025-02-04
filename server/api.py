from functools import wraps
from flask import Blueprint, jsonify, request, send_file
from datetime import datetime
import re
import utils
import pandas as pd
import io

api = Blueprint("api", __name__)


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


@api.route("/single/get_metadata", methods=["POST"])
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
    video_id = utils.get_video_id(youtube_link)  # Ensure this function is correct

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


@api.route("/single/<action>", methods=["POST"])
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


@api.route("/batch/get_metadata", methods=["POST"])
def get_metadata_batch_route():
    # Check if the request contains a file
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename
    # Check if the file is empty
    if filename == "":
        return jsonify({"success": False, "message": "Empty filename"}), 400

    if filename.endswith(".csv"):
        df = pd.read_csv(file)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(file)

    # Remove "Unnamed" columns
    df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

    res_array = []

    for index, link in enumerate(df["Link"]):
        res_dict = {
            "VideoId": "",
            "Link": "",
            "Title": "",
            "Description": "",
            "Uploader": "",
            "UploadDate": None,
            "Results": None,
            "Processed": False,
        }
        print("YouTube Link " + str(index + 1) + " Found:", link)
        video_id = utils.get_video_id(link)
        youtube_link = f"https://www.youtube.com/watch?v={video_id}"

        # Get the metadata of the YouTube video
        info_dict = utils.get_metadata(youtube_link)

        # Fill in the dict
        res_dict["VideoId"] = str(video_id)
        res_dict["Link"] = str(youtube_link)
        res_dict["Title"] = str(info_dict.get("title"))
        res_dict["Description"] = str(info_dict.get("description"))
        res_dict["Uploader"] = str(info_dict.get("uploader"))

        upload_date = info_dict.get("upload_date")
        formatted_date = pd.to_datetime(upload_date, errors="coerce").strftime(
            "%d/%m/%y"
        )
        res_dict["UploadDate"] = formatted_date
        res_array.append(res_dict)

    print(res_array)
    return jsonify({"success": True, "metadata": res_array}), 200


def validate_batch_metadata(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        data = request.get_json()

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


def handle_batch_processing(metadata_list, processor):
    processed_metadata_list = []

    for metadata in metadata_list:
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
        processed_metadata_list.append(metadata)

    return processed_metadata_list


@api.route("/batch/<action>", methods=["POST"])
@validate_batch_metadata
def handle_batch_action(metadata_list, action):
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

    if action not in processors:
        return jsonify({"success": False, "message": "Invalid action"}), 400

    processed_metadata_list = []

    processed_metadata = handle_batch_processing(metadata_list, processors[action])
    processed_metadata_list.append(processed_metadata)

    return jsonify({"success": True, "metadata": processed_metadata_list}), 200


@api.route("/single/download", methods=["POST"])
def download_route():
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"success": False, "message": "Invalid metadata format"}), 400

    rows = []
    for metadata in data:
        # Start with S/N as the first key
        row = {"S/N": len(rows) + 1}
        # Then add the other keys (excluding "videoId" and "processed")
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

    # Generate Excel file
    file_stream = io.BytesIO()
    with pd.ExcelWriter(file_stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Results")
    file_stream.seek(0)

    return send_file(file_stream, as_attachment=True, download_name="output.xlsx")


@api.route("/batch/download", methods=["POST"])
def batch_download_route():
    # Get the JSON data from the request; expect it to be a list of dictionaries.
    data = request.get_json()
    if not data or not isinstance(data, list):
        return (
            jsonify(
                {
                    "success": False,
                    "message": "Invalid data format.",
                }
            ),
            400,
        )

    rows = []
    # Iterate over each dictionary in the list and build rows for the Excel file.
    for idx, record in enumerate(data, start=1):
        # Start with S/N as the first column
        row = {"S/N": idx}
        row.update(
            {
                k.capitalize(): v
                for k, v in record.items()
                if k not in ["VideoId", "Processed"]
            }
        )
        rows.append(row)

    df = pd.DataFrame(rows)
    df.rename(columns={"Uploaddate": "Upload Date"}, inplace=True)

    # Generate an Excel file in memory
    file_stream = io.BytesIO()
    with pd.ExcelWriter(file_stream, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Results")
    file_stream.seek(0)

    # Send the Excel file as an attachment
    return send_file(file_stream, as_attachment=True, download_name="output.xlsx")

from functools import wraps
import os
import re
import tempfile
from flask import Blueprint, jsonify, request, send_file
import utils
import pandas as pd
import io
import zipfile

batch = Blueprint("batch", __name__)

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

@batch.route("/get_metadata", methods=["POST"])
def get_metadata_batch_route():
    # Check if the request contains a file
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename

    # Check if the filename is empty
    if filename == "":
        return jsonify({"success": False, "message": "Empty filename"}), 400

    if filename.endswith(".csv"):
        df = pd.read_csv(file)
    elif filename.endswith(".xlsx"):
        df = pd.read_excel(file)

    # Remove "Unnamed" columns if any
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


@batch.route("/<action>", methods=["POST"])
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

@batch.route("/download", methods=["POST"])
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

@batch.route("/get_transcript_zip", methods=["POST"])
def get_transcript_zip_route():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "No file provided"}), 400

    excel_file = request.files["file"]
    if excel_file.filename == "":
        return jsonify({"success": False, "message": "No selected file"}), 400

    try:
        df = pd.read_excel(excel_file)
        if "Link" not in df.columns:
            return jsonify({"success": False, "message": "Excel file must contain a 'Link' column"}), 400

        # Create a temporary directory for the transcript text files
        temp_dir = tempfile.mkdtemp()

        txt_files_to_remove = [] 

        # Dictionary to track filename usage (count of titles)
        name_counts = {}

        # Iterate over each row in the Excel file
        for idx, row in df.iterrows():
            url = row.get("Link")
            if not url or not isinstance(url, str):
                # Skip empty or non-string values
                continue

            youtube_link_pattern = r"(http(s)?://(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+))"
            link_match = re.search(youtube_link_pattern, url)

            if not link_match:
                continue

            link = link_match.group(1)
            video_id = utils.get_video_id(link)

            transcript_file = utils.get_transcript_file(link, video_id)
            if not transcript_file or not os.path.exists(transcript_file):
                # Skip if the transcript could not be generated or file not found
                continue

            # Use the transcript file’s basename (without extension) as the video title.
            video_title = os.path.splitext(os.path.basename(transcript_file))[0]

            # Check if the video title already exists; if so, append a numeric suffix.
            if video_title in name_counts:
                name_counts[video_title] += 1
                file_name = f"{video_title} ({name_counts[video_title]}).txt"
            else:
                name_counts[video_title] = 0
                file_name = f"{video_title}.txt"

            dest_file_path = os.path.join(temp_dir, file_name)

            # Copy transcript content into the destination file.
            with open(transcript_file, "r", encoding="utf-8") as src:
                content = src.read()
            with open(dest_file_path, "w", encoding="utf-8") as dest:
                dest.write(content)

            txt_files_to_remove.append(transcript_file)

        # After processing all rows, create a ZIP file containing all transcript files.
        zip_file = tempfile.mktemp(suffix=".zip")
        with zipfile.ZipFile(zip_file, "w", zipfile.ZIP_DEFLATED) as zipf:
            # Walk through the temporary directory and add each file to the ZIP
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    full_path = os.path.join(root, file)
            
                    # Use the file name only inside the zip
                    zipf.write(full_path, arcname=file)

        # Send the ZIP file as an attachment.
        response = send_file(
            zip_file,
            as_attachment=True,
            download_name="transcripts.zip"
        )

        response.headers["Content-Disposition"] = 'attachment; filename="transcripts.zip"'
        response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"

        for txt_file in txt_files_to_remove:
            utils.schedule_file_removal(response, txt_file)

        return response 

    except Exception as e:
        print(f"Error processing Excel file: {e}")
        return jsonify({"success": False, "message": "Error processing file", "error": str(e)}), 500
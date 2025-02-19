import json
import os
import time
from flask import after_this_request
from ollama import chat  # type: ignore
from ollama import ChatResponse  # type: ignore
from youtube_transcript_api import YouTubeTranscriptApi  # type: ignore, for transcript extraction
import re
import tiktoken
import yt_dlp  # type: ignore, for metadata extraction

def get_video_id(link):
    # Get the video ID from the link
    if type(link) == re.Match:
        video_id = link.group(0).split("v=")[1]
        print("Video ID:", video_id)
    else:  # if it is a string
        match = re.search(r"v=([^&]+)", link)
        video_id = match.group(1)
    return video_id


def get_metadata(link):
    # Get the metadata of the YouTube video
    ydl_opts = {
        "quiet": True,  # Suppress output
        "extract_flat": True,  # Only extract metadata
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info_dict = ydl.extract_info(link, download=False)

    return info_dict


def get_transcript(video_id):
    # Get the transcript of the YouTube video
    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
    full_transcript = " ".join([line["text"] for line in transcript_list])

    return full_transcript

def format_timestamp(seconds):
    # Convert seconds to [hh:mm:ss] format.
    hours, remainder = divmod(int(seconds), 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"[{hours:02}:{minutes:02}:{seconds:02}]"
    return f"[{minutes:02}:{seconds:02}]"

def get_transcript_file(link, video_id, lang="en"):
    try:
        # Get video metadata
        metadata = get_metadata(link)
        title = metadata.get("title", "Unknown Video Title")
        title = title.replace(" ", "_").replace("/", "_")  # Ensure a safe filename
        
        # Output file path
        output_file = f"{title}.txt"

        # Get the transcript of the YouTube video
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[lang])

        # Prepare output content
        output = [f"Title: {title.replace('_', ' ')}\n"]
        for entry in transcript:
            timestamp = format_timestamp(entry['start'])
            output.append(f"{timestamp} {entry['text']}.\n\n")

        # Save to a text file
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("".join(output))

        # Return the transcript file path
        print(f"Transcript saved to {output_file}")
        return output_file

    except Exception as e:
        return f"Error: {e}"
    
def schedule_file_removal(response, transcript_file):
    # Schedule file deletion after the request is completed.
    @after_this_request
    def remove_file(response):
        try:
            time.sleep(1)
            os.remove(transcript_file)
            print(f"Deleted transcript file: {transcript_file}")
        except Exception as e:
            print(f"Error deleting file: {e}")
        return response

    return response  # Return the response to continue processing

def encode(full_transcript):
    # Encode the transcript
    encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
    tokens = encoding.encode(full_transcript)
    total_token_num = len(tokens)  # number of tokens
    print("Number of tokens:", total_token_num)
    return total_token_num


def set_chunk_size(size):
    return size


def split_transcript(full_transcript, chunk_size):
    total_token_num = encode(full_transcript)
    if total_token_num > chunk_size:
        total_chunk_num = (total_token_num + chunk_size - 1) // chunk_size + 1
        chunks = [
            full_transcript[i * chunk_size : (i + 1) * chunk_size]
            for i in range(total_chunk_num)
        ]
        return chunks, total_chunk_num
    else:
        return [full_transcript], 1


def provide_summary_chunk(chunk, chunk_num, total_chunk_num):
    print(f"Processing chunk {chunk_num} of {total_chunk_num}...")
    response = chat(
        model="llama3",
        messages=[
            {
                "role": "system",
                "content": """You are a helpful assistant who summarises the transcript of a YouTube video in bullet points concisely in no more than 1000 words.""",
            },
            {
                "role": "user",
                "content": f"""Please provide a summary for the following chunk of the YouTube video transcript: 
                1. Start with a high-level title for this chunk.
                2. Provide 6-8 bullet points summarizing the key points in this chunk.
                3. No need to start with "It appears that the transcript is...", just start with the title of the chunk
                and then provide the summary in bullet points.
                4. No need to use concluding remarks at the end.
                5. Return the response in markdown format. 
                6. Add a divider at the end in markdown format.
                7. This is an individual chunk of a larger transcript, therefore, the summary should try to follow the context of the previous chunks.

                Chunk:
                {chunk}""",
            },
        ],
    )
    return response["message"]["content"]


def provide_summary(full_transcript):
    response = chat(
        model="llama3",
        messages=[
            {
                "role": "system",
                "content": """You are a helpful assistant who summarises the transcript of a YouTube video in bullet points concisely in no more than 1000 words.""",
            },
            {
                "role": "user",
                "content": f"""Please provide a summary for the following YouTube video transcript: 
                1. Start with a high-level title.
                2. Provide 6-8 bullet points summarizing the key points.
                3. Start with the title of the transcript and then provide the summary in bullet points instead of using “here's the summary of the transcript”.
                4. No need to use concluding remarks at the end.
                5. Return the response in markdown format. 
                6. Add a divider at the end in markdown format. 

                Transcript:
                {full_transcript}""",
            },
        ],
    )
    return response["message"]["content"]


def generate_idea(full_transcript):
    print(f"Generating ideas...")
    response = chat(
        model="llama3",
        messages=[
            {
                "role": "system",
                "content": """You are a YouTube content creator who is an expert at analyzing videos and extracting key ideas.""",
            },
            {
                "role": "user",
                "content": f"""Extract 3 key ideas by taking inspiration from the topics, ideas, concepts,
                or thoughts discussed in the following video transcript or that are similar to the provided video.

                Each video idea should have:
                1. Title of the video in bold.
                2. 2-lines description of what that video would look like.
                3. No need to reference the chunk in the description, just tell me what should i do in that video.
                4. No need to use concluding remarks at the end.
                5. Return the response in markdown format. 
                6. Start with the video idea then provide the description of what should be done in that video instead of using “Here are three key ideas...”.

                Transcript: 
                {full_transcript}""",
            },
        ],
    )
    return response["message"]["content"]


def generate_idea_chunk(chunk, chunk_num, total_chunk_num):
    print(f"Generating ideas for chunk {chunk_num} of {total_chunk_num}...")
    response = chat(
        model="llama3",
        messages=[
            {
                "role": "system",
                "content": """You are a YouTube content creator who is an expert at analyzing videos and extracting key ideas.""",
            },
            {
                "role": "user",
                "content": f"""
                Extract 3 key ideas by taking inspiration from the topics, ideas, concepts,
                or thoughts discussed in the following chunk or that are similar to the provided video.

                Each video idea should:
                1. Title of the video in bold.
                2. 2-lines description of what that video would look like.
                3. No need to reference the chunk in the description, just tell me what should i do in that video.
                4. No need to use concluding remarks at the end.
                5. Return the response in markdown format. 
                6. Add a divider at the end in markdown format.
                7. This is an individual chunk of a larger transcript, therefore, the ideas should try to follow the context of the previous chunks.
                8. Start with the video idea then provide the description of what should be done in that video instead of using “Here are three key ideas...”.
                
                Chunk: 
                {chunk}""",
            },
        ],
    )
    return response["message"]["content"]

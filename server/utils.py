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

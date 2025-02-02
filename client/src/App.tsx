import Card from "./components/Card";
import Background from "./components/Background";
import Button from "./components/Button";
import InputBox from "./components/InputBox";
import { FiDownload, FiUpload } from "react-icons/fi";
import { useState } from "react";
import Header from "./components/Header";
import axios from "axios";
import TextBox from "./components/TextBox";
import { toast, Toaster } from "sonner";
import { Metadata } from "./types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";

function App() {
  const [url, setUrl] = useState("");
  const [metadata, setMetadata] = useState<Metadata[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [nav, setNav] = useState(false);
  const summariseUrl = async () => {
    setMetadata(null);
    try {
      const metadataRes = await axios.post(
        "http://localhost:8080/api/single/get_metadata",
        { url: url },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const metadataResData = metadataRes.data;
      console.log("Raw response data:", metadataResData);

      if (!metadataResData.success) {
        throw new Error(metadataResData.message || "Failed to fetch metadata");
      }

      // Access the nested metadata object
      const receivedMetadata = metadataResData.metadata;
      console.log("Received Metadata:", receivedMetadata);

      // Update state with the received metadata
      setMetadata([
        {
          videoId: receivedMetadata.VideoId,
          link: receivedMetadata.Link,
          title: receivedMetadata.Title,
          description: receivedMetadata.Description,
          uploader: receivedMetadata.Uploader,
          uploadDate: receivedMetadata.UploadDate,
          results: receivedMetadata.Results,
          processed: receivedMetadata.Processed,
        },
      ]);

      toast.success("Metadata fetched successfully!");

      await toast.promise(
        axios.post(
          "http://localhost:8080/api/single/summarise",
          { metadata: receivedMetadata },
          { headers: { "Content-Type": "application/json" } }
        ),
        {
          loading: "Summarizing video content...",
          success: (summariseRes) => {
            const summmariseResData = summariseRes.data;
            console.log(summariseRes.data);
            if (!summmariseResData.success) {
              throw new Error(summmariseResData.message);
            }

            const receivedSummary = summmariseResData.metadata;
            console.log(receivedSummary)
            setMetadata([
              {
                videoId: receivedSummary[0].VideoId,
                link: receivedSummary[0].Link,
                title: receivedSummary[0].Title,
                description: receivedSummary[0].Description,
                uploader: receivedSummary[0].Uploader,
                uploadDate: receivedSummary[0].UploadDate,
                results: receivedSummary[0].Results,
                processed: receivedSummary[0].Processed,
              },
            ]);

            setLoading(false);
            console.log(metadata);


            return "Summary generated successfully!";
          },
          error: (error) => {
            let errorMessage = "Failed to generate summary";
            if (axios.isAxiosError(error)) {
              errorMessage = error.response?.data?.message || error.message;
            }
            return errorMessage;
          },
        }
      );
    } catch (error) {
      let errorMessage = "An unexpected error occurred";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  const handleSummariseUrlClick = async () => {
    try {
      setLoading(true);
      await summariseUrl();
    } catch (err) {
      console.error("Error during summarise:", err);
      setLoading(false);
    }
  };

  const generateIdeasUrl = async () => {
    setMetadata(null);
    try {
      const metadataRes = await axios.post(
        "http://localhost:8080/api/single/get_metadata",
        { url: url },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const metadataResData = metadataRes.data;
      console.log("Raw response data:", metadataResData);

      if (!metadataResData.success) {
        throw new Error(metadataResData.message || "Failed to fetch metadata");
      }

      // Access the nested metadata object
      const receivedMetadata = metadataResData.metadata;
      console.log("Received Metadata:", receivedMetadata);

      // Update state with the received metadata
      setMetadata([
        {
          videoId: receivedMetadata.VideoId,
          link: receivedMetadata.Link,
          title: receivedMetadata.Title,
          description: receivedMetadata.Description,
          uploader: receivedMetadata.Uploader,
          uploadDate: receivedMetadata.UploadDate,
          results: receivedMetadata.Results,
          processed: receivedMetadata.Processed,
        },
      ]);

      toast.success("Metadata fetched successfully!");

      await toast.promise(
        axios.post(
          "http://localhost:8080/api/single/generate_ideas",
          { metadata: receivedMetadata },
          { headers: { "Content-Type": "application/json" } }
        ),
        {
          loading: "Generating Video Ideas...",
          success: (generateIdeaRes) => {
            const generateIdeaResData = generateIdeaRes.data;

            if (!generateIdeaResData.success) {
              throw new Error(generateIdeaResData.message);
            }

            const receivedIdeas = generateIdeaResData.metadata;

            setMetadata([
              {
                videoId: receivedIdeas[0].VideoId,
                link: receivedIdeas[0].Link,
                title: receivedIdeas[0].Title,
                description: receivedIdeas[0].Description,
                uploader: receivedIdeas[0].Uploader,
                uploadDate: receivedIdeas[0].UploadDate,
                results: receivedIdeas[0].Results,
                processed: receivedIdeas[0].Processed,
              },
            ]);

            setLoading(false);

            return "Ideas generated successfully!";
          },
          error: (error) => {
            let errorMessage = "Failed to generate ideas";
            if (axios.isAxiosError(error)) {
              errorMessage = error.response?.data?.message || error.message;
            }
            return errorMessage;
          },
        }
      );
    } catch (error) {
      let errorMessage = "An unexpected error occurred";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  const handleGenerateIdeasUrlClick = async () => {
    try {
      setLoading(true);
      await generateIdeasUrl();
    } catch (err) {
      console.error("Error during generating ideas:", err);
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    try {
      if (!metadata || metadata.length === 0) {
        throw new Error("No file to download");
      }

      const response = await axios.post(
        "http://localhost:8080/api/single/download",
        { metadata: metadata },
        {
          responseType: "blob", // Important: Set responseType to 'blob' for file downloads
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Create a temporary anchor element to trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Output.xlsx"); // Name of the downloaded file
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("File downloaded successfully!");
      setLoading(false);
    } catch (error) {
      let errorMessage = "An unexpected error occurred";

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setLoading(false);
      toast.error(errorMessage);
    }
  };

  const handleDownloadFileClick = async () => {
    try {
      setLoading(true);
      await downloadFile();
      // If successful, you can do something here
    } catch (err) {
      console.error("Error during download:", err);
      setLoading(false);
    }
  };
  const [file, setFile] = useState<File | null>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]; // Get the first file selected (optional chaining to handle null/undefined)
    setFile(selectedFile || null); // Update the state with the selected file or null if undefined
  };

  const handleFileChangeClick = () => {
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    fileInput?.click(); // Trigger the file input click programmatically
  };

  return (
    <Background>
      <Toaster position="top-right" richColors expand={true} />
      {/* Header */}
      <Header />
      {/* Main Content */}
      <Card width="50%" className="px-4 sm:px-8 md:px-16 min-h-[500px]">
        <div className="space-y-8">
          {/* URL Input Section */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <InputBox
                  variant="translucent"
                  placeholder="Paste YouTube URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  width="100%"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSummariseUrlClick} loading={loading}>
                  Summarise
                </Button>
                <Button
                  onClick={handleGenerateIdeasUrlClick}
                  color="white"
                  loading={loading}
                >
                  Generate Ideas
                </Button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-green-500/20"></div>
            <span className="text-white">OR</span>
            <div className="flex-1 h-px bg-green-500/20"></div>
          </div>

          {/* Upload Section */}
          <div className="border-2 border-dashed border-green-500/30 rounded-lg p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-green-500/10 rounded-full">
                <FiUpload color="white" />
              </div>
            </div>

            <div>
              <p className="text-gray-300 mb-2">
                Choose a file or drag & drop it here
              </p>
              <p className="text-gray-500 text-sm">
                Accepted formats: XLSX, CSV
              </p>
            </div>
            {/* File Input */}
            <input
              type="file"
              onChange={handleFileChange} // On file selection, update state
              className="hidden" // Hide the default file input
              id="file-upload" // Give the file input an id
              accept=".xlsx, .csv"
            />
            <Button
              variant="outline"
              color="white"
              onClick={handleFileChangeClick}
              loading={loading}
            >
              Browse
            </Button>
            {/* Display selected file name */}
            {file && (
              <p className="text-white mt-2">Selected file: {file.name}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button width="49.5%" loading={loading}>
              Batch Summarise
            </Button>
            <Button color="white" width="49.5%" loading={loading}>
              Batch Generate Ideas
            </Button>
          </div>

          {/* Results Section */}
          <Swiper
            navigation={false}
            modules={[Navigation]}
            className="mySwiper"
          >
            {metadata ? (
              metadata.map((item, index) => (
                <SwiperSlide key={index}>{item.title}</SwiperSlide>
              ))
            ) : (
              <></>
            )}
          </Swiper>
          {metadata ? (
            metadata.map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-1 space-y-4">
                  <TextBox
                    label="Title"
                    variant="translucent"
                    width="100%"
                    value={item.title || ""}
                  />
                  <TextBox
                    label="Description"
                    variant="translucent"
                    width="100%"
                    rows={4}
                    value={item.description || ""}
                  />
                </div>
                <div className="flex-1">
                  <TextBox
                    label="Results"
                    variant="translucent"
                    width="100%"
                    rows={8}
                    value={item.results || ""}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="flex gap-4">
              <div className="flex-1 space-y-4">
                <TextBox
                  label="Title"
                  variant="translucent"
                  width="100%"
                  value="Video title will be here"
                />
                <TextBox
                  label="Description"
                  variant="translucent"
                  width="100%"
                  rows={4}
                  value="Video description will be here"
                />
              </div>
              <div className="flex-1">
                <TextBox
                  label="Results"
                  variant="translucent"
                  width="100%"
                  rows={8}
                  value="Summary/Ideas will be here"
                />
              </div>
            </div>
          )}
          <Button
            width="100%"
            onClick={handleDownloadFileClick}
            loading={loading}
          >
            <FiDownload className="mr-2" /> Download
          </Button>
        </div>
      </Card>
    </Background>
  );
}

export default App;

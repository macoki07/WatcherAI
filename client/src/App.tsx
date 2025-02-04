import Card from "./components/Card";
import Background from "./components/Background";
import Button from "./components/Button";
import InputBox from "./components/InputBox";
import { FiDownload, FiUpload } from "react-icons/fi";
import { useEffect, useState } from "react";
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
    setNav(false);
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
          VideoId: receivedMetadata.VideoId,
          Link: receivedMetadata.Link,
          Title: receivedMetadata.Title,
          Description: receivedMetadata.Description,
          Uploader: receivedMetadata.Uploader,
          UploadDate: receivedMetadata.UploadDate,
          Results: receivedMetadata.Results,
          Processed: receivedMetadata.Processed,
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
            console.log(receivedSummary);
            setMetadata([
              {
                VideoId: receivedSummary[0].VideoId,
                Link: receivedSummary[0].Link,
                Title: receivedSummary[0].Title,
                Description: receivedSummary[0].Description,
                Uploader: receivedSummary[0].Uploader,
                UploadDate: receivedSummary[0].UploadDate,
                Results: receivedSummary[0].Results,
                Processed: receivedSummary[0].Processed,
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
    setNav(false);
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
          VideoId: receivedMetadata.VideoId,
          Link: receivedMetadata.Link,
          Title: receivedMetadata.Title,
          Description: receivedMetadata.Description,
          Uploader: receivedMetadata.Uploader,
          UploadDate: receivedMetadata.UploadDate,
          Results: receivedMetadata.Results,
          Processed: receivedMetadata.Processed,
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
                VideoId: receivedIdeas[0].VideoId,
                Link: receivedIdeas[0].Link,
                Title: receivedIdeas[0].Title,
                Description: receivedIdeas[0].Description,
                Uploader: receivedIdeas[0].Uploader,
                UploadDate: receivedIdeas[0].UploadDate,
                Results: receivedIdeas[0].Results,
                Processed: receivedIdeas[0].Processed,
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

  const batchSummarise = async () => {
    setMetadata(null);
    setNav(true);
    if (!file) {
      toast.error("Please provide a file first!");
      setLoading(false);
      return;
    }

    // Create FormData and append the file from state
    const formData = new FormData();
    formData.append("file", file); // Field name "file" (match your server's expectations)

    try {
      const metadataRes = await axios.post(
        "http://localhost:8080/api/batch/get_metadata",
        formData,
        {
          headers: {
            // Axios auto sets content-type
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
      setMetadata(receivedMetadata);

      toast.success("Metadata fetched successfully!");

      await toast.promise(
        axios.post(
          "http://localhost:8080/api/batch/summarise",
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

            const receivedSummary = summmariseResData.metadata.flat();
            console.log("Received Summary: " + receivedSummary);
            setMetadata(receivedSummary);

            setLoading(false);

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
  const handleBatchSummariseClick = async () => {
    try {
      setLoading(true);
      await batchSummarise();
      // If successful, you can do something here
    } catch (err) {
      console.error("Error during download:", err);
      setLoading(false);
    }
  };

  const batchGenerateIdeas = async () => {
    setMetadata(null);
    setNav(true);
    if (!file) {
      toast.error("Please provide a file first!");
      setLoading(false);
      return;
    }

    // Create FormData and append the file from state
    const formData = new FormData();
    formData.append("file", file); // Field name "file" (match your server's expectations)

    try {
      const metadataRes = await axios.post(
        "http://localhost:8080/api/batch/get_metadata",
        formData,
        {
          headers: {
            // Axios auto sets content-type
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
      setMetadata(receivedMetadata);

      toast.success("Metadata fetched successfully!");

      await toast.promise(
        axios.post(
          "http://localhost:8080/api/batch/generate_ideas",
          { metadata: receivedMetadata },
          { headers: { "Content-Type": "application/json" } }
        ),
        {
          loading: "Generating Ideas...",
          success: (summariseRes) => {
            const summmariseResData = summariseRes.data;
            console.log(summariseRes.data);
            if (!summmariseResData.success) {
              throw new Error(summmariseResData.message);
            }

            const receivedSummary = summmariseResData.metadata.flat();
            console.log("Received Summary: " + receivedSummary);
            setMetadata(receivedSummary);

            setLoading(false);

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
  const handleBatchGenerateIdeasClick = async () => {
    try {
      setLoading(true);
      await batchGenerateIdeas();
      // If successful, you can do something here
    } catch (err) {
      console.error("Error during download:", err);
      setLoading(false);
    }
  };

  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    console.log("Metadata array updated:", metadata);
  }, [metadata]); // The effect runs whenever `metadata` changes.
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
            <Button
              width="49.5%"
              onClick={handleBatchSummariseClick}
              loading={loading}
            >
              Batch Summarise
            </Button>
            <Button color="white" width="49.5%" loading={loading} onClick={handleBatchGenerateIdeasClick}>
              Batch Generate Ideas
            </Button>
          </div>

          {/* Results Section */}
          <Swiper
            key={metadata ? metadata.length : 0}
            navigation={nav}
            modules={[Navigation]}
            className="mySwiper"
            onSlideChange={(swiper) => setSelectedIndex(swiper.activeIndex)}
          >
            {metadata?.map((item, index) => (
              <SwiperSlide key={index}>{item.Title}</SwiperSlide>
            ))}
          </Swiper>

          <div className="flex gap-4">
            {metadata && metadata.length > 0 ? (
              <>
                <div className="flex-1 space-y-4">
                  <TextBox
                    label="Title"
                    variant="translucent"
                    width="100%"
                    value={metadata[selectedIndex]?.Title || ""}
                  />
                  <TextBox
                    label="Description"
                    variant="translucent"
                    width="100%"
                    rows={4}
                    value={metadata[selectedIndex]?.Description || ""}
                  />
                </div>
                <div className="flex-1">
                  <TextBox
                    label="Results"
                    variant="translucent"
                    width="100%"
                    rows={8}
                    value={metadata[selectedIndex]?.Results || ""}
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>

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

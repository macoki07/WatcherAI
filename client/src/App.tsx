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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [nav, setNav] = useState(false);
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

  const handleApiError = (
    error: unknown,
    fallbackMessage = "An unexpected error occurred"
  ) => {
    let errorMessage = fallbackMessage;

    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Assuming setLoading and toast are in scope
    setLoading(false);
    toast.error(errorMessage);
  };

  // Helper function to fetch metadata and then perform the desired action
  const processUrl = async ({
    actionEndpoint, // endpoint for the second API call (summarise or generate ideas)
    loadingMessage, // message to display while processing
    successMessage, // success message to display on completion
    transformResult, // a function to transform the received data (if needed)
  }: {
    actionEndpoint: string;
    loadingMessage: string;
    successMessage: string;
    transformResult?: (metadata: any) => Metadata[];
  }) => {
    // Clear state and hide navigation if needed
    setMetadata(null);
    setNav(false);

    if (!url) {
      toast.error("Please provide a url first!");
      setLoading(false);
      return;
    }

    try {
      // First, fetch the metadata
      const metadataRes = await axios.post(
        "http://localhost:8080/api/single/get_metadata",
        { url: url },
        { headers: { "Content-Type": "application/json" } }
      );

      const metadataResData = metadataRes.data;
      console.log("Raw response data:", metadataResData);

      if (!metadataResData.success) {
        throw new Error(metadataResData.message || "Failed to fetch metadata");
      }

      // Extract and set the initial metadata state
      const receivedMetadata = metadataResData.metadata;
      console.log("Received Metadata:", receivedMetadata);

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

      // Now perform the specific action (summarise or generate ideas) wrapped in a toast promise
      await toast.promise(
        axios.post(
          `http://localhost:8080/api/single/${actionEndpoint}`,
          { metadata: receivedMetadata },
          { headers: { "Content-Type": "application/json" } }
        ),
        {
          loading: loadingMessage,
          success: (actionRes) => {
            const actionResData = actionRes.data;

            if (!actionResData.success) {
              throw new Error(actionResData.message);
            }

            // Optionally transform the response data if needed
            const finalData = transformResult
              ? transformResult(actionResData.metadata)
              : actionResData.metadata;

            // Update the metadata state with the new data
            setMetadata(finalData);
            setLoading(false);
            return successMessage;
          },
          error: (error) => {
            let errorMessage = "Failed to process request";
            if (axios.isAxiosError(error)) {
              errorMessage = error.response?.data?.message || error.message;
            }
            return errorMessage;
          },
        }
      );
    } catch (error) {
      handleApiError(error);
    }
  };

  // Usage in your summarise handler:
  const handleSummariseUrlClick = async () => {
    try {
      setLoading(true);
      await processUrl({
        actionEndpoint: "summarise",
        loadingMessage: "Summarizing video content...",
        successMessage: "Summary generated successfully!",
        transformResult: (metadata) => {
          // assuming the returned metadata is an array and you want the first item
          const item = metadata[0];
          return [
            {
              VideoId: item.VideoId,
              Link: item.Link,
              Title: item.Title,
              Description: item.Description,
              Uploader: item.Uploader,
              UploadDate: item.UploadDate,
              Results: item.Results,
              Processed: item.Processed,
            },
          ];
        },
      });
    } catch (err) {
      console.error("Error during summarise:", err);
      setLoading(false);
    }
  };

  // Usage in your generate ideas handler:
  const handleGenerateIdeasUrlClick = async () => {
    try {
      setLoading(true);
      await processUrl({
        actionEndpoint: "generate_ideas",
        loadingMessage: "Generating Video Ideas...",
        successMessage: "Ideas generated successfully!",
        transformResult: (metadata) => {
          const item = metadata[0];
          return [
            {
              VideoId: item.VideoId,
              Link: item.Link,
              Title: item.Title,
              Description: item.Description,
              Uploader: item.Uploader,
              UploadDate: item.UploadDate,
              Results: item.Results,
              Processed: item.Processed,
            },
          ];
        },
      });
    } catch (err) {
      console.error("Error during generating ideas:", err);
      setLoading(false);
    }
  };

  // Helper function to process a batch file for a given action endpoint
  const processBatchFile = async ({
    actionEndpoint, // e.g., "summarise" or "generate_ideas"
    loadingMessage, // Message to show while processing
    successMessage, // Message to show on successful completion
    transformResult, // Optional function to transform the returned result
  }: {
    actionEndpoint: string;
    loadingMessage: string;
    successMessage: string;
    transformResult?: (metadata: any) => Metadata[];
  }) => {
    // Check if file exists
    if (!file) {
      toast.error("Please provide a file first!");
      setLoading(false);
      return;
    }

    // Reset metadata and show navigation (as per your requirements)
    setMetadata(null);
    setNav(true);

    // Prepare the form data with the file
    const formData = new FormData();
    formData.append("file", file);

    try {
      // First, fetch metadata from the batch endpoint
      const metadataRes = await axios.post(
        "http://localhost:8080/api/batch/get_metadata",
        formData,
        {
          headers: {
            // Axios automatically sets the Content-Type for FormData
          },
        }
      );

      const metadataResData = metadataRes.data;
      console.log("Raw response data:", metadataResData);

      if (!metadataResData.success) {
        throw new Error(metadataResData.message || "Failed to fetch metadata");
      }

      // Extract metadata and update state
      const receivedMetadata = metadataResData.metadata;
      console.log("Received Metadata:", receivedMetadata);
      setMetadata(receivedMetadata);
      toast.success("Metadata fetched successfully!");

      // Now perform the specific action (summarise or generate ideas)
      await toast.promise(
        axios.post(
          `http://localhost:8080/api/batch/${actionEndpoint}`,
          { metadata: receivedMetadata },
          { headers: { "Content-Type": "application/json" } }
        ),
        {
          loading: loadingMessage,
          success: (actionRes) => {
            const actionResData = actionRes.data;
            console.log("Action response data:", actionResData);

            if (!actionResData.success) {
              throw new Error(actionResData.message);
            }

            // The API returns an array (or nested arrays), so flatten it.
            const resultData = actionResData.metadata.flat();

            // Optionally transform the result before updating state.
            const finalData = transformResult
              ? transformResult(resultData)
              : resultData;

            setMetadata(finalData);
            setLoading(false);
            return successMessage;
          },
          error: (error) => {
            let errorMessage = "Failed to process request";
            if (axios.isAxiosError(error)) {
              errorMessage = error.response?.data?.message || error.message;
            }
            return errorMessage;
          },
        }
      );
    } catch (error) {
      handleApiError(error);
    }
  };

  // Handler for batch summarisation
  const handleBatchSummariseClick = async () => {
    try {
      setLoading(true);
      await processBatchFile({
        actionEndpoint: "summarise",
        loadingMessage: "Summarizing video content...",
        successMessage: "Summary generated successfully!",
        // If you need to change the structure of the result,
        // provide a transformResult function. Otherwise, you can omit it.
        transformResult: (data) => data,
      });
    } catch (err) {
      console.error("Error during batch summarisation:", err);
      setLoading(false);
    }
  };

  // Handler for batch generating ideas
  const handleBatchGenerateIdeasClick = async () => {
    try {
      setLoading(true);
      await processBatchFile({
        actionEndpoint: "generate_ideas",
        loadingMessage: "Generating Ideas...",
        successMessage: "Ideas generated successfully!",
        transformResult: (data) => data,
      });
    } catch (err) {
      console.error("Error during batch idea generation:", err);
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    try {
      // Validate metadata first
      if (!metadata || metadata.length === 0) {
        throw new Error("No file to download");
      }

      // Determine the API route and payload based on the number of elements in metadata
      let apiRoute, payload;
      if (metadata.length === 1) {
        apiRoute = "single/download";
        payload = metadata;
      } else {
        apiRoute = "batch/download";
        payload = metadata;
      }

      // Make the API call
      const response = await axios.post(
        `http://localhost:8080/api/${apiRoute}`,
        payload,
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

      // Clean up: remove the anchor and revoke the object URL
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("File downloaded successfully!");
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFileClick = async () => {
    try {
      setLoading(true);
      await downloadFile();
    } catch (err) {
      console.error("Error during download:", err);
      setLoading(false);
    }
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
            <Button
              width="49.5%"
              onClick={handleBatchSummariseClick}
              loading={loading}
            >
              Batch Summarise
            </Button>
            <Button
              color="white"
              width="49.5%"
              loading={loading}
              onClick={handleBatchGenerateIdeasClick}
            >
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

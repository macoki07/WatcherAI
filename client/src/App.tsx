import Card from "./components/Card";
import Background from "./components/Background";
import Button from "./components/Button";
import InputBox from "./components/InputBox";
import { FiDownload, FiUpload } from "react-icons/fi";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import axios from "axios";
import TextBox from "./components/TextBox";

type Metadata = {
  link: string;
  title: string;
  description: string;
  uploader: string;
  uploadDate: string;
  results: string;
  processed: boolean;
};

function App() {
  const [url, setUrl] = useState("");
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const summariseUrl = async () => {
    setLoading(true);
    setMetadata(null);
    setResult(null);

    try {
      // Make a POST request to your Flask server
      const metadataRes = await axios.post(
        "http://localhost:8080/api/single/get_metadata",
        { url: url },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = metadataRes.data;
      console.log("Raw response data:", responseData);

      if (!responseData.success) {
        throw new Error(responseData.message || "Failed to fetch metadata");
      }

      // Access the nested metadata object
      const receivedMetadata = responseData.metadata;
      console.log("Received Metadata:", receivedMetadata);

      // Update state with the received metadata
      setMetadata({
        link: receivedMetadata.Link,
        title: receivedMetadata.Title,
        description: receivedMetadata.Description,
        uploader: receivedMetadata.Uploader,
        uploadDate: receivedMetadata["UploadDate"],
        results: receivedMetadata.Results,
        processed: receivedMetadata.Processed,
      });

      // // Immediately call summarize endpoint with the same URL
      // const summariseRes = await fetch(
      //   "http://localhost:5000/api/single/summarise",
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({ url }),
      //   }
      // );
      // if (!summariseRes.ok) {
      //   throw new Error("Failed to fetch summary");
      // }
      // const summaryData = await summariseRes.json();
      // setResult(summaryData.summary);
    } catch (error) {
      console.error(error);
      // You can handle errors (e.g., show a toast or error message)
    } finally {
      setLoading(false);
    }
  };

  const [arr, setArr] = useState([]);

  const APIExample = async () => {
    const res = await axios.get("http://localhost:8080/api/users");
    setArr(res.data.users);
  };

  const handleExampleClick = async () => {
    try {
      await summariseUrl();
      // If successful, you can do something here
    } catch (err) {
      console.error("Error during summarise:", err);
      // Handle the error (e.g., set an error message in state)
    }
  };

  // useEffect(() => {
  //   APIExample();
  // }, []);

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
                <Button onClick={handleExampleClick}>Summarise</Button>
                <Button color="white">Generate Ideas</Button>
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
            >
              Browse
            </Button>
            {/* Display selected file name */}
            {file && (
              <p className="text-white mt-2">Selected file: {file.name}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button width="49.5%">Batch Summarise</Button>
            <Button color="white" width="49.5%">
              Batch Generate Ideas
            </Button>
          </div>

          {/* Results Section */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-4">
              {/* <InputBox
                variant="translucent"
                label="Title"
                disabled
                width="100%"
              /> */}
              <TextBox
                label="Title"
                variant="translucent"
                width="100%"
                value={metadata?.title || ""}
              />
              {/* <InputBox
                variant="translucent"
                label="Description"
                disabled
                height="220px"
                width="100%"
              /> */}
              <TextBox
                label="Description"
                variant="translucent"
                width="100%"
                rows={4}
                value={metadata?.description || ""}
              />
            </div>
            <div className="flex-1">
              {/* <InputBox
                variant="translucent"
                label="Results"
                disabled
                height="300px"
                width="100%"
              /> */}
              <TextBox
                label="Results"
                variant="translucent"
                width="100%"
                rows={8}
                value={arr.join("\n")}
              />
            </div>
          </div>
          <Button width="100%">
            <FiDownload className="mr-2" /> Download
          </Button>
        </div>
      </Card>
    </Background>
  );
}

export default App;

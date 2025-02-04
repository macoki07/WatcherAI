export interface Metadata {
    VideoId: string;
    Link: string;
    Title: string;
    Description: string;
    Uploader: string;
    UploadDate: string;
    Results: string;
    Processed: boolean;
  }
  
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}
export interface Metadata {
    videoId: string;
    link: string;
    title: string;
    description: string;
    uploader: string;
    uploadDate: string;
    results: string;
    processed: boolean;
  }
  
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}
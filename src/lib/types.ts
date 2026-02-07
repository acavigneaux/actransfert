export interface TransferMeta {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  email: string;
  createdAt: string;
}

export interface CreateTransferRequest {
  filename: string;
  size: number;
  contentType: string;
  email: string;
}

export interface CreateTransferResponse {
  id: string;
  uploadUrl: string;
}

export interface GetTransferResponse {
  meta: TransferMeta;
  downloadUrl: string;
}

export interface PromptItem {
  id: string;
  title: string;
  command?: string | null;
  content: string;
  filePath: string;
  updatedAt?: string | null;
  hasError?: boolean;
  errorMessage?: string | null;
}

export interface SavePromptPayload {
  originalFilePath?: string | null;
  title: string;
  command?: string | null;
  content: string;
  overwrite?: boolean;
}
